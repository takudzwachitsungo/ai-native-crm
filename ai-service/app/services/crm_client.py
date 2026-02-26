import httpx
from typing import Dict, List, Any, Optional
import logging
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings

logger = logging.getLogger(__name__)


class CRMClient:
    """HTTP client for Java CRM backend"""
    
    def __init__(self):
        self.base_url = settings.CRM_API_URL
        self.username = settings.CRM_API_USERNAME
        self.password = settings.CRM_API_PASSWORD
        self.token: Optional[str] = None
        self.user_token: Optional[str] = None  # Token provided by the user
        self.client = httpx.AsyncClient(timeout=30.0)
    
    def set_user_token(self, token: str):
        """Set the user's JWT token for making requests on their behalf"""
        self.user_token = token
    
    async def _get_token(self) -> str:
        """Authenticate and get JWT token"""
        if self.token:
            return self.token
        
        try:
            response = await self.client.post(
                f"{self.base_url}/api/v1/auth/login",
                json={
                    "email": self.username,
                    "password": self.password
                }
            )
            response.raise_for_status()
            data = response.json()
            self.token = data.get("accessToken")
            logger.info("Successfully authenticated with CRM backend")
            return self.token
        except Exception as e:
            logger.error(f"Failed to authenticate: {str(e)}")
            raise
    
    async def _request(
        self,
        method: str,
        endpoint: str,
        user_token: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Make authenticated request to CRM backend"""
        # ALWAYS require user token - no service account fallback
        if user_token:
            token = user_token
        elif self.user_token:
            token = self.user_token
        else:
            raise ValueError("User token is required. AI service must be called with user's JWT token.")
        
        headers = kwargs.pop("headers", {})
        headers["Authorization"] = f"Bearer {token}"
        
        url = f"{self.base_url}{endpoint}"
        logger.info(f"Making {method} request to: {url}")
        
        try:
            response = await self.client.request(
                method=method,
                url=url,
                headers=headers,
                **kwargs
            )
            
            # Don't retry with service account - if token is invalid, user needs to re-authenticate
            response.raise_for_status()
            return response.json()
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Request failed: {str(e)}")
            raise
    
    # Leads endpoints
    async def search_leads(
        self,
        query: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 0,
        size: int = 20
    ) -> List[Dict[str, Any]]:
        """Search leads"""
        params = {"page": page, "size": size}
        if query:
            params["search"] = query
        if status:
            params["status"] = status
        
        response = await self._request("GET", "/api/v1/leads", params=params)
        return response.get("content", [])
    
    async def get_lead(self, lead_id: str) -> Dict[str, Any]:
        """Get lead by ID"""
        return await self._request("GET", f"/api/v1/leads/{lead_id}")
    
    async def create_lead(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new lead"""
        return await self._request("POST", "/api/v1/leads", json=data)
    
    # Deals endpoints
    async def search_deals(
        self,
        query: Optional[str] = None,
        stage: Optional[str] = None,
        page: int = 0,
        size: int = 20
    ) -> List[Dict[str, Any]]:
        """Search deals"""
        params = {"page": page, "size": size}
        if query:
            params["search"] = query
        if stage:
            params["stage"] = stage
        
        response = await self._request("GET", "/api/v1/deals", params=params)
        return response.get("content", [])
    
    async def get_deal(self, deal_id: str) -> Dict[str, Any]:
        """Get deal by ID"""
        return await self._request("GET", f"/api/v1/deals/{deal_id}")
    
    async def get_pipeline_metrics(self) -> Dict[str, Any]:
        """Get pipeline metrics"""
        return await self._request("GET", "/api/v1/deals/metrics")
    
    # Contacts endpoints
    async def search_contacts(
        self,
        query: Optional[str] = None,
        page: int = 0,
        size: int = 20
    ) -> List[Dict[str, Any]]:
        """Search contacts"""
        params = {"page": page, "size": size}
        if query:
            params["search"] = query
        
        response = await self._request("GET", "/api/v1/contacts", params=params)
        return response.get("content", [])
    
    async def get_contact(self, contact_id: str) -> Dict[str, Any]:
        """Get contact by ID"""
        return await self._request("GET", f"/api/v1/contacts/{contact_id}")
    
    # Companies endpoints
    async def get_companies(
        self,
        query: Optional[str] = None,
        page: int = 0,
        size: int = 100
    ) -> List[Dict[str, Any]]:
        """Get all companies"""
        params = {"page": page, "size": size}
        if query:
            params["search"] = query
        
        response = await self._request("GET", "/api/v1/companies", params=params)
        # Handle both paginated and non-paginated responses
        if isinstance(response, dict) and "content" in response:
            return response.get("content", [])
        elif isinstance(response, list):
            return response
        return []
    
    async def get_company(self, company_id: str) -> Dict[str, Any]:
        """Get company by ID"""
        return await self._request("GET", f"/api/v1/companies/{company_id}")
    
    # Tasks endpoints
    async def search_tasks(
        self,
        query: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 0,
        size: int = 20
    ) -> List[Dict[str, Any]]:
        """Search tasks"""
        params = {"page": page, "size": size}
        if query:
            params["search"] = query
        if status:
            params["status"] = status
        
        response = await self._request("GET", "/api/v1/tasks", params=params)
        return response.get("content", [])
    
    async def get_task(self, task_id: str) -> Dict[str, Any]:
        """Get task by ID"""
        return await self._request("GET", f"/api/v1/tasks/{task_id}")
    
    # Invoices endpoints
    async def search_invoices(
        self,
        query: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 0,
        size: int = 20
    ) -> List[Dict[str, Any]]:
        """Search invoices"""
        params = {"page": page, "size": size}
        if query:
            params["search"] = query
        if status:
            params["status"] = status
        
        response = await self._request("GET", "/api/v1/invoices", params=params)
        return response.get("content", [])
    
    # Quotes endpoints
    async def search_quotes(
        self,
        query: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 0,
        size: int = 20
    ) -> List[Dict[str, Any]]:
        """Search quotes"""
        params = {"page": page, "size": size}
        if query:
            params["search"] = query
        if status:
            params["status"] = status
        
        response = await self._request("GET", "/api/v1/quotes", params=params)
        return response.get("content", [])
    
    # Products endpoints
    async def search_products(
        self,
        query: Optional[str] = None,
        page: int = 0,
        size: int = 20
    ) -> List[Dict[str, Any]]:
        """Search products"""
        params = {"page": page, "size": size}
        if query:
            params["search"] = query
        
        response = await self._request("GET", "/api/v1/products", params=params)
        return response.get("content", [])
    
    # Events endpoints
    async def search_events(
        self,
        query: Optional[str] = None,
        page: int = 0,
        size: int = 20
    ) -> List[Dict[str, Any]]:
        """Search events"""
        params = {"page": page, "size": size}
        if query:
            params["search"] = query
        
        response = await self._request("GET", "/api/v1/events", params=params)
        return response.get("content", [])
    
    # Documents endpoints
    async def search_documents(
        self,
        query: Optional[str] = None,
        page: int = 0,
        size: int = 20
    ) -> List[Dict[str, Any]]:
        """Search documents"""
        params = {"page": page, "size": size}
        if query:
            params["search"] = query
        
        response = await self._request("GET", "/api/v1/documents", params=params)
        return response.get("content", [])
    
    # Emails endpoints
    async def search_emails(
        self,
        query: Optional[str] = None,
        page: int = 0,
        size: int = 20
    ) -> List[Dict[str, Any]]:
        """Search emails"""
        params = {"page": page, "size": size}
        if query:
            params["search"] = query
        
        response = await self._request("GET", "/api/v1/emails", params=params)
        return response.get("content", [])
    
    # Dashboard endpoints
    async def get_dashboard_stats(self) -> Dict[str, Any]:
        """Get dashboard statistics"""
        return await self._request("GET", "/api/v1/dashboard/stats")
    
    # Global search
    async def global_search(self, query: str) -> Dict[str, Any]:
        """Perform global search across all entities"""
        return await self._request("GET", "/api/v1/search", params={"q": query})
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()
