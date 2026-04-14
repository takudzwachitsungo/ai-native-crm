from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class LeadsMCPServer:
    """MCP Server for Leads operations"""
    
    def __init__(self, crm_client):
        self.crm_client = crm_client
    
    async def search_leads(
        self,
        query: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Search for leads in CRM
        
        Args:
            query: Search query (name, email, company)
            status: Lead status filter (NEW, CONTACTED, QUALIFIED, etc.)
            limit: Maximum results to return
        """
        logger.info(f"MCP: Searching leads - query: {query}, status: {status}")
        
        try:
            results = await self.crm_client.search_leads(
                query=query,
                status=status,
                size=limit
            )
            
            logger.info(f"Found {len(results)} leads")
            return results
            
        except Exception as e:
            logger.error(f"Error searching leads: {str(e)}")
            return []
    
    async def get_lead_details(self, lead_id: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed information about a specific lead
        
        Args:
            lead_id: Lead UUID
        """
        logger.info(f"MCP: Getting lead details - {lead_id}")
        
        try:
            lead = await self.crm_client.get_lead(lead_id)
            return lead
        except Exception as e:
            logger.error(f"Error getting lead details: {str(e)}")
            return None
    
    async def create_lead(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Create a new lead
        
        Args:
            data: Lead data (firstName, lastName, email, company, etc.)
        """
        logger.info(f"MCP: Creating lead - {data.get('email')}")
        
        try:
            lead = await self.crm_client.create_lead(data)
            logger.info(f"Created lead: {lead.get('id')}")
            return lead
        except Exception as e:
            logger.error(f"Error creating lead: {str(e)}")
            return None
    
    async def get_high_value_leads(self, min_value: float = 10000) -> List[Dict[str, Any]]:
        """
        Get high-value leads above threshold
        
        Args:
            min_value: Minimum estimated value
        """
        logger.info(f"MCP: Getting high-value leads (min: ${min_value})")
        
        try:
            # Search all leads and filter by value
            all_leads = await self.crm_client.search_leads(size=100)
            
            high_value = [
                lead for lead in all_leads
                if lead.get("estimatedValue", 0) >= min_value
            ]
            
            # Sort by value descending
            high_value.sort(key=lambda x: x.get("estimatedValue", 0), reverse=True)
            
            logger.info(f"Found {len(high_value)} high-value leads")
            return high_value
            
        except Exception as e:
            logger.error(f"Error getting high-value leads: {str(e)}")
            return []
    
    async def get_stale_leads(self, days: int = 30) -> List[Dict[str, Any]]:
        """
        Get leads that haven't been contacted recently
        
        Args:
            days: Number of days since last contact
        """
        logger.info(f"MCP: Getting stale leads (>{days} days)")
        
        try:
            from datetime import datetime, timedelta
            
            all_leads = await self.crm_client.search_leads(size=100)
            cutoff_date = datetime.now() - timedelta(days=days)
            
            stale = [
                lead for lead in all_leads
                if not lead.get("lastContactDate") or 
                   datetime.fromisoformat(lead["lastContactDate"].replace("Z", "+00:00")) < cutoff_date
            ]
            
            logger.info(f"Found {len(stale)} stale leads")
            return stale
            
        except Exception as e:
            logger.error(f"Error getting stale leads: {str(e)}")
            return []
