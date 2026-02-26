from typing import List, Dict, Any, Optional
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
import logging

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
        
        # Set user token on CRM client for authenticated requests
        if user_token:
            self.crm_client.set_user_token(user_token)
            context = context or {}
            context['user_token'] = user_token
        
        initial_state = AgentState(
            query=query,
            history=history or [],
            context=context or {},
            thought="",
            tool_calls=[],
            tool_results=[],
            final_response="",
            sources=[]
        )
        
        # Run workflow
        final_state = await self.workflow.ainvoke(initial_state)
        
        return {
            "message": final_state["final_response"],
            "tool_calls": final_state["tool_calls"],
            "sources": final_state["sources"]
        }
    
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
        
        # Set user token on CRM client
        if user_token:
            self.crm_client.set_user_token(user_token)
            context = context or {}
            context['user_token'] = user_token
        
        initial_state = AgentState(
            query=query,
            history=history or [],
            context=context or {},
            thought="",
            tool_calls=[],
            tool_results=[],
            final_response="",
            sources=[]
        )
        
        # Run understanding step
        state = await self._understand_intent(initial_state)
        state = await self._plan_actions(state)
        
        strategy = self._should_use_tools(state)
        
        # Execute tools with streaming notifications
        if strategy == "tools":
            for tool_call in state["tool_calls"]:
                # Notify tool start with friendly name
                yield {
                    "type": "tool_start",
                    "tool": tool_call["tool"],
                    "display_name": self._get_tool_display_name(tool_call["tool"], tool_call.get("query", "")),
                    "query": tool_call.get("query", "")
                }
            
            state = await self._execute_tools(state)
            
            for tool_call in state["tool_calls"]:
                # Notify tool end
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
        
        # Synthesize response with token streaming
        state = await self._synthesize_response(state)
        
        # Stream tokens
        response_text = state["final_response"]
        words = response_text.split()
        
        for i, word in enumerate(words):
            token = word + (" " if i < len(words) - 1 else "")
            yield {
                "type": "token",
                "content": token
            }
        
        # Final event
        yield {
            "type": "done",
            "message": response_text,
            "tool_calls": state["tool_calls"],
            "sources": state["sources"]
        }
    
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
2. Which CRM data do they need? (leads, deals, contacts, companies, tasks, invoices, quotes, products, events, documents, emails)
3. What action should I take? (search, create, update, analyze, count, calculate)
4. Any specific filters or conditions they mentioned?

Keep it brief and natural - you're chatting with a colleague, not writing documentation."""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Query: {state['query']}")
        ]
        
        response = await self.llm.ainvoke(messages)
        state["thought"] = response.content
        
        return state
    
    async def _plan_actions(self, state: AgentState) -> AgentState:
        """Plan which tools or approach to use"""
        logger.info("Planning actions")
        
        query_lower = state["query"].lower()
        
        # CRM entity keywords - if ANY of these are mentioned, MUST use tools
        # Use fuzzy matching to handle typos (e.g., "conctacts" -> "contacts")
        entity_keywords = [
            "lead", "deal", "contact", "company", "pipeline", "opportunity",
            "task", "invoice", "quote", "product", "event", "meeting",
            "document", "email", "calendar", "customer", "client",
            "performance", "team", "forecast", "revenue", "sales", "rep",
            "quota", "target", "goal", "win rate", "closed", "pipeline"
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
        
        query_lower = state["query"].lower()
        
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
            
            messages = [{"role": "user", "content": extraction_prompt}]
            extraction_response = await self.llm.ainvoke(messages)
            
            try:
                import json
                lead_data = json.loads(extraction_response.content.strip())
                result = await self.leads_mcp.create_lead(lead_data)
                
                state["tool_calls"].append({"tool": "create_lead", "data": lead_data})
                state["tool_results"].append({"tool": "create_lead", "results": result})
                return state
            except Exception as e:
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
        
        elif "deal" in query_lower or "pipeline" in query_lower or "opportunity" in query_lower or "performance" in query_lower or "forecast" in query_lower or "revenue" in query_lower or "sales" in query_lower:
            # For analytical/aggregate queries, don't pass the query as search term - fetch ALL deals
            is_analytical_query = any(word in query_lower for word in [
                "how many", "count", "total", "all", "list", "show", "what", "about",
                "performance", "forecast", "revenue", "analyze", "tracking", "goals",
                "top", "best", "my"
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
            limit=settings.TOP_K_RESULTS
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
            total = sum(float(d.get('amount', 0) or 0) for d in data)
            stages = {}
            for d in data:
                stage = d.get('stage', 'UNKNOWN')
                stages[stage] = stages.get(stage, 0) + 1
            
            summary = f"{count} deals, ${total:,.0f} total value\n"
            summary += "By stage: " + ", ".join(f"{s}: {c}" for s, c in stages.items())
            
            # Add top 10 deals summary
            sorted_deals = sorted(data, key=lambda x: float(x.get('amount', 0) or 0), reverse=True)[:10]
            summary += "\n\nTop deals:\n"
            for d in sorted_deals:
                summary += f"- {d.get('title', 'Untitled')}: ${float(d.get('amount', 0)):,.0f}, {d.get('stage', 'N/A')}, owner: {d.get('ownerName', 'N/A')}\n"
            
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
        
        # Default: just count
        return f"{count} {data_type}"
    
    async def _synthesize_response(self, state: AgentState) -> AgentState:
        """Synthesize final response from tool results and RAG sources"""
        logger.info("Synthesizing response")
        
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
                else:
                    # For other types, limit to first 20 items
                    summary = f"{len(data) if isinstance(data, list) else 1} items"
                
                context_parts.append(f"\n{tool_name}:\n{summary}")
        
        if state["sources"]:
            context_parts.append("\nRelated CRM info:")
            for source in state["sources"]:
                context_parts.append(f"- {source}")
        
        context_str = "\n".join(context_parts)
        
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
- NO EMOJIS - use text (URGENT), (Hot)

ALWAYS:
- Be conversational, not robotic
- Do calculations (totals, averages, rates)
- Give insights, not data dumps
- Suggest next actions
- Stay in CRM lane"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Context:\n{context_str}\n\nUser asked: {state['query']}\n\nRespond naturally:")
        ]
        
        response = await self.llm.ainvoke(messages)
        state["final_response"] = response.content
        
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
            {"name": "semantic_search", "description": "Semantic search across CRM entities using embeddings"}
        ]
