"""
Proactive Insights Monitor
Analyzes CRM data to generate actionable insights and alerts
"""
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import logging
from app.services.crm_client import CRMClient
from app.services.vector_conversation_store import VectorConversationStore

logger = logging.getLogger(__name__)


class InsightsMonitor:
    """Monitor CRM data and generate proactive insights"""
    
    def __init__(self, crm_client: CRMClient, vector_store: VectorConversationStore):
        self.crm_client = crm_client
        self.vector_store = vector_store
    
    async def generate_insights(self, user_token: str) -> List[Dict[str, Any]]:
        """Generate all insights for a user"""
        insights = []
        
        # Set user token
        self.crm_client.set_user_token(user_token)
        
        try:
            # Check for stuck deals
            stuck_deals = await self._check_stuck_deals()
            insights.extend(stuck_deals)
            
            # Check for deals closing soon
            closing_soon = await self._check_deals_closing_soon()
            insights.extend(closing_soon)
            
            # Check for inactive contacts
            inactive_contacts = await self._check_inactive_contacts()
            insights.extend(inactive_contacts)
            
            # Check for overdue tasks
            overdue_tasks = await self._check_overdue_tasks()
            insights.extend(overdue_tasks)
            
            # Check for high-value opportunities
            hot_opportunities = await self._check_hot_opportunities()
            insights.extend(hot_opportunities)
            
        except Exception as e:
            logger.error(f"Error generating insights: {str(e)}")
        
        return insights
    
    async def _check_stuck_deals(self) -> List[Dict[str, Any]]:
        """Find deals that haven't moved in 14+ days"""
        insights = []
        try:
            deals = self.crm_client.search_deals(
                filters={"stage": ["Qualification", "Proposal", "Negotiation"]}
            )
            
            now = datetime.now()
            stuck_threshold = timedelta(days=14)
            
            for deal in deals:
                updated_at = datetime.fromisoformat(deal.get('updatedAt', '').replace('Z', '+00:00'))
                days_stuck = (now - updated_at).days
                
                if days_stuck >= 14:
                    insights.append({
                        "type": "stuck_deal",
                        "severity": "high" if days_stuck >= 21 else "medium",
                        "title": f"Deal stuck for {days_stuck} days",
                        "description": f"{deal.get('name')} ({deal.get('stage')}) - ${deal.get('value', 0):,.0f}",
                        "action": f"Review and update deal progress",
                        "entity_id": deal.get('id'),
                        "entity_type": "deal",
                        "metadata": {
                            "deal_name": deal.get('name'),
                            "stage": deal.get('stage'),
                            "value": deal.get('value'),
                            "days_stuck": days_stuck
                        }
                    })
        
        except Exception as e:
            logger.error(f"Error checking stuck deals: {str(e)}")
        
        return insights
    
    async def _check_deals_closing_soon(self) -> List[Dict[str, Any]]:
        """Find deals with close dates within 7 days"""
        insights = []
        try:
            deals = self.crm_client.search_deals(
                filters={"stage": ["Proposal", "Negotiation"]}
            )
            
            now = datetime.now()
            soon_threshold = timedelta(days=7)
            
            for deal in deals:
                if deal.get('expectedCloseDate'):
                    close_date = datetime.fromisoformat(deal['expectedCloseDate'].replace('Z', '+00:00'))
                    days_until = (close_date - now).days
                    
                    if 0 <= days_until <= 7:
                        insights.append({
                            "type": "closing_soon",
                            "severity": "high" if days_until <= 3 else "medium",
                            "title": f"Deal closing in {days_until} days",
                            "description": f"{deal.get('name')} - ${deal.get('value', 0):,.0f}",
                            "action": "Ensure all paperwork and approvals are ready",
                            "entity_id": deal.get('id'),
                            "entity_type": "deal",
                            "metadata": {
                                "deal_name": deal.get('name'),
                                "value": deal.get('value'),
                                "close_date": deal.get('expectedCloseDate'),
                                "days_until": days_until
                            }
                        })
        
        except Exception as e:
            logger.error(f"Error checking closing deals: {str(e)}")
        
        return insights
    
    async def _check_inactive_contacts(self) -> List[Dict[str, Any]]:
        """Find contacts with no activity in 30+ days"""
        insights = []
        try:
            contacts = self.crm_client.search_contacts(filters={})
            
            now = datetime.now()
            inactive_threshold = timedelta(days=30)
            
            for contact in contacts:
                if contact.get('lastContactDate'):
                    last_contact = datetime.fromisoformat(contact['lastContactDate'].replace('Z', '+00:00'))
                    days_inactive = (now - last_contact).days
                    
                    if days_inactive >= 30:
                        insights.append({
                            "type": "inactive_contact",
                            "severity": "low" if days_inactive < 60 else "medium",
                            "title": f"No contact in {days_inactive} days",
                            "description": f"{contact.get('firstName', '')} {contact.get('lastName', '')} ({contact.get('email', '')})",
                            "action": "Schedule a follow-up call or email",
                            "entity_id": contact.get('id'),
                            "entity_type": "contact",
                            "metadata": {
                                "contact_name": f"{contact.get('firstName', '')} {contact.get('lastName', '')}",
                                "email": contact.get('email'),
                                "days_inactive": days_inactive
                            }
                        })
        
        except Exception as e:
            logger.error(f"Error checking inactive contacts: {str(e)}")
        
        return insights
    
    async def _check_overdue_tasks(self) -> List[Dict[str, Any]]:
        """Find overdue tasks"""
        insights = []
        try:
            tasks = self.crm_client.search_tasks(filters={"status": ["Pending", "In Progress"]})
            
            now = datetime.now()
            
            for task in tasks:
                if task.get('dueDate'):
                    due_date = datetime.fromisoformat(task['dueDate'].replace('Z', '+00:00'))
                    
                    if due_date < now:
                        days_overdue = (now - due_date).days
                        insights.append({
                            "type": "overdue_task",
                            "severity": "high" if days_overdue > 7 else "medium",
                            "title": f"Task overdue by {days_overdue} days",
                            "description": task.get('title', 'Untitled task'),
                            "action": "Complete or reschedule task",
                            "entity_id": task.get('id'),
                            "entity_type": "task",
                            "metadata": {
                                "task_title": task.get('title'),
                                "due_date": task.get('dueDate'),
                                "days_overdue": days_overdue,
                                "priority": task.get('priority')
                            }
                        })
        
        except Exception as e:
            logger.error(f"Error checking overdue tasks: {str(e)}")
        
        return insights
    
    async def _check_hot_opportunities(self) -> List[Dict[str, Any]]:
        """Find high-value deals in early stages"""
        insights = []
        try:
            deals = self.crm_client.search_deals(
                filters={"stage": ["Qualification", "Proposal"]}
            )
            
            # Look for high-value deals (>$50k)
            for deal in deals:
                value = deal.get('value', 0)
                if value >= 50000:
                    insights.append({
                        "type": "hot_opportunity",
                        "severity": "high",
                        "title": f"High-value opportunity: ${value:,.0f}",
                        "description": f"{deal.get('name')} in {deal.get('stage')} stage",
                        "action": "Prioritize this opportunity for faster closure",
                        "entity_id": deal.get('id'),
                        "entity_type": "deal",
                        "metadata": {
                            "deal_name": deal.get('name'),
                            "value": value,
                            "stage": deal.get('stage')
                        }
                    })
        
        except Exception as e:
            logger.error(f"Error checking hot opportunities: {str(e)}")
        
        return insights
