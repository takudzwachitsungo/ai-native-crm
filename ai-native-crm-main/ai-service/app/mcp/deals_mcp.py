from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class DealsMCPServer:
    """MCP Server for Deals operations"""
    
    def __init__(self, crm_client):
        self.crm_client = crm_client
    
    async def search_deals(
        self,
        query: Optional[str] = None,
        stage: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Search for deals in CRM
        
        Args:
            query: Search query (name, company)
            stage: Deal stage filter (PROSPECTING, QUALIFICATION, PROPOSAL, etc.)
            limit: Maximum results to return
        """
        logger.info(f"MCP: Searching deals - query: {query}, stage: {stage}")
        
        try:
            results = await self.crm_client.search_deals(
                query=query,
                stage=stage,
                size=limit
            )
            
            logger.info(f"Found {len(results)} deals")
            return results
            
        except Exception as e:
            logger.error(f"Error searching deals: {str(e)}")
            return []
    
    async def get_deal_details(self, deal_id: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed information about a specific deal
        
        Args:
            deal_id: Deal UUID
        """
        logger.info(f"MCP: Getting deal details - {deal_id}")
        
        try:
            deal = await self.crm_client.get_deal(deal_id)
            return deal
        except Exception as e:
            logger.error(f"Error getting deal details: {str(e)}")
            return None
    
    async def get_pipeline_metrics(self) -> Dict[str, Any]:
        """
        Get pipeline metrics and statistics
        """
        logger.info("MCP: Getting pipeline metrics")
        
        try:
            metrics = await self.crm_client.get_pipeline_metrics()
            return metrics
        except Exception as e:
            logger.error(f"Error getting pipeline metrics: {str(e)}")
            return {}
    
    async def get_deals_by_stage(self, stage: str) -> List[Dict[str, Any]]:
        """
        Get all deals in a specific stage
        
        Args:
            stage: Deal stage (PROSPECTING, QUALIFICATION, PROPOSAL, NEGOTIATION, CLOSED_WON, CLOSED_LOST)
        """
        logger.info(f"MCP: Getting deals in stage: {stage}")
        
        try:
            deals = await self.crm_client.search_deals(stage=stage, size=100)
            return deals
        except Exception as e:
            logger.error(f"Error getting deals by stage: {str(e)}")
            return []
    
    async def get_closing_soon_deals(self, days: int = 30) -> List[Dict[str, Any]]:
        """
        Get deals expected to close soon
        
        Args:
            days: Number of days to look ahead
        """
        logger.info(f"MCP: Getting deals closing in next {days} days")
        
        try:
            from datetime import datetime, timedelta
            
            all_deals = await self.crm_client.search_deals(size=100)
            cutoff_date = datetime.now() + timedelta(days=days)
            
            closing_soon = [
                deal for deal in all_deals
                if deal.get("expectedCloseDate") and
                   datetime.fromisoformat(deal["expectedCloseDate"].replace("Z", "+00:00")) <= cutoff_date and
                   deal.get("stage") not in ["CLOSED_WON", "CLOSED_LOST"]
            ]
            
            # Sort by close date
            closing_soon.sort(key=lambda x: x.get("expectedCloseDate", ""))
            
            logger.info(f"Found {len(closing_soon)} deals closing soon")
            return closing_soon
            
        except Exception as e:
            logger.error(f"Error getting closing soon deals: {str(e)}")
            return []
    
    async def get_at_risk_deals(self) -> List[Dict[str, Any]]:
        """
        Get deals that might be at risk (low probability, past close date, etc.)
        """
        logger.info("MCP: Getting at-risk deals")
        
        try:
            from datetime import datetime
            
            all_deals = await self.crm_client.search_deals(size=100)
            now = datetime.now()
            
            at_risk = [
                deal for deal in all_deals
                if (
                    # Low probability
                    (deal.get("probability", 100) < 30) or
                    # Past close date and not closed
                    (deal.get("expectedCloseDate") and
                     datetime.fromisoformat(deal["expectedCloseDate"].replace("Z", "+00:00")) < now and
                     deal.get("stage") not in ["CLOSED_WON", "CLOSED_LOST"])
                )
            ]
            
            logger.info(f"Found {len(at_risk)} at-risk deals")
            return at_risk
            
        except Exception as e:
            logger.error(f"Error getting at-risk deals: {str(e)}")
            return []
