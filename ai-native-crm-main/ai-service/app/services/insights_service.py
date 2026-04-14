"""
AI-Powered Insights Service
Analyzes CRM data and generates contextual, actionable insights
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class InsightsService:
    """Generate AI-powered insights from CRM data"""
    
    def __init__(self, crm_client, llm_client):
        self.crm_client = crm_client
        self.llm_client = llm_client
    
    async def generate_insights(self, user_token: str, context: str = "dashboard") -> List[Dict[str, Any]]:
        """
        Generate live AI-powered insights
        
        Args:
            user_token: User's JWT token
            context: Page context (dashboard, deals, contacts, etc.)
        
        Returns:
            List of insight objects with type, message, severity, entity
        """
        self.crm_client.set_user_token(user_token)
        
        insights = []
        
        # Get all relevant data
        try:
            deals = await self._get_deals_insights(context)
            contacts = await self._get_contacts_insights(context)
            tasks = await self._get_tasks_insights(context)
            
            insights.extend(deals)
            insights.extend(contacts)
            insights.extend(tasks)
            
        except Exception as e:
            logger.error(f"Error generating insights: {e}")
        
        return insights
    
    async def _get_deals_insights(self, context: str) -> List[Dict[str, Any]]:
        """Analyze deals for insights"""
        insights = []
        
        try:
            # Get all deals (use size parameter, returns List directly)
            deals = await self.crm_client.search_deals(size=100)
            
            now = datetime.utcnow()
            
            for deal in deals:
                deal_insights = []
                
                # Check if closing soon
                if deal.get('expected_close_date'):
                    close_date = datetime.fromisoformat(deal['expected_close_date'].replace('Z', '+00:00'))
                    days_until_close = (close_date - now).days
                    
                    if 0 <= days_until_close <= 7:
                        deal_insights.append({
                            "type": "closing_soon",
                            "message": f"Closes in {days_until_close} days",
                            "severity": "warning" if days_until_close <= 3 else "info",
                            "entity_type": "deal",
                            "entity_id": deal['id'],
                            "context": ["deals", "dashboard", "pipeline"]
                        })
                
                # Check if stuck (no updates in 14+ days)
                if deal.get('updated_at'):
                    updated = datetime.fromisoformat(deal['updated_at'].replace('Z', '+00:00'))
                    days_stuck = (now - updated).days
                    
                    if days_stuck >= 14:
                        deal_insights.append({
                            "type": "stuck",
                            "message": f"No activity {days_stuck} days",
                            "severity": "error" if days_stuck >= 30 else "warning",
                            "entity_type": "deal",
                            "entity_id": deal['id'],
                            "context": ["deals", "dashboard", "pipeline"]
                        })
                
                # Check if high value
                if deal.get('amount', 0) >= 50000:
                    deal_insights.append({
                        "type": "high_value",
                        "message": f"High value: ${deal['amount']:,.0f}",
                        "severity": "success",
                        "entity_type": "deal",
                        "entity_id": deal['id'],
                        "context": ["deals", "dashboard"]
                    })
                
                # Check stage duration
                if deal.get('stage_updated_at'):
                    stage_updated = datetime.fromisoformat(deal['stage_updated_at'].replace('Z', '+00:00'))
                    days_in_stage = (now - stage_updated).days
                    
                    if days_in_stage >= 21:
                        deal_insights.append({
                            "type": "stage_stuck",
                            "message": f"In {deal.get('stage', 'stage')} {days_in_stage} days",
                            "severity": "warning",
                            "entity_type": "deal",
                            "entity_id": deal['id'],
                            "context": ["deals", "pipeline"]
                        })
                
                insights.extend(deal_insights)
        
        except Exception as e:
            logger.error(f"Error analyzing deals: {e}")
        
        return insights
    
    async def _get_contacts_insights(self, context: str) -> List[Dict[str, Any]]:
        """Analyze contacts for insights"""
        insights = []
        
        try:
            # Get all contacts (use size parameter, returns List directly)
            contacts = await self.crm_client.search_contacts(size=100)
            
            now = datetime.utcnow()
            
            for contact in contacts:
                contact_insights = []
                
                # Check if inactive
                if contact.get('last_contact_date'):
                    last_contact = datetime.fromisoformat(contact['last_contact_date'].replace('Z', '+00:00'))
                    days_inactive = (now - last_contact).days
                    
                    if days_inactive >= 30:
                        contact_insights.append({
                            "type": "inactive",
                            "message": f"No contact {days_inactive} days",
                            "severity": "warning" if days_inactive >= 60 else "info",
                            "entity_type": "contact",
                            "entity_id": contact['id'],
                            "context": ["contacts", "dashboard"]
                        })
                
                # Check if decision maker
                if contact.get('is_decision_maker'):
                    contact_insights.append({
                        "type": "decision_maker",
                        "message": "Decision maker",
                        "severity": "success",
                        "entity_type": "contact",
                        "entity_id": contact['id'],
                        "context": ["contacts"]
                    })
                
                # Check if engaged (recent activity)
                if contact.get('last_contact_date'):
                    last_contact = datetime.fromisoformat(contact['last_contact_date'].replace('Z', '+00:00'))
                    days_since = (now - last_contact).days
                    
                    if days_since <= 7:
                        contact_insights.append({
                            "type": "engaged",
                            "message": f"Active {days_since}d ago",
                            "severity": "success",
                            "entity_type": "contact",
                            "entity_id": contact['id'],
                            "context": ["contacts", "dashboard"]
                        })
                
                insights.extend(contact_insights)
        
        except Exception as e:
            logger.error(f"Error analyzing contacts: {e}")
        
        return insights
    
    async def _get_tasks_insights(self, context: str) -> List[Dict[str, Any]]:
        """Analyze tasks for insights"""
        insights = []
        
        try:
            # Get all tasks (use size parameter, returns List directly)
            tasks = await self.crm_client.search_tasks(size=100)
            
            now = datetime.utcnow()
            
            for task in tasks:
                task_insights = []
                
                # Check if overdue
                if task.get('due_date') and task.get('status') != 'completed':
                    due_date = datetime.fromisoformat(task['due_date'].replace('Z', '+00:00'))
                    if due_date < now:
                        days_overdue = (now - due_date).days
                        task_insights.append({
                            "type": "overdue",
                            "message": f"Overdue {days_overdue} days",
                            "severity": "error",
                            "entity_type": "task",
                            "entity_id": task['id'],
                            "context": ["tasks", "dashboard"]
                        })
                
                # Check if due soon
                if task.get('due_date') and task.get('status') != 'completed':
                    due_date = datetime.fromisoformat(task['due_date'].replace('Z', '+00:00'))
                    days_until_due = (due_date - now).days
                    
                    if 0 <= days_until_due <= 2:
                        task_insights.append({
                            "type": "due_soon",
                            "message": "Due today" if days_until_due == 0 else f"Due in {days_until_due}d",
                            "severity": "warning",
                            "entity_type": "task",
                            "entity_id": task['id'],
                            "context": ["tasks", "dashboard"]
                        })
                
                insights.extend(task_insights)
        
        except Exception as e:
            logger.error(f"Error analyzing tasks: {e}")
        
        return insights
