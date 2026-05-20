import httpx
from typing import Dict, List, Any, Optional
import logging
import base64
import json
import time
from contextvars import ContextVar, Token
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings

logger = logging.getLogger(__name__)

_request_user_token: ContextVar[Optional[str]] = ContextVar("crm_request_user_token", default=None)


class CRMClient:
    """HTTP client for Java CRM backend"""
    
    def __init__(self):
        self.base_url = settings.CRM_API_URL
        self.username = settings.CRM_API_USERNAME
        self.password = settings.CRM_API_PASSWORD
        self.token: Optional[str] = None
        self.service_account_token: Optional[str] = None
        self.service_account_token_expires_at: Optional[float] = None
        self.client = httpx.AsyncClient(timeout=30.0)
    
    def set_user_token(self, token: str) -> Token[Optional[str]]:
        """Bind the user's JWT token to the current async request context."""
        return _request_user_token.set(token)

    def reset_user_token(self, token_handle: Token[Optional[str]]) -> None:
        """Clear the request-scoped user token after an AI request finishes."""
        _request_user_token.reset(token_handle)
    
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
        elif _request_user_token.get():
            token = _request_user_token.get()
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

    async def get_rag_scheduler_token(self) -> str:
        """Return a scheduler token using either static JWT or refreshed service-account login."""
        auth_mode = (settings.AI_RAG_SCHEDULER_AUTH_MODE or "jwt").lower()
        if auth_mode == "service_account":
            return await self._get_service_account_token()
        if settings.AI_RAG_SCHEDULER_ACCESS_TOKEN:
            return settings.AI_RAG_SCHEDULER_ACCESS_TOKEN
        raise ValueError("RAG scheduler token is not configured")

    async def _get_service_account_token(self) -> str:
        if not settings.AI_RAG_SERVICE_ACCOUNT_EMAIL or not settings.AI_RAG_SERVICE_ACCOUNT_PASSWORD:
            raise ValueError("AI_RAG_SERVICE_ACCOUNT_EMAIL and AI_RAG_SERVICE_ACCOUNT_PASSWORD are required")

        now = time.time()
        refresh_buffer = max(settings.AI_RAG_SERVICE_ACCOUNT_REFRESH_BUFFER_SECONDS, 60)
        if (
            self.service_account_token
            and self.service_account_token_expires_at
            and self.service_account_token_expires_at - refresh_buffer > now
        ):
            return self.service_account_token

        payload: Dict[str, Any] = {
            "email": settings.AI_RAG_SERVICE_ACCOUNT_EMAIL,
            "password": settings.AI_RAG_SERVICE_ACCOUNT_PASSWORD,
        }
        if settings.AI_RAG_SERVICE_ACCOUNT_WORKSPACE:
            payload["workspaceSlug"] = settings.AI_RAG_SERVICE_ACCOUNT_WORKSPACE

        response = await self.client.post(f"{self.base_url}/api/v1/auth/login", json=payload)
        response.raise_for_status()
        data = response.json()
        token = data.get("accessToken")
        if not token:
            raise ValueError("Service-account login did not return accessToken")
        self.service_account_token = token
        self.service_account_token_expires_at = self._jwt_exp(token) or (now + 3600)
        logger.info("Refreshed CRM service-account token for RAG scheduler")
        return token

    @staticmethod
    def _jwt_exp(token: str) -> Optional[float]:
        try:
            parts = token.split(".")
            if len(parts) < 2:
                return None
            payload = parts[1] + "=" * (-len(parts[1]) % 4)
            data = json.loads(base64.urlsafe_b64decode(payload.encode("utf-8")))
            exp = data.get("exp")
            return float(exp) if exp else None
        except Exception:
            return None

    @staticmethod
    def _extract_collection(response: Any) -> List[Dict[str, Any]]:
        """Normalize paginated and list responses from the Java backend."""
        if isinstance(response, dict) and isinstance(response.get("content"), list):
            return response.get("content", [])
        if isinstance(response, list):
            return response
        return []
    
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
        return self._extract_collection(response)
    
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
        return self._extract_collection(response)
    
    async def get_deal(self, deal_id: str) -> Dict[str, Any]:
        """Get deal by ID"""
        return await self._request("GET", f"/api/v1/deals/{deal_id}")
    
    async def get_pipeline_metrics(self) -> Dict[str, Any]:
        """Get pipeline metrics"""
        return await self._request("GET", "/api/v1/deals/statistics")
    
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
        return self._extract_collection(response)
    
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
        return self._extract_collection(response)
    
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
        return self._extract_collection(response)
    
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
        return self._extract_collection(response)
    
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
        return self._extract_collection(response)
    
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
        return self._extract_collection(response)
    
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
        return self._extract_collection(response)
    
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
        return self._extract_collection(response)
    
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
        return self._extract_collection(response)

    # Campaigns endpoints
    async def search_campaigns(
        self,
        query: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 0,
        size: int = 20
    ) -> List[Dict[str, Any]]:
        """Search marketing campaigns."""
        params = {"page": page, "size": size}
        if query:
            params["search"] = query
        if status:
            params["status"] = status

        response = await self._request("GET", "/api/v1/campaigns", params=params)
        return self._extract_collection(response)

    async def get_campaign_statistics(self) -> Dict[str, Any]:
        """Get campaign statistics."""
        return await self._request("GET", "/api/v1/campaigns/statistics")

    # Support cases endpoints
    async def search_cases(
        self,
        query: Optional[str] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        page: int = 0,
        size: int = 20
    ) -> List[Dict[str, Any]]:
        """Search support cases."""
        params = {"page": page, "size": size}
        if query:
            params["search"] = query
        if status:
            params["status"] = status
        if priority:
            params["priority"] = priority

        response = await self._request("GET", "/api/v1/cases", params=params)
        return self._extract_collection(response)

    async def get_case_statistics(self) -> Dict[str, Any]:
        """Get support case statistics."""
        return await self._request("GET", "/api/v1/cases/statistics")

    async def get_case_assignment_queue(self) -> Dict[str, Any]:
        """Get support case assignment queue."""
        return await self._request("GET", "/api/v1/cases/assignment-queue")

    # Contracts endpoints
    async def search_contracts(
        self,
        query: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 0,
        size: int = 20
    ) -> List[Dict[str, Any]]:
        """Search contracts."""
        params = {"page": page, "size": size}
        if query:
            params["search"] = query
        if status:
            params["status"] = status

        response = await self._request("GET", "/api/v1/contracts", params=params)
        return self._extract_collection(response)

    # Field service endpoints
    async def search_work_orders(
        self,
        query: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 0,
        size: int = 20
    ) -> List[Dict[str, Any]]:
        """Search field service work orders."""
        params = {"page": page, "size": size}
        if query:
            params["search"] = query
        if status:
            params["status"] = status

        response = await self._request("GET", "/api/v1/field-service/work-orders", params=params)
        return self._extract_collection(response)

    async def get_work_order_statistics(self) -> Dict[str, Any]:
        """Get field service work order statistics."""
        return await self._request("GET", "/api/v1/field-service/work-orders/statistics")

    # Integrations and revenue operations endpoints
    async def get_integrations(self) -> List[Dict[str, Any]]:
        """Get workspace integration connection status."""
        response = await self._request("GET", "/api/v1/settings/integrations")
        return self._extract_collection(response)

    async def get_revenue_ops_summary(self) -> Dict[str, Any]:
        """Get revenue operations summary."""
        return await self._request("GET", "/api/v1/dashboard/revenue-ops")
    
    # Dashboard endpoints
    async def get_dashboard_stats(self) -> Dict[str, Any]:
        """Get dashboard statistics"""
        return await self._request("GET", "/api/v1/dashboard/stats")
    
    # Global search
    async def global_search(self, query: str) -> Dict[str, Any]:
        """Perform global search across all entities"""
        leads, deals, contacts, companies, tasks = await self.search_leads(
            query=query, size=10
        ), await self.search_deals(
            query=query, size=10
        ), await self.search_contacts(
            query=query, size=10
        ), await self.get_companies(
            query=query, size=10
        ), await self.search_tasks(
            query=query, size=10
        )
        campaigns, cases, contracts, work_orders = await self.search_campaigns(
            query=query, size=10
        ), await self.search_cases(
            query=query, size=10
        ), await self.search_contracts(
            query=query, size=10
        ), await self.search_work_orders(
            query=query, size=10
        )

        return {
            "leads": leads,
            "deals": deals,
            "contacts": contacts,
            "companies": companies,
            "tasks": tasks,
            "campaigns": campaigns,
            "cases": cases,
            "contracts": contracts,
            "work_orders": work_orders,
        }
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()
