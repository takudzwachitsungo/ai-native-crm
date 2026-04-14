from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class ContactsMCPServer:
    """MCP Server for Contacts operations"""
    
    def __init__(self, crm_client):
        self.crm_client = crm_client
    
    async def search_contacts(
        self,
        query: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Search for contacts in CRM
        
        Args:
            query: Search query (name, email, phone, company)
            limit: Maximum results to return
        """
        logger.info(f"MCP: Searching contacts - query: {query}")
        
        try:
            results = await self.crm_client.search_contacts(
                query=query,
                size=limit
            )
            
            logger.info(f"Found {len(results)} contacts")
            return results
            
        except Exception as e:
            logger.error(f"Error searching contacts: {str(e)}")
            return []
    
    async def get_contact_details(self, contact_id: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed information about a specific contact
        
        Args:
            contact_id: Contact UUID
        """
        logger.info(f"MCP: Getting contact details - {contact_id}")
        
        try:
            contact = await self.crm_client.get_contact(contact_id)
            return contact
        except Exception as e:
            logger.error(f"Error getting contact details: {str(e)}")
            return None
    
    async def get_vip_contacts(self) -> List[Dict[str, Any]]:
        """
        Get VIP contacts (decision makers, high-value contacts)
        """
        logger.info("MCP: Getting VIP contacts")
        
        try:
            all_contacts = await self.crm_client.search_contacts(size=100)
            
            vip = [
                contact for contact in all_contacts
                if contact.get("isVip") or 
                   contact.get("title", "").lower() in ["ceo", "cto", "cfo", "president", "director", "vp"]
            ]
            
            logger.info(f"Found {len(vip)} VIP contacts")
            return vip
            
        except Exception as e:
            logger.error(f"Error getting VIP contacts: {str(e)}")
            return []
