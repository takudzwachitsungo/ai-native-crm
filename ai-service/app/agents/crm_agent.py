from typing import List, Dict, Any, Optional
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
import logging
import json

from app.config import settings
from app.mcp.leads_mcp import LeadsMCPServer
from app.mcp.deals_mcp import DealsMCPServer
from app.mcp.contacts_mcp import ContactsMCPServer
from app.services.crm_client import CRMClient
from app.rag.embeddings import EmbeddingService
from typing_extensions import TypedDict

logger = logging.getLogger(__name__)


class AgentState(TypedDict, total=False):
    """State for LangGraph agent"""
    query: str
    history: List[Dict[str, str]]
    context: Optional[Dict[str, Any]]
    thought: str
    strategy: str  # Routing strategy: "tools", "rag", or "direct"
    tool_calls: List[Dict[str, Any]]
    tool_results: List[Dict[str, Any]]
    final_response: str
    sources: List[Dict[str, Any]]
    degraded_mode: bool
    degraded_reason: Optional[str]
    llm_usage: Dict[str, Any]
    provider_errors: List[Dict[str, Any]]


class CRMAgent:
    """Agentic AI for CRM with LangGraph workflow"""
    
    def __init__(self):
        self.llm = ChatGroq(
            groq_api_key=settings.GROQ_API_KEY,
            model_name=settings.CHAT_MODEL,
            temperature=settings.TEMPERATURE,
            max_tokens=settings.MAX_TOKENS
        )
        
        # Initialize CRM client
        self.crm_client = CRMClient()
        
        # Initialize MCP servers
        self.leads_mcp = LeadsMCPServer(self.crm_client)
        self.deals_mcp = DealsMCPServer(self.crm_client)
        self.contacts_mcp = ContactsMCPServer(self.crm_client)
        
        # Initialize embedding service
        self.embedding_service = EmbeddingService(self.crm_client)
        
        # Build LangGraph workflow
        self.workflow = self._build_workflow()
        
        logger.info("CRM Agent initialized successfully")

    @staticmethod
    def _is_llm_unavailable_error(error: Exception) -> bool:
        """Detect provider/network failures that should trigger deterministic fallbacks."""
        message = str(error).lower()
        return any(
            marker in message
            for marker in ["access denied", "permissiondenied", "403", "network settings"]
        )

    @staticmethod
    def _empty_llm_usage() -> Dict[str, Any]:
        return {
            "provider": "groq",
            "model": settings.CHAT_MODEL,
            "calls": 0,
            "input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0,
            "by_operation": {},
        }

    @staticmethod
    def _safe_int(value: Any) -> int:
        try:
            return max(0, int(value or 0))
        except (TypeError, ValueError):
            return 0

    def _extract_llm_usage(self, response: Any) -> Dict[str, int]:
        usage_metadata = getattr(response, "usage_metadata", None) or {}
        response_metadata = getattr(response, "response_metadata", None) or {}
        token_usage = response_metadata.get("token_usage") if isinstance(response_metadata, dict) else {}
        token_usage = token_usage or {}

        input_tokens = (
            usage_metadata.get("input_tokens")
            or usage_metadata.get("prompt_tokens")
            or token_usage.get("prompt_tokens")
            or token_usage.get("input_tokens")
        )
        output_tokens = (
            usage_metadata.get("output_tokens")
            or usage_metadata.get("completion_tokens")
            or token_usage.get("completion_tokens")
            or token_usage.get("output_tokens")
        )
        total_tokens = (
            usage_metadata.get("total_tokens")
            or token_usage.get("total_tokens")
            or (self._safe_int(input_tokens) + self._safe_int(output_tokens))
        )

        return {
            "input_tokens": self._safe_int(input_tokens),
            "output_tokens": self._safe_int(output_tokens),
            "total_tokens": self._safe_int(total_tokens),
        }

    def _record_llm_usage(self, state: AgentState, operation: str, response: Any) -> None:
        usage = state.get("llm_usage") or self._empty_llm_usage()
        extracted = self._extract_llm_usage(response)
        usage["calls"] = self._safe_int(usage.get("calls")) + 1
        usage["input_tokens"] = self._safe_int(usage.get("input_tokens")) + extracted["input_tokens"]
        usage["output_tokens"] = self._safe_int(usage.get("output_tokens")) + extracted["output_tokens"]
        usage["total_tokens"] = self._safe_int(usage.get("total_tokens")) + extracted["total_tokens"]

        by_operation = usage.get("by_operation") or {}
        op_usage = by_operation.get(operation) or {"calls": 0, "input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
        op_usage["calls"] = self._safe_int(op_usage.get("calls")) + 1
        op_usage["input_tokens"] = self._safe_int(op_usage.get("input_tokens")) + extracted["input_tokens"]
        op_usage["output_tokens"] = self._safe_int(op_usage.get("output_tokens")) + extracted["output_tokens"]
        op_usage["total_tokens"] = self._safe_int(op_usage.get("total_tokens")) + extracted["total_tokens"]
        by_operation[operation] = op_usage
        usage["by_operation"] = by_operation
        state["llm_usage"] = usage

    def _record_provider_error(self, state: AgentState, operation: str, error: Exception, *, fallback_used: bool) -> None:
        errors = state.get("provider_errors") or []
        errors.append({
            "provider": "groq",
            "model": settings.CHAT_MODEL,
            "operation": operation,
            "error_type": error.__class__.__name__,
            "message": str(error)[:300],
            "fallback_used": fallback_used,
        })
        state["provider_errors"] = errors

    @staticmethod
    def _format_currency(value: Any) -> str:
        try:
            return f"${float(value or 0):,.0f}"
        except (TypeError, ValueError):
            return "$0"

    @staticmethod
    def _is_short_affirmation(query: str) -> bool:
        normalized = " ".join((query or "").strip().lower().split())
        return normalized in {
            "yes",
            "yeah",
            "yep",
            "sure",
            "sure thing",
            "okay",
            "ok",
            "go ahead",
            "please do",
            "yes please",
            "yes sure",
            "yes sure go ahead",
            "go on",
            "continue",
        }

    def _build_follow_up_query(self, state: AgentState) -> str:
        query = state["query"]
        normalized_query = " ".join((query or "").strip().lower().split())
        contextual_markers = {
            "this",
            "that",
            "these",
            "those",
            "it",
            "they",
            "them",
            "based on this",
            "based on that",
            "from this",
            "from that",
            "above",
            "previous",
        }
        is_contextual_follow_up = any(marker in normalized_query for marker in contextual_markers)

        if not self._is_short_affirmation(query) and not is_contextual_follow_up:
            return query

        history = state.get("history") or []
        recent_messages = history[-4:]
        history_text = " ".join(
            str(message.get("content", ""))
            for message in recent_messages
            if isinstance(message, dict)
        ).strip()

        if not history_text:
            return query

        return f"{query}\n\nConversation context:\n{history_text}"
    
    def _build_workflow(self) -> StateGraph:
        """Build LangGraph workflow for agent"""
        workflow = StateGraph(AgentState)
        
        # Add nodes
        workflow.add_node("understand", self._understand_intent)
        workflow.add_node("plan", self._plan_actions)
        workflow.add_node("execute_tools", self._execute_tools)
        workflow.add_node("rag_search", self._rag_search)
        workflow.add_node("synthesize", self._synthesize_response)
        
        # Add edges
        workflow.set_entry_point("understand")
        workflow.add_edge("understand", "plan")
        workflow.add_conditional_edges(
            "plan",
            self._should_use_tools,
            {
                "tools": "execute_tools",
                "rag": "rag_search",
                "direct": "synthesize"
            }
        )
        workflow.add_edge("execute_tools", "synthesize")
        workflow.add_edge("rag_search", "synthesize")
        workflow.add_edge("synthesize", END)
        
        return workflow.compile()
    
    async def process_query(
        self,
        query: str,
        history: List[Dict[str, str]] = None,
        context: Optional[Dict[str, Any]] = None,
        user_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """Process user query through agent workflow"""
        
        token_handle = None
        if user_token:
            token_handle = self.crm_client.set_user_token(user_token)
            context = context or {}
            context['user_token'] = user_token

        try:
            initial_state = AgentState(
                query=query,
                history=history or [],
                context=context or {},
                thought="",
                tool_calls=[],
                tool_results=[],
                final_response="",
                sources=[],
                degraded_mode=False,
                degraded_reason=None,
                llm_usage=self._empty_llm_usage(),
                provider_errors=[],
            )

            final_state = await self.workflow.ainvoke(initial_state)

            return {
                "message": final_state["final_response"],
                "tool_calls": final_state["tool_calls"],
                "sources": final_state["sources"],
                "degraded_mode": final_state.get("degraded_mode", False),
                "degraded_reason": final_state.get("degraded_reason"),
                "usage": final_state.get("llm_usage") or self._empty_llm_usage(),
                "provider_errors": final_state.get("provider_errors") or [],
            }
        finally:
            if token_handle is not None:
                self.crm_client.reset_user_token(token_handle)
    
    def _get_tool_display_name(self, tool_name: str, query: str = "") -> str:
        """Get user-friendly display name for tool"""
        tool_map = {
            "search_leads": "Searching leads",
            "search_contacts": "Looking up contacts",
            "search_companies": "Searching companies",
            "search_deals": "Analyzing deals",
            "get_deal_details": "Fetching deal details",
            "search_tasks": "Checking tasks",
            "search_emails": "Reviewing emails",
            "search_events": "Checking calendar",
            "search_documents": "Searching documents",
            "search_invoices": "Reviewing invoices",
            "search_quotes": "Analyzing quotes",
            "search_products": "Looking up products",
            "search_campaigns": "Reviewing campaigns",
            "get_campaign_statistics": "Checking campaign performance",
            "search_cases": "Reviewing support cases",
            "get_case_statistics": "Checking service dashboard",
            "get_case_assignment_queue": "Checking case assignment queue",
            "search_contracts": "Reviewing contracts",
            "search_work_orders": "Checking field service work orders",
            "get_work_order_statistics": "Checking field service dashboard",
            "get_integrations": "Checking integrations",
            "get_revenue_ops_summary": "Checking revenue operations",
            "get_pipeline_summary": "Analyzing pipeline",
            "get_user_activity": "Checking activity",
            "semantic_search": "Searching knowledge base"
        }
        return tool_map.get(tool_name, tool_name.replace('_', ' ').title())
    
    async def process_query_stream(
        self,
        query: str,
        history: List[Dict[str, str]] = None,
        context: Optional[Dict[str, Any]] = None,
        user_token: Optional[str] = None
    ):
        """Process query with streaming - yields events as they happen"""
        
        token_handle = None
        if user_token:
            token_handle = self.crm_client.set_user_token(user_token)
            context = context or {}
            context['user_token'] = user_token

        try:
            initial_state = AgentState(
                query=query,
                history=history or [],
                context=context or {},
                thought="",
                tool_calls=[],
                tool_results=[],
                final_response="",
                sources=[],
                degraded_mode=False,
                degraded_reason=None,
                llm_usage=self._empty_llm_usage(),
                provider_errors=[],
            )

            # Run understanding step
            state = await self._understand_intent(initial_state)
            state = await self._plan_actions(state)

            strategy = self._should_use_tools(state)

            # Execute tools with streaming notifications
            if strategy == "tools":
                for tool_call in state["tool_calls"]:
                    yield {
                        "type": "tool_start",
                        "tool": tool_call["tool"],
                        "display_name": self._get_tool_display_name(tool_call["tool"], tool_call.get("query", "")),
                        "query": tool_call.get("query", "")
                    }

                state = await self._execute_tools(state)

                for tool_call in state["tool_calls"]:
                    yield {
                        "type": "tool_end",
                        "tool": tool_call["tool"],
                        "display_name": self._get_tool_display_name(tool_call["tool"])
                    }

            elif strategy == "rag":
                display_name = self._get_tool_display_name("semantic_search", query)
                yield {"type": "tool_start", "tool": "semantic_search", "display_name": display_name, "query": query}
                state = await self._rag_search(state)
                yield {"type": "tool_end", "tool": "semantic_search", "display_name": display_name}

            response_text = ""
            try:
                async for token in self._stream_synthesized_response(state):
                    response_text += token
                    yield {
                        "type": "token",
                        "content": token
                    }
                state["final_response"] = response_text
            except Exception as error:
                if self._is_llm_unavailable_error(error):
                    logger.warning("LLM unavailable during streamed response synthesis, using deterministic fallback")
                    self._record_provider_error(state, "response_stream", error, fallback_used=True)
                    state["final_response"] = self._build_tool_fallback_response(state)
                    state["degraded_mode"] = True
                    state["degraded_reason"] = "AI provider unavailable; showing live CRM results with rule-based summaries."
                    response_text = state["final_response"]
                    yield {
                        "type": "token",
                        "content": response_text
                    }
                else:
                    self._record_provider_error(state, "response_stream", error, fallback_used=False)
                    raise

            yield {
                "type": "done",
                "message": state["final_response"],
                "tool_calls": state["tool_calls"],
                "sources": state["sources"],
                "degraded_mode": state.get("degraded_mode", False),
                "degraded_reason": state.get("degraded_reason"),
                "usage": state.get("llm_usage") or self._empty_llm_usage(),
                "provider_errors": state.get("provider_errors") or [],
            }
        finally:
            if token_handle is not None:
                self.crm_client.reset_user_token(token_handle)
    
    async def _understand_intent(self, state: AgentState) -> AgentState:
        """Understand user intent and extract entities"""
        logger.info(f"Understanding intent: {state['query']}")
        
        system_prompt = """You're a smart, conversational CRM assistant - think of yourself as a helpful colleague, not a robot.

Be natural and friendly:
- Greet users warmly when they say hi/hello
- Use casual language ("Hey!", "Sure thing!", "Got it!")
- Show personality while staying professional
- It's okay to have brief friendly exchanges before diving into work

When analyzing requests:
1. What do they actually want to know or do?
2. Which CRM data do they need? (leads, deals, contacts, companies, tasks, invoices, quotes, products, events, documents, emails, campaigns, cases, contracts, field service, integrations, revenue ops)
3. What action should I take? (search, create, update, analyze, count, calculate)
4. Any specific filters or conditions they mentioned?

Keep it brief and natural - you're chatting with a colleague, not writing documentation."""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Query: {state['query']}")
        ]
        
        try:
            response = await self.llm.ainvoke(messages)
            self._record_llm_usage(state, "intent_understanding", response)
            state["thought"] = response.content
        except Exception as error:
            if self._is_llm_unavailable_error(error):
                logger.warning("LLM unavailable during intent understanding, using rule-based routing")
                self._record_provider_error(state, "intent_understanding", error, fallback_used=True)
                state["thought"] = "Using fallback routing because the LLM provider is unavailable."
            else:
                self._record_provider_error(state, "intent_understanding", error, fallback_used=False)
                raise
        
        return state
    
    async def _plan_actions(self, state: AgentState) -> AgentState:
        """Plan which tools or approach to use"""
        logger.info("Planning actions")
        
        resolved_query = self._build_follow_up_query(state)
        state["context"] = state.get("context") or {}
        state["context"]["resolved_query"] = resolved_query
        query_lower = resolved_query.lower()
        
        # CRM entity keywords - if ANY of these are mentioned, MUST use tools
        # Use fuzzy matching to handle typos (e.g., "conctacts" -> "contacts")
        entity_keywords = [
            "lead", "deal", "contact", "company", "pipeline", "opportunity",
            "task", "invoice", "quote", "product", "event", "meeting",
            "document", "email", "calendar", "customer", "client",
            "performance", "team", "forecast", "revenue", "sales", "rep",
            "owner", "quota", "target", "goal", "win rate", "closed",
            "risk", "attention", "pipeline", "campaign", "marketing",
            "nurture", "journey", "case", "support", "ticket", "sla",
            "contract", "cpq", "renewal", "field service", "work order",
            "technician", "dispatch", "integration", "connector", "oauth",
            "erp", "quickbooks", "xero", "microsoft", "google", "revenue ops",
            "territory", "attainment"
        ]
        
        # Help/documentation keywords - only these use RAG
        help_keywords = [
            "how do i", "how to", "help", "tutorial", "guide", "documentation",
            "explain", "what is", "what does", "configure", "setup"
        ]
        
        # Check if query is about CRM data vs documentation
        # Use partial matching to catch plurals and typos
        has_entity = any(
            keyword in query_lower or  # Exact match
            keyword + 's' in query_lower or  # Plural
            keyword + 'es' in query_lower or  # Plural (es)
            any(keyword[:3] in word and len(word) <= len(keyword) + 2 for word in query_lower.split())  # Fuzzy (first 3 chars)
            for keyword in entity_keywords
        )
        is_help_query = any(phrase in query_lower for phrase in help_keywords) and not has_entity
        
        # CRITICAL: If ANY entity is mentioned, ALWAYS use tools to query real data
        # NEVER use RAG for CRM data - only for documentation/help
        if has_entity:
            state["strategy"] = "tools"  # lowercase for routing
            logger.info(f"Strategy: tools (entity detected)")
        elif any(word in query_lower for word in ["create", "add", "new", "update", "delete", "change"]):
            state["strategy"] = "tools"  # lowercase for routing
            logger.info(f"Strategy: tools (write operation)")
        elif is_help_query:
            state["strategy"] = "rag"
            logger.info(f"Strategy: rag (help/documentation)")
        else:
            # Default to direct for greetings, small talk
            state["strategy"] = "direct"
            logger.info(f"Strategy: direct (no entity or help query)")
        
        return state
    
    def _should_use_tools(self, state: AgentState) -> str:
        """Decide which path to take"""
        strategy = state.get("strategy", "direct")
        logger.info(f"Routing decision: {strategy} (from state['strategy'])")
        return strategy
    
    async def _execute_tools(self, state: AgentState) -> AgentState:
        """Execute MCP tools based on query"""
        logger.info("Executing tools")
        
        resolved_query = state.get("context", {}).get("resolved_query", state["query"])
        query_lower = resolved_query.lower()
        
        # Check for CREATE operations first
        is_create = any(word in query_lower for word in ["create", "add", "new", "make"])
        
        if is_create and "lead" in query_lower:
            # Extract lead data from query using LLM
            extraction_prompt = f"""Extract lead information from this request: "{state['query']}"
            
            Return a JSON object with these fields (use null for missing fields):
            {{
                "firstName": "string or null",
                "lastName": "string or null", 
                "email": "string or null",
                "company": "string or null",
                "phone": "string or null",
                "status": "NEW",
                "estimatedValue": number or null,
                "notes": "string or null"
            }}
            
            Only return the JSON, no other text."""
            
            try:
                messages = [{"role": "user", "content": extraction_prompt}]
                extraction_response = await self.llm.ainvoke(messages)
                self._record_llm_usage(state, "lead_extraction", extraction_response)
                import json
                lead_data = json.loads(extraction_response.content.strip())
                result = await self.leads_mcp.create_lead(lead_data)
                
                state["tool_calls"].append({"tool": "create_lead", "data": lead_data})
                state["tool_results"].append({"tool": "create_lead", "results": result})
                return state
            except Exception as e:
                if self._is_llm_unavailable_error(e):
                    self._record_provider_error(state, "lead_extraction", e, fallback_used=False)
                logger.error(f"Error creating lead: {str(e)}")
                state["tool_results"].append({"tool": "create_lead", "error": str(e)})
                return state
        
        # Determine which tools to call based on entity type
        if "company" in query_lower or "companies" in query_lower:
            results = await self.crm_client.get_companies()
            state["tool_calls"].append({"tool": "get_companies", "query": state["query"]})
            state["tool_results"].append({"tool": "get_companies", "results": results})
        
        elif "task" in query_lower:
            # For count/list queries, don't pass the query as search term
            is_count_query = any(word in query_lower for word in ["how many", "count", "total", "all", "list", "show", "what", "check"])
            search_term = None if is_count_query else state["query"]
            results = await self.crm_client.search_tasks(search_term)
            state["tool_calls"].append({"tool": "search_tasks", "query": state["query"]})
            state["tool_results"].append({"tool": "search_tasks", "results": results})
        
        elif "invoice" in query_lower:
            # For count/list queries, don't pass the query as search term
            is_count_query = any(word in query_lower for word in ["how many", "count", "total", "all", "list", "show", "what", "check"])
            search_term = None if is_count_query else state["query"]
            results = await self.crm_client.search_invoices(search_term)
            state["tool_calls"].append({"tool": "search_invoices", "query": state["query"]})
            state["tool_results"].append({"tool": "search_invoices", "results": results})
        
        elif "quote" in query_lower:
            # For count/list queries, don't pass the query as search term
            is_count_query = any(word in query_lower for word in ["how many", "count", "total", "all", "list", "show", "what", "check"])
            search_term = None if is_count_query else state["query"]
            results = await self.crm_client.search_quotes(search_term)
            state["tool_calls"].append({"tool": "search_quotes", "query": state["query"]})
            state["tool_results"].append({"tool": "search_quotes", "results": results})
        
        elif "product" in query_lower:
            # For count/list queries, don't pass the query as search term
            is_count_query = any(word in query_lower for word in ["how many", "count", "total", "all", "list", "show", "what", "check"])
            search_term = None if is_count_query else state["query"]
            results = await self.crm_client.search_products(search_term)
            state["tool_calls"].append({"tool": "search_products", "query": state["query"]})
            state["tool_results"].append({"tool": "search_products", "results": results})
        
        elif "event" in query_lower or "calendar" in query_lower or "meeting" in query_lower:
            # For count/list queries, don't pass the query as search term
            is_count_query = any(word in query_lower for word in ["how many", "count", "total", "all", "list", "show", "what", "check", "any", "upcoming"])
            search_term = None if is_count_query else state["query"]
            results = await self.crm_client.search_events(search_term)
            state["tool_calls"].append({"tool": "search_events", "query": state["query"]})
            state["tool_results"].append({"tool": "search_events", "results": results})
        
        elif "document" in query_lower or "file" in query_lower:
            # For count/list queries, don't pass the query as search term
            is_count_query = any(word in query_lower for word in ["how many", "count", "total", "all", "list", "show", "what", "check"])
            search_term = None if is_count_query else state["query"]
            results = await self.crm_client.search_documents(search_term)
            state["tool_calls"].append({"tool": "search_documents", "query": state["query"]})
            state["tool_results"].append({"tool": "search_documents", "results": results})
        
        elif "email" in query_lower or "message" in query_lower:
            # For count/list queries, don't pass the query as search term
            is_count_query = any(word in query_lower for word in ["how many", "count", "total", "all", "list", "show", "what", "check"])
            search_term = None if is_count_query else state["query"]
            results = await self.crm_client.search_emails(search_term)
            state["tool_calls"].append({"tool": "search_emails", "query": state["query"]})
            state["tool_results"].append({"tool": "search_emails", "results": results})

        elif "campaign" in query_lower or "marketing" in query_lower or "nurture" in query_lower or "journey" in query_lower:
            is_count_query = any(word in query_lower for word in ["how many", "count", "total", "all", "list", "show", "what", "check", "performance", "roi"])
            search_term = None if is_count_query else state["query"]
            results = await self.crm_client.search_campaigns(search_term, size=100)
            state["tool_calls"].append({"tool": "search_campaigns", "query": state["query"]})
            state["tool_results"].append({"tool": "search_campaigns", "results": results})

            if any(word in query_lower for word in ["stats", "statistics", "performance", "roi", "summary", "dashboard"]):
                stats = await self.crm_client.get_campaign_statistics()
                state["tool_calls"].append({"tool": "get_campaign_statistics", "query": state["query"]})
                state["tool_results"].append({"tool": "get_campaign_statistics", "results": stats})

        elif "case" in query_lower or "support" in query_lower or "ticket" in query_lower or "sla" in query_lower:
            is_count_query = any(word in query_lower for word in ["how many", "count", "total", "all", "list", "show", "what", "check", "queue", "assignment", "overdue", "breach"])
            search_term = None if is_count_query else state["query"]
            results = await self.crm_client.search_cases(search_term, size=100)
            state["tool_calls"].append({"tool": "search_cases", "query": state["query"]})
            state["tool_results"].append({"tool": "search_cases", "results": results})

            if any(word in query_lower for word in ["stats", "statistics", "dashboard", "sla", "overdue", "breach", "summary"]):
                stats = await self.crm_client.get_case_statistics()
                state["tool_calls"].append({"tool": "get_case_statistics", "query": state["query"]})
                state["tool_results"].append({"tool": "get_case_statistics", "results": stats})

            if "queue" in query_lower or "assignment" in query_lower or "unassigned" in query_lower:
                queue = await self.crm_client.get_case_assignment_queue()
                state["tool_calls"].append({"tool": "get_case_assignment_queue", "query": state["query"]})
                state["tool_results"].append({"tool": "get_case_assignment_queue", "results": queue})

        elif "contract" in query_lower or "cpq" in query_lower or "renewal" in query_lower:
            is_count_query = any(word in query_lower for word in ["how many", "count", "total", "all", "list", "show", "what", "check", "renewal", "value"])
            search_term = None if is_count_query else state["query"]
            results = await self.crm_client.search_contracts(search_term, size=100)
            state["tool_calls"].append({"tool": "search_contracts", "query": state["query"]})
            state["tool_results"].append({"tool": "search_contracts", "results": results})

        elif "field service" in query_lower or "work order" in query_lower or "technician" in query_lower or "dispatch" in query_lower:
            is_count_query = any(word in query_lower for word in ["how many", "count", "total", "all", "list", "show", "what", "check", "dashboard", "urgent", "scheduled"])
            search_term = None if is_count_query else state["query"]
            results = await self.crm_client.search_work_orders(search_term, size=100)
            state["tool_calls"].append({"tool": "search_work_orders", "query": state["query"]})
            state["tool_results"].append({"tool": "search_work_orders", "results": results})

            if any(word in query_lower for word in ["stats", "statistics", "dashboard", "workload", "urgent", "scheduled"]):
                stats = await self.crm_client.get_work_order_statistics()
                state["tool_calls"].append({"tool": "get_work_order_statistics", "query": state["query"]})
                state["tool_results"].append({"tool": "get_work_order_statistics", "results": stats})

        elif "integration" in query_lower or "connector" in query_lower or "oauth" in query_lower or "erp" in query_lower or "quickbooks" in query_lower or "xero" in query_lower or "microsoft" in query_lower or "google" in query_lower:
            results = await self.crm_client.get_integrations()
            state["tool_calls"].append({"tool": "get_integrations", "query": state["query"]})
            state["tool_results"].append({"tool": "get_integrations", "results": results})

        elif "revenue ops" in query_lower or "quota" in query_lower or "territory" in query_lower or "attainment" in query_lower:
            results = await self.crm_client.get_revenue_ops_summary()
            state["tool_calls"].append({"tool": "get_revenue_ops_summary", "query": state["query"]})
            state["tool_results"].append({"tool": "get_revenue_ops_summary", "results": results})
        
        elif "lead" in query_lower:
            # For analytical/aggregate queries, don't pass the query as search term - fetch ALL leads
            is_analytical_query = any(word in query_lower for word in [
                "how many", "count", "total", "all", "list", "show", "what", "about",
                "performance", "analyze", "top", "best", "my"
            ])
            search_term = None if is_analytical_query else state["query"]
            results = await self.leads_mcp.search_leads(search_term, limit=100)
            state["tool_calls"].append({"tool": "search_leads", "query": state["query"]})
            state["tool_results"].append({"tool": "search_leads", "results": results})
        
        elif "deal" in query_lower or "pipeline" in query_lower or "opportunity" in query_lower or "performance" in query_lower or "forecast" in query_lower or "revenue" in query_lower or "sales" in query_lower or "owner" in query_lower or "risk" in query_lower or "attention" in query_lower:
            # For analytical/aggregate queries, don't pass the query as search term - fetch ALL deals
            is_analytical_query = any(word in query_lower for word in [
                "how many", "count", "total", "all", "list", "show", "what", "about",
                "performance", "forecast", "revenue", "analyze", "tracking", "goals",
                "top", "best", "my", "owner", "risk", "attention"
            ])
            search_term = None if is_analytical_query else state["query"]
            results = await self.deals_mcp.search_deals(search_term, limit=100)
            state["tool_calls"].append({"tool": "search_deals", "query": state["query"]})
            state["tool_results"].append({"tool": "search_deals", "results": results})
        
        elif "contact" in query_lower:
            # For analytical/aggregate queries, don't pass the query as search term - fetch ALL contacts
            is_analytical_query = any(word in query_lower for word in [
                "how many", "count", "total", "all", "list", "show", "what", "about",
                "performance", "analyze", "top", "best", "my"
            ])
            search_term = None if is_analytical_query else state["query"]
            results = await self.contacts_mcp.search_contacts(search_term, limit=100)
            state["tool_calls"].append({"tool": "search_contacts", "query": state["query"]})
            state["tool_results"].append({"tool": "search_contacts", "results": results})
        
        elif "dashboard" in query_lower or "stats" in query_lower or "overview" in query_lower:
            results = await self.crm_client.get_dashboard_stats()
            state["tool_calls"].append({"tool": "get_dashboard_stats", "query": state["query"]})
            state["tool_results"].append({"tool": "get_dashboard_stats", "results": results})
        
        else:
            # Fallback to global search
            results = await self.crm_client.global_search(state["query"])
            state["tool_calls"].append({"tool": "global_search", "query": state["query"]})
            state["tool_results"].append({"tool": "global_search", "results": results})
        
        return state
    
    async def _rag_search(self, state: AgentState) -> AgentState:
        """Perform RAG-based semantic search"""
        logger.info("Performing RAG search")
        
        query_lower = state["query"].lower()
        
        # Determine entity type for semantic search
        if "lead" in query_lower:
            entity_type = "lead"
        elif "deal" in query_lower or "pipeline" in query_lower:
            entity_type = "deal"
        elif "contact" in query_lower:
            entity_type = "contact"
        elif "company" in query_lower or "companies" in query_lower:
            entity_type = "company"
        elif "task" in query_lower:
            entity_type = "task"
        else:
            entity_type = "lead"
        
        # Perform semantic search
        results = await self.embedding_service.semantic_search(
            query=state["query"],
            entity_type=entity_type,
            limit=settings.TOP_K_RESULTS,
            tenant_id=(state.get("context") or {}).get("tenant_id")
        )
        
        state["sources"] = results
        
        return state
    
    def _summarize_data(self, data: list, data_type: str) -> str:
        """Summarize large data sets to avoid token limits"""
        if not data:
            return f"No {data_type} found"
        
        count = len(data)
        
        # For deals: show count, total value, stages
        if data_type == "deals":
            total = sum(float(d.get('value', d.get('amount', 0)) or 0) for d in data)
            stages = {}
            for d in data:
                stage = d.get('stage', 'UNKNOWN')
                stages[stage] = stages.get(stage, 0) + 1
            
            summary = f"{count} deals, ${total:,.0f} total value\n"
            summary += "By stage: " + ", ".join(f"{s}: {c}" for s, c in stages.items())
            
            # Add top 10 deals summary
            sorted_deals = sorted(
                data,
                key=lambda x: float(x.get('value', x.get('amount', 0)) or 0),
                reverse=True,
            )[:10]
            summary += "\n\nTop deals:\n"
            for d in sorted_deals:
                deal_name = d.get('name') or d.get('title') or 'Untitled'
                deal_value = float(d.get('value', d.get('amount', 0)) or 0)
                summary += (
                    f"- {deal_name}: ${deal_value:,.0f}, "
                    f"{d.get('stage', 'N/A')}, owner: {d.get('ownerName', 'N/A')}\n"
                )
            
            return summary
        
        # For leads: show count, status, top by value
        elif data_type == "leads":
            statuses = {}
            for l in data:
                status = l.get('status', 'UNKNOWN')
                statuses[status] = statuses.get(status, 0) + 1
            
            summary = f"{count} leads\n"
            summary += "By status: " + ", ".join(f"{s}: {c}" for s, c in statuses.items())
            
            # Add top 10 leads
            sorted_leads = sorted(data, key=lambda x: float(x.get('estimatedValue', 0) or 0), reverse=True)[:10]
            summary += "\n\nTop leads by value:\n"
            for l in sorted_leads:
                summary += f"- {l.get('firstName', '')} {l.get('lastName', '')} ({l.get('company', 'N/A')}): ${float(l.get('estimatedValue', 0)):,.0f}, {l.get('status', 'N/A')}\n"
            
            return summary
        
        # For contacts: show count, companies
        elif data_type == "contacts":
            companies = {}
            for c in data:
                company = c.get('companyName', 'No Company')
                companies[company] = companies.get(company, 0) + 1
            
            summary = f"{count} contacts\n"
            top_companies = sorted(companies.items(), key=lambda x: x[1], reverse=True)[:5]
            summary += "Top companies: " + ", ".join(f"{c}: {ct}" for c, ct in top_companies)
            
            return summary

        elif data_type == "campaigns":
            statuses = {}
            total_budget = 0.0
            total_expected = 0.0
            total_actual = 0.0
            for campaign in data:
                status = campaign.get("status", "UNKNOWN")
                statuses[status] = statuses.get(status, 0) + 1
                total_budget += float(campaign.get("budget", 0) or 0)
                total_expected += float(campaign.get("expectedRevenue", 0) or 0)
                total_actual += float(campaign.get("actualRevenue", 0) or 0)

            summary = (
                f"{count} campaigns, budget ${total_budget:,.0f}, "
                f"expected revenue ${total_expected:,.0f}, actual revenue ${total_actual:,.0f}\n"
            )
            summary += "By status: " + ", ".join(f"{s}: {c}" for s, c in statuses.items())
            summary += "\n\nTop campaigns:\n"
            for campaign in data[:10]:
                summary += (
                    f"- {campaign.get('name', 'Untitled')}: {campaign.get('status', 'N/A')}, "
                    f"channel: {campaign.get('channel', 'N/A')}, ROI: {campaign.get('roiPercent', 'N/A')}\n"
                )
            return summary

        elif data_type == "cases":
            statuses = {}
            priorities = {}
            breached = 0
            for case in data:
                status = case.get("status", "UNKNOWN")
                priority = case.get("priority", "UNKNOWN")
                statuses[status] = statuses.get(status, 0) + 1
                priorities[priority] = priorities.get(priority, 0) + 1
                if case.get("overdueResponse") or case.get("overdueResolution"):
                    breached += 1

            summary = f"{count} support cases, {breached} overdue or breached\n"
            summary += "By status: " + ", ".join(f"{s}: {c}" for s, c in statuses.items())
            summary += "\nBy priority: " + ", ".join(f"{p}: {c}" for p, c in priorities.items())
            summary += "\n\nKey cases:\n"
            for case in data[:10]:
                summary += (
                    f"- {case.get('caseNumber', 'Case')}: {case.get('title', 'Untitled')}, "
                    f"{case.get('status', 'N/A')}, {case.get('priority', 'N/A')}, owner: {case.get('ownerName', 'Unassigned')}\n"
                )
            return summary

        elif data_type == "contracts":
            statuses = {}
            total_value = 0.0
            for contract in data:
                status = contract.get("status", "UNKNOWN")
                statuses[status] = statuses.get(status, 0) + 1
                total_value += float(contract.get("contractValue", 0) or 0)

            summary = f"{count} contracts, ${total_value:,.0f} total contract value\n"
            summary += "By status: " + ", ".join(f"{s}: {c}" for s, c in statuses.items())
            summary += "\n\nKey contracts:\n"
            sorted_contracts = sorted(data, key=lambda x: float(x.get("contractValue", 0) or 0), reverse=True)[:10]
            for contract in sorted_contracts:
                summary += (
                    f"- {contract.get('contractNumber', 'Contract')}: {contract.get('title', 'Untitled')}, "
                    f"${float(contract.get('contractValue', 0) or 0):,.0f}, {contract.get('status', 'N/A')}, "
                    f"renewal: {contract.get('renewalDate', 'N/A')}\n"
                )
            return summary

        elif data_type == "work_orders":
            statuses = {}
            priorities = {}
            for work_order in data:
                status = work_order.get("status", "UNKNOWN")
                priority = work_order.get("priority", "UNKNOWN")
                statuses[status] = statuses.get(status, 0) + 1
                priorities[priority] = priorities.get(priority, 0) + 1

            summary = f"{count} field service work orders\n"
            summary += "By status: " + ", ".join(f"{s}: {c}" for s, c in statuses.items())
            summary += "\nBy priority: " + ", ".join(f"{p}: {c}" for p, c in priorities.items())
            summary += "\n\nKey work orders:\n"
            for work_order in data[:10]:
                summary += (
                    f"- {work_order.get('orderNumber', 'Work order')}: {work_order.get('title', 'Untitled')}, "
                    f"{work_order.get('status', 'N/A')}, technician: {work_order.get('assignedTechnicianName', 'Unassigned')}\n"
                )
            return summary

        elif data_type == "integrations":
            statuses = {}
            connected = 0
            failed = 0
            for integration in data:
                status = integration.get("status", "UNKNOWN")
                statuses[status] = statuses.get(status, 0) + 1
                if integration.get("connected"):
                    connected += 1
                if integration.get("lastSyncSucceeded") is False or integration.get("lastValidationSucceeded") is False:
                    failed += 1

            summary = f"{count} integrations, {connected} connected, {failed} needing attention\n"
            summary += "By status: " + ", ".join(f"{s}: {c}" for s, c in statuses.items())
            summary += "\n\nIntegration status:\n"
            for integration in data[:12]:
                summary += (
                    f"- {integration.get('name', integration.get('key', 'Integration'))}: "
                    f"{integration.get('status', 'N/A')}, connected: {bool(integration.get('connected'))}, "
                    f"last sync: {integration.get('lastSyncedAt', 'N/A')}\n"
                )
            return summary
        
        # Default: just count
        return f"{count} {data_type}"

    def _build_direct_fallback_response(self, query: str) -> str:
        """Return a deterministic response when the LLM is unavailable."""
        query_lower = query.lower().strip()

        if any(greeting in query_lower for greeting in ["hi", "hello", "hey"]):
            return "Hi! I can help with CRM data like leads, deals, contacts, tasks, forecasts, and reports."

        if any(word in query_lower for word in ["help", "what can you do"]):
            return (
                "I can summarize CRM data, look up leads, deals, contacts, tasks, documents, "
                "emails, quotes, invoices, and give simple pipeline overviews from live data."
            )

        return (
            "I couldn't reach the AI provider just now, but CRM data tools are still available. "
            "Ask about leads, deals, contacts, tasks, documents, or pipeline performance and I can answer from live records."
        )

    def _build_tool_fallback_response(self, state: AgentState) -> str:
        """Build a useful deterministic response from tool results without the LLM."""
        if not state.get("tool_results"):
            return self._build_direct_fallback_response(state.get("query", ""))

        lines: List[str] = []
        query_lower = state.get("query", "").lower()

        for result in state["tool_results"]:
            tool_name = result.get("tool", "")
            data = result.get("results")

            if tool_name == "get_dashboard_stats" and isinstance(data, dict):
                total_leads = data.get("totalLeads", data.get("leads", 0))
                total_deals = data.get("totalDeals", data.get("deals", 0))
                pipeline_value = data.get("pipelineValue", data.get("totalPipelineValue", 0))
                lines.append(
                    f"Dashboard snapshot: {total_leads} leads, {total_deals} deals, pipeline value {self._format_currency(pipeline_value)}."
                )
                continue

            if tool_name == "get_revenue_ops_summary" and isinstance(data, dict):
                lines.append(
                    "Revenue ops snapshot: "
                    f"{data.get('activeRepCount', 0)} active reps, "
                    f"{data.get('territoriesCovered', 0)} territories, "
                    f"{self._format_currency(data.get('closedWonValue', 0))} closed won, "
                    f"{data.get('attainmentPercent', 0)}% attainment."
                )
                continue

            if tool_name in {"get_campaign_statistics", "get_case_statistics", "get_case_assignment_queue", "get_work_order_statistics"} and isinstance(data, dict):
                lines.append(f"{tool_name.replace('_', ' ').title()}: {self._summarize_dict(data)}")
                continue

            if tool_name == "global_search" and isinstance(data, dict):
                counts = [
                    f"{entity}: {len(items)}"
                    for entity, items in data.items()
                    if isinstance(items, list) and items
                ]
                if counts:
                    lines.append("I found matching records across " + ", ".join(counts) + ".")
                else:
                    lines.append("I couldn't find matching CRM records for that search.")
                continue

            if not isinstance(data, list):
                continue

            if tool_name == "search_deals":
                total_value = sum(float(deal.get("value", 0) or 0) for deal in data)
                stage_counts: Dict[str, int] = {}
                for deal in data:
                    stage = deal.get("stage", "UNKNOWN")
                    stage_counts[stage] = stage_counts.get(stage, 0) + 1
                stage_summary = ", ".join(f"{stage}: {count}" for stage, count in sorted(stage_counts.items()))
                lines.append(
                    f"I found {len(data)} deals worth {self._format_currency(total_value)} in total."
                    + (f" Stage mix: {stage_summary}." if stage_summary else "")
                )
                continue

            if tool_name == "search_leads":
                status_counts: Dict[str, int] = {}
                for lead in data:
                    status = lead.get("status", "UNKNOWN")
                    status_counts[status] = status_counts.get(status, 0) + 1
                status_summary = ", ".join(f"{status}: {count}" for status, count in sorted(status_counts.items()))
                lines.append(
                    f"I found {len(data)} leads."
                    + (f" By status: {status_summary}." if status_summary else "")
                )
                continue

            if tool_name == "search_contacts":
                lines.append(f"I found {len(data)} contacts.")
                continue

            if tool_name == "get_companies":
                lines.append(f"I found {len(data)} companies.")
                continue

            if tool_name == "search_campaigns":
                lines.append(self._summarize_data(data, "campaigns"))
                continue

            if tool_name == "search_cases":
                lines.append(self._summarize_data(data, "cases"))
                continue

            if tool_name == "search_contracts":
                lines.append(self._summarize_data(data, "contracts"))
                continue

            if tool_name == "search_work_orders":
                lines.append(self._summarize_data(data, "work_orders"))
                continue

            if tool_name == "get_integrations":
                lines.append(self._summarize_data(data, "integrations"))
                continue

            if tool_name.startswith("search_"):
                entity = tool_name.replace("search_", "").replace("_", " ")
                lines.append(f"I found {len(data)} {entity}.")

        if not lines:
            return self._build_direct_fallback_response(state.get("query", ""))

        if "forecast" in query_lower or "pipeline" in query_lower:
            lines.append("The AI provider is currently unavailable, so this summary is based on live CRM records and rule-based calculations.")

        return "\n".join(lines)

    @staticmethod
    def _summarize_dict(data: Dict[str, Any]) -> str:
        """Compact dictionary-shaped dashboards for the synthesis prompt."""
        if not data:
            return "No dashboard data returned"

        simple_items = []
        for key, value in data.items():
            if isinstance(value, (str, int, float, bool)) or value is None:
                simple_items.append(f"{key}: {value}")
        if simple_items:
            return "\n".join(simple_items[:30])
        return json.dumps(data, default=str)[:2500]

    def _build_synthesis_messages(self, state: AgentState) -> List[Any]:
        """Build the final response prompt shared by normal and streamed chat."""
        context_parts = []

        if state["tool_results"]:
            context_parts.append("Data I found:")
            for result in state["tool_results"]:
                tool_name = result["tool"]
                data = result["results"]

                if "deal" in tool_name:
                    summary = self._summarize_data(data, "deals")
                elif "lead" in tool_name:
                    summary = self._summarize_data(data, "leads")
                elif "contact" in tool_name:
                    summary = self._summarize_data(data, "contacts")
                elif "campaign" in tool_name and isinstance(data, list):
                    summary = self._summarize_data(data, "campaigns")
                elif "case" in tool_name and isinstance(data, list):
                    summary = self._summarize_data(data, "cases")
                elif "contract" in tool_name and isinstance(data, list):
                    summary = self._summarize_data(data, "contracts")
                elif "work_order" in tool_name and isinstance(data, list):
                    summary = self._summarize_data(data, "work_orders")
                elif tool_name == "global_search" and isinstance(data, dict):
                    parts = []
                    for entity_name, entity_results in data.items():
                        if isinstance(entity_results, list) and entity_results:
                            parts.append(f"{entity_name}: {len(entity_results)}")
                    summary = ", ".join(parts) if parts else "No matching CRM records found"
                elif "integration" in tool_name and isinstance(data, list):
                    summary = self._summarize_data(data, "integrations")
                elif isinstance(data, dict):
                    summary = self._summarize_dict(data)
                else:
                    summary = f"{len(data) if isinstance(data, list) else 1} items"

                context_parts.append(f"\n{tool_name}:\n{summary}")

        if state["sources"]:
            context_parts.append("\nRelated CRM info:")
            for source in state["sources"]:
                context_parts.append(f"- {source}")

        context_str = "\n".join(context_parts)
        history = state.get("history") or []
        recent_history = history[-6:]
        history_str = "\n".join(
            f"{message.get('role', 'message')}: {message.get('content', '')}"
            for message in recent_history
            if isinstance(message, dict) and message.get("content")
        )

        system_prompt = """You're a smart, personable CRM assistant - think colleague, not robot!

YOUR PERSONALITY:
- Be warm & conversational ("Hey!", "Sure thing!", "Got it!")
- Handle greetings naturally ("Hi! What can I help with today?")
- Show enthusiasm ("Great question!", "Nice!")
- It's fine to chat briefly before diving into work

YOUR SUPERPOWERS:
- ONLY use data from Context below (NEVER make up data)
- DO MATH: calculate totals, averages, win rates, group by owner
- ANALYZE: find patterns, spot risks, identify opportunities
- AGGREGATE: count by status, sum by stage, compare reps
- If Context is empty: "I don't have that data - want to add some?"

WHAT YOU CAN DO:
- Analyze deals & forecast revenue (calculate from deal amounts/probabilities)
- Compare performance (group deals by owner, sum amounts)
- Manage contacts & suggest actions
- Review campaigns, cases, contracts, field service, integrations, and revenue ops from live CRM data
- Calculate totals, rates, percentages
- Find patterns & trends

WHAT YOU CAN'T DO:
- Anything non-CRM (coding, general knowledge, etc.)
- Say: "I'm all about CRM! How can I help with deals or contacts?"

HOW TO RESPOND:

**Greetings:**
User: "hey"
You: "Hey! How can I help today?"

**Performance (DO THE MATH):**
User: "Who are my best sales reps?"
You: Count & sum deals by owner from Context:
"Looking at your deals data...

**Top Performers**
1. **Sarah** - $450K closed (3 deals)
2. **Mike** - $380K closed (5 deals)

Sarah's crushing it. Want to see what's working?"

**Forecast (CALCULATE):**
User: "What's my revenue forecast?"
You: Sum deals by probability/stage:
"Crunching your pipeline...

**This Quarter**
- **High confidence:** $680K (5 deals at 80%+)
- **Total potential:** $1.1M

3 deals are closing this month. Need help prioritizing?"

FORMATTING:
- Use short Markdown sections when the answer has multiple parts.
- Use numbered Markdown lists (`1.`, `2.`, `3.`) for ranked, top, best, worst, priority, or step-by-step answers.
- Use bullets only for unordered risks, observations, and recommendations.
- Put every list item on its own line with a blank line before and after the list.
- Bold the important deal names, owner names, totals, and risk labels.
- Keep paragraphs short; avoid dense inline lists.
- Never use inline asterisk bullets inside one paragraph.
- NO EMOJIS - use text labels like (URGENT) or (Hot).

ALWAYS:
- Be conversational, not robotic
- Do calculations (totals, averages, rates)
- Give insights, not data dumps
- Suggest next actions
- Stay in CRM lane"""

        return [
            SystemMessage(content=system_prompt),
            HumanMessage(
                content=(
                    f"Recent conversation:\n{history_str or 'None'}\n\n"
                    f"Live CRM context:\n{context_str or 'None'}\n\n"
                    f"User asked: {state['query']}\n\n"
                    "Respond naturally using live CRM context first. If this is a follow-up, use the recent conversation to understand what 'this/that/they' refers to."
                )
            )
        ]

    @staticmethod
    def _chunk_content_to_text(content: Any) -> str:
        """Normalize streamed LLM chunks to plain text."""
        if content is None:
            return ""
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            parts = []
            for item in content:
                if isinstance(item, str):
                    parts.append(item)
                elif isinstance(item, dict):
                    parts.append(str(item.get("text") or item.get("content") or ""))
            return "".join(parts)
        return str(content)

    async def _stream_synthesized_response(self, state: AgentState):
        """Stream the final response directly from the provider."""
        messages = self._build_synthesis_messages(state)
        saw_usage_metadata = False
        async for chunk in self.llm.astream(messages):
            chunk_usage = getattr(chunk, "usage_metadata", None) or {}
            if chunk_usage and not saw_usage_metadata:
                self._record_llm_usage(state, "response_stream", chunk)
                saw_usage_metadata = True
            token = self._chunk_content_to_text(getattr(chunk, "content", ""))
            if token:
                yield token
    
    async def _synthesize_response(self, state: AgentState) -> AgentState:
        """Synthesize final response from tool results and RAG sources"""
        logger.info("Synthesizing response")

        messages = self._build_synthesis_messages(state)

        try:
            response = await self.llm.ainvoke(messages)
            self._record_llm_usage(state, "response_synthesis", response)
            state["final_response"] = response.content
        except Exception as error:
            if self._is_llm_unavailable_error(error):
                logger.warning("LLM unavailable during response synthesis, using deterministic fallback")
                self._record_provider_error(state, "response_synthesis", error, fallback_used=True)
                state["final_response"] = self._build_tool_fallback_response(state)
                state["degraded_mode"] = True
                state["degraded_reason"] = "AI provider unavailable; showing live CRM results with rule-based summaries."
            else:
                self._record_provider_error(state, "response_synthesis", error, fallback_used=False)
                raise

        return state
        
        # Build context from tool results with smart summarization to avoid token limits
        context_parts = []
        
        if state["tool_results"]:
            context_parts.append("Data I found:")
            for result in state["tool_results"]:
                tool_name = result['tool']
                data = result['results']
                
                # Extract data type from tool name
                if 'deal' in tool_name:
                    summary = self._summarize_data(data, 'deals')
                elif 'lead' in tool_name:
                    summary = self._summarize_data(data, 'leads')
                elif 'contact' in tool_name:
                    summary = self._summarize_data(data, 'contacts')
                elif tool_name == 'global_search' and isinstance(data, dict):
                    parts = []
                    for entity_name, entity_results in data.items():
                        if isinstance(entity_results, list) and entity_results:
                            parts.append(f"{entity_name}: {len(entity_results)}")
                    summary = ", ".join(parts) if parts else "No matching CRM records found"
                else:
                    # For other types, limit to first 20 items
                    summary = f"{len(data) if isinstance(data, list) else 1} items"
                
                context_parts.append(f"\n{tool_name}:\n{summary}")
        
        if state["sources"]:
            context_parts.append("\nRelated CRM info:")
            for source in state["sources"]:
                context_parts.append(f"- {source}")
        
        context_str = "\n".join(context_parts)
        history = state.get("history") or []
        recent_history = history[-6:]
        history_str = "\n".join(
            f"{message.get('role', 'message')}: {message.get('content', '')}"
            for message in recent_history
            if isinstance(message, dict) and message.get("content")
        )
        
        system_prompt = """You're a smart, personable CRM assistant - think colleague, not robot!

YOUR PERSONALITY:
- Be warm & conversational ("Hey!", "Sure thing!", "Got it!")
- Handle greetings naturally ("Hi! What can I help with today?")
- Show enthusiasm ("Great question!", "Nice!")
- It's fine to chat briefly before diving into work

YOUR SUPERPOWERS:
- ONLY use data from Context below (NEVER make up data)
- DO MATH: calculate totals, averages, win rates, group by owner
- ANALYZE: find patterns, spot risks, identify opportunities
- AGGREGATE: count by status, sum by stage, compare reps
- If Context is empty: "I don't have that data - want to add some?"

WHAT YOU CAN DO:
✅ Analyze deals & forecast revenue (calculate from deal amounts/probabilities)
✅ Compare performance (group deals by owner, sum amounts)
✅ Manage contacts & suggest actions
✅ Calculate totals, rates, percentages
✅ Find patterns & trends

WHAT YOU CAN'T DO:
❌ Anything non-CRM (coding, general knowledge, etc.)
→ Say: "I'm all about CRM! How can I help with deals or contacts?"

HOW TO RESPOND:

**Greetings:**
User: "hey"
You: "Hey! How can I help today?"

**Performance (DO THE MATH):**
User: "Who are my best sales reps?"
You: Count & sum deals by owner from Context:
"Looking at your deals data...

**Top Performers:**
1. Sarah - $450K closed (3 deals)
2. Mike - $380K closed (5 deals)

Sarah's crushing it! Want to see what's working?"

**Forecast (CALCULATE):**
User: "What's my revenue forecast?"
You: Sum deals by probability/stage:
"Crunching your pipeline...

**This Quarter:**
- High confidence: $680K (5 deals at 80%+)
- Total potential: $1.1M

3 deals closing this month. Need help prioritizing?"

FORMATTING:
- **bold** for key numbers/names
- Bullet points (•) for lists
- Use real Markdown lists with each bullet on its own line
- Never use inline asterisk bullets inside one paragraph
- NO EMOJIS - use text (URGENT), (Hot)

ALWAYS:
- Be conversational, not robotic
- Do calculations (totals, averages, rates)
- Give insights, not data dumps
- Suggest next actions
- Stay in CRM lane"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(
                content=(
                    f"Recent conversation:\n{history_str or 'None'}\n\n"
                    f"Live CRM context:\n{context_str or 'None'}\n\n"
                    f"User asked: {state['query']}\n\n"
                    "Respond naturally using live CRM context first. If this is a follow-up, use the recent conversation to understand what 'this/that/they' refers to."
                )
            )
        ]
        
        try:
            response = await self.llm.ainvoke(messages)
            self._record_llm_usage(state, "response_synthesis", response)
            state["final_response"] = response.content
        except Exception as error:
            if self._is_llm_unavailable_error(error):
                logger.warning("LLM unavailable during response synthesis, using deterministic fallback")
                self._record_provider_error(state, "response_synthesis", error, fallback_used=True)
                state["final_response"] = self._build_tool_fallback_response(state)
                state["degraded_mode"] = True
                state["degraded_reason"] = "AI provider unavailable; showing live CRM results with rule-based summaries."
            else:
                self._record_provider_error(state, "response_synthesis", error, fallback_used=False)
                raise
        
        return state
    
    def get_available_tools(self) -> List[Dict[str, str]]:
        """Get list of available MCP tools"""
        return [
            {"name": "search_leads", "description": "Search for leads in CRM"},
            {"name": "get_lead_details", "description": "Get detailed information about a lead"},
            {"name": "create_lead", "description": "Create a new lead"},
            {"name": "search_deals", "description": "Search for deals in CRM"},
            {"name": "get_deal_details", "description": "Get detailed information about a deal"},
            {"name": "get_pipeline_metrics", "description": "Get pipeline metrics and statistics"},
            {"name": "search_contacts", "description": "Search for contacts in CRM"},
            {"name": "get_contact_details", "description": "Get detailed information about a contact"},
            {"name": "search_campaigns", "description": "Search marketing campaigns and performance data"},
            {"name": "search_cases", "description": "Search support cases and SLA state"},
            {"name": "search_contracts", "description": "Search contracts and renewals"},
            {"name": "search_work_orders", "description": "Search field service work orders"},
            {"name": "get_integrations", "description": "Get workspace integration connection status"},
            {"name": "get_revenue_ops_summary", "description": "Get revenue operations and quota summary"},
            {"name": "semantic_search", "description": "Semantic search across CRM entities using embeddings"}
        ]
