# 🤖 AI Service Architecture & Integration Guide

> **Complete technical guide to the AI service layer, LangGraph workflows, and Spring Boot backend integration**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Communication Flow](#communication-flow)
4. [File Structure & Responsibilities](#file-structure--responsibilities)
5. [LangGraph Agents](#langgraph-agents)
6. [MCP Tools](#mcp-tools)
7. [RAG Implementation](#rag-implementation)
8. [Backend Integration](#backend-integration)
9. [Authentication Flow](#authentication-flow)
10. [Request/Response Examples](#requestresponse-examples)
11. [Adding New Features](#adding-new-features)

---

## 🎯 Overview

The AI Service is a **Python FastAPI microservice** that provides intelligent CRM capabilities using:
- **LangGraph**: Workflow orchestration for multi-step AI reasoning
- **Groq LLM**: Fast inference with Llama 3.3 70B model
- **MCP (Model Context Protocol)**: Standardized tool interface for AI agents
- **RAG (Retrieval Augmented Generation)**: Semantic search with pgvector
- **Sentence Transformers**: Local embeddings for semantic understanding

### Key Capabilities

1. **Conversational AI**: Natural language queries about CRM data
2. **Report Generation**: Custom reports with meeting/sales analysis
3. **Lead Scoring**: Autonomous lead quality assessment
4. **Sales Forecasting**: Predictive analytics for pipeline
5. **Semantic Search**: Vector-based document and contact search

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│                    http://localhost:5173                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ REST API Calls
                         │ (JWT Token in Headers)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AI SERVICE (FastAPI)                         │
│                    http://localhost:8000                         │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐│
│  │  main.py (FastAPI App)                                      ││
│  │  - POST /chat          → CRM Agent (streaming SSE)          ││
│  │  - POST /reports/generate → Report Agent                    ││
│  │  - POST /search/semantic  → Vector Search                   ││
│  │  - GET  /health        → Health Check                       ││
│  └────────────────────────────────────────────────────────────┘│
│                         │                                        │
│         ┌───────────────┼───────────────┐                       │
│         ▼               ▼               ▼                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │   Agents    │ │  MCP Tools  │ │  RAG/Vector │              │
│  │  (LangGraph)│ │  (CRM API)  │ │   Search    │              │
│  └─────────────┘ └─────────────┘ └─────────────┘              │
│         │               │               │                       │
└─────────┼───────────────┼───────────────┼───────────────────────┘
          │               │               │
          │               │               │
          │               ▼               ▼
          │        ┌────────────────────────────┐
          │        │  SPRING BOOT BACKEND       │
          │        │  http://localhost:8080     │
          │        │                            │
          │        │  REST API Endpoints:       │
          │        │  - /api/v1/leads          │
          │        │  - /api/v1/deals          │
          │        │  - /api/v1/contacts       │
          │        │  - /api/v1/events         │
          │        │  - /api/v1/companies      │
          │        │  - /api/v1/tasks          │
          │        │  - ... (all CRM entities) │
          │        └────────────────────────────┘
          │                     │
          │                     ▼
          │              ┌──────────────┐
          │              │ PostgreSQL   │
          │              │ + pgvector   │
          │              │              │
          │              │ - CRM Tables │
          └──────────────│ - Vectors    │
                         └──────────────┘
```

---

## 🔄 Communication Flow

### 1. Chat Request Flow

```
Frontend (React)
    │
    │ POST /chat
    │ Headers: { Authorization: Bearer <jwt_token> }
    │ Body: { messages: [...], context: {...} }
    ▼
AI Service (FastAPI)
    │
    ├─→ Validate JWT token
    │
    ├─→ Initialize CRM Agent (LangGraph)
    │     │
    │     ├─→ Parse user query
    │     │
    │     ├─→ Determine required tools (MCP)
    │     │
    │     ├─→ Execute tools (call Spring Boot API)
    │     │     │
    │     │     └─→ Spring Boot Backend
    │     │           │
    │     │           ├─→ Validate JWT
    │     │           ├─→ Check permissions
    │     │           ├─→ Query PostgreSQL
    │     │           └─→ Return data
    │     │
    │     ├─→ Process data with LLM
    │     │
    │     └─→ Generate response
    │
    └─→ Stream response via SSE
          │
          ▼
Frontend (React)
    │
    └─→ Display in chat UI (streaming)
```

### 2. Report Generation Flow

```
Frontend (Reports Page)
    │
    │ POST /reports/generate
    │ Body: { report_type: "custom", custom_query: "meeting reports" }
    ▼
AI Service (Report Agent)
    │
    ├─→ Parse query (detect "meeting" keywords)
    │
    ├─→ collect_data node
    │     │
    │     └─→ Spring Boot API calls:
    │           - GET /api/v1/events?limit=1000
    │           - GET /api/v1/deals?limit=1000
    │           - GET /api/v1/leads?limit=1000
    │           - GET /api/v1/contacts?limit=500
    │
    ├─→ calculate_metrics node
    │     │
    │     └─→ Process data:
    │           - Count events by type/location
    │           - Calculate upcoming vs past
    │           - Analyze meeting patterns
    │
    ├─→ generate_charts node
    │     │
    │     └─→ Create chart configs:
    │           - Events by Type (pie)
    │           - Events Timeline (bar)
    │           - Events by Location (bar)
    │
    ├─→ analyze_insights node
    │     │
    │     └─→ LLM generates:
    │           - 5 key insights
    │           - 5 recommendations
    │
    ├─→ create_report node
    │     │
    │     └─→ LLM generates:
    │           - Title
    │           - Executive summary
    │           - Full report content
    │
    └─→ Return complete report JSON
          │
          ▼
Frontend (Reports Page)
    │
    └─→ Display report with charts
```

---

## 📁 File Structure & Responsibilities

### AI Service Directory Structure

```
ai-service/
├── app/
│   ├── main.py                          # FastAPI application entry
│   ├── config.py                        # Configuration settings
│   ├── dependencies.py                  # FastAPI dependencies
│   │
│   ├── agents/                          # LangGraph AI Agents
│   │   ├── __init__.py
│   │   ├── crm_agent.py                # Main conversational agent
│   │   ├── report_agent.py             # Report generation agent
│   │   ├── lead_scoring_agent.py       # Lead quality assessment
│   │   ├── forecasting_agent.py        # Sales forecasting
│   │   └── autonomous_lead_scorer.py   # Background lead scoring
│   │
│   ├── mcp/                             # Model Context Protocol Tools
│   │   ├── __init__.py
│   │   ├── leads_mcp.py                # Lead management tools
│   │   ├── deals_mcp.py                # Deal management tools
│   │   └── contacts_mcp.py             # Contact management tools
│   │
│   ├── rag/                             # Retrieval Augmented Generation
│   │   ├── __init__.py
│   │   ├── embeddings.py               # Sentence transformer embeddings
│   │   └── vector_store.py             # Pgvector integration
│   │
│   └── services/                        # Services
│       ├── __init__.py
│       ├── crm_client.py               # Spring Boot API client
│       └── autonomous_forecasting_service.py
│
├── requirements.txt                     # Python dependencies
├── Dockerfile                           # Docker image
└── README.md                            # Documentation
```

---

## 🎯 Key Files Explained

### 1. `main.py` - FastAPI Application

**Purpose**: Main entry point, defines API endpoints

**Key Endpoints**:
```python
@app.post("/chat")
async def chat(request: ChatRequest, user_token: str = Depends(get_user_token)):
    """Conversational AI endpoint with streaming SSE"""
    # Initializes CRM Agent
    # Streams responses back to frontend
    
@app.post("/reports/generate")
async def generate_report(request: ReportRequest, user_token: str = Depends(get_user_token)):
    """Report generation endpoint"""
    # Initializes Report Agent
    # Returns complete report JSON

@app.post("/search/semantic")
async def semantic_search(query: str, entity_type: str, limit: int = 10):
    """Vector-based semantic search"""
    # Uses sentence transformers
    # Queries pgvector for similar documents
```

**Dependencies**:
- FastAPI for web framework
- Pydantic for request validation
- asyncio for async operations
- SSE (Server-Sent Events) for streaming

---

### 2. `agents/crm_agent.py` - Main Conversational Agent

**Purpose**: Handle natural language CRM queries using LangGraph

**Architecture**:
```python
from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq

class CRMAgent:
    def __init__(self):
        # Initialize LLM
        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            groq_api_key=GROQ_API_KEY
        )
        
        # Build workflow
        self.workflow = self._build_workflow()
    
    def _build_workflow(self) -> StateGraph:
        """Build LangGraph workflow"""
        workflow = StateGraph(AgentState)
        
        # Add nodes
        workflow.add_node("parse_query", self._parse_query)
        workflow.add_node("fetch_data", self._fetch_data)
        workflow.add_node("process_response", self._process_response)
        
        # Define edges
        workflow.set_entry_point("parse_query")
        workflow.add_edge("parse_query", "fetch_data")
        workflow.add_edge("fetch_data", "process_response")
        workflow.add_edge("process_response", END)
        
        return workflow.compile()
```

**Key Methods**:
- `_parse_query()`: Analyzes user intent
- `_fetch_data()`: Calls MCP tools to get CRM data
- `_process_response()`: Formats response with LLM

**Connects To**:
- `services/crm_client.py`: For API calls
- `mcp/*.py`: For tool invocation
- Groq API: For LLM inference

---

### 3. `agents/report_agent.py` - Report Generation Agent

**Purpose**: Generate custom reports with AI insights

**LangGraph Workflow**:
```python
workflow = StateGraph(ReportState)

# Add nodes (sequential pipeline)
workflow.add_node("collect_data", self._collect_data)
workflow.add_node("calculate_metrics", self._calculate_metrics)
workflow.add_node("generate_charts", self._generate_charts)
workflow.add_node("analyze_insights", self._analyze_insights)
workflow.add_node("create_report", self._create_report)

# Connect nodes
workflow.set_entry_point("collect_data")
workflow.add_edge("collect_data", "calculate_metrics")
workflow.add_edge("calculate_metrics", "generate_charts")
workflow.add_edge("generate_charts", "analyze_insights")
workflow.add_edge("analyze_insights", "create_report")
workflow.add_edge("create_report", END)
```

**Key Innovation**: 
- Query interpretation for custom reports
- Detects keywords like "meeting", "event", "sales", "lead"
- Automatically fetches relevant data from Spring Boot API
- Generates meeting-specific or sales-specific metrics

**Example**:
```python
async def _collect_data(self, state: ReportState) -> ReportState:
    """Collect data based on query keywords"""
    custom_query = state.get("custom_query", "").lower()
    
    # Detect what data to fetch
    if "meeting" in custom_query or "event" in custom_query:
        # Fetch events from Spring Boot
        events = await self.crm_client.get_events()
        state["activities"] = events
    
    if "deal" in custom_query or "pipeline" in custom_query:
        # Fetch deals from Spring Boot
        deals = await self.crm_client.get_deals()
        state["deals"] = deals
    
    return state
```

---

### 4. `services/crm_client.py` - Spring Boot API Client

**Purpose**: HTTP client for calling Spring Boot backend

**Key Features**:
- JWT token management
- Async HTTP requests with httpx
- Automatic retry logic
- Error handling

**Example Methods**:
```python
class CRMClient:
    def __init__(self, backend_url: str, user_token: str):
        self.backend_url = backend_url
        self.headers = {"Authorization": f"Bearer {user_token}"}
    
    async def get_leads(self, filters: dict = None) -> List[dict]:
        """Fetch leads from Spring Boot API"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.backend_url}/api/v1/leads",
                headers=self.headers,
                params=filters or {}
            )
            response.raise_for_status()
            data = response.json()
            return data.get("content", data) if isinstance(data, dict) else data
    
    async def get_deals(self, limit: int = 1000) -> List[dict]:
        """Fetch deals from Spring Boot API"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.backend_url}/api/v1/deals",
                headers=self.headers,
                params={"limit": limit}
            )
            response.raise_for_status()
            return response.json()
    
    async def get_events(self, limit: int = 1000) -> List[dict]:
        """Fetch events/meetings from Spring Boot API"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.backend_url}/api/v1/events",
                headers=self.headers,
                params={"limit": limit}
            )
            response.raise_for_status()
            return response.json()
```

**All CRM Entities Supported**:
- Leads: `get_leads()`, `create_lead()`, `update_lead()`
- Deals: `get_deals()`, `get_deal()`, `update_deal()`
- Contacts: `get_contacts()`, `get_contact()`
- Companies: `get_companies()`, `get_company()`
- Events: `get_events()`, `get_event()`
- Tasks: `get_tasks()`, `create_task()`
- Products: `get_products()`
- Quotes: `get_quotes()`
- Invoices: `get_invoices()`

---

### 5. `mcp/leads_mcp.py` - MCP Tools for Leads

**Purpose**: Standardized tool interface for AI agents

**MCP Format**:
```python
LEADS_TOOLS = [
    {
        "name": "search_leads",
        "description": "Search and filter leads by criteria",
        "parameters": {
            "type": "object",
            "properties": {
                "status": {"type": "string", "enum": ["NEW", "CONTACTED", "QUALIFIED"]},
                "score_min": {"type": "number"},
                "limit": {"type": "number"}
            }
        }
    },
    {
        "name": "get_lead_details",
        "description": "Get full details of a specific lead",
        "parameters": {
            "type": "object",
            "properties": {
                "lead_id": {"type": "string"}
            },
            "required": ["lead_id"]
        }
    },
    {
        "name": "analyze_lead_quality",
        "description": "Analyze lead quality and conversion potential",
        "parameters": {
            "type": "object",
            "properties": {
                "lead_id": {"type": "string"}
            },
            "required": ["lead_id"]
        }
    }
]

async def execute_tool(tool_name: str, parameters: dict, crm_client: CRMClient):
    """Execute MCP tool"""
    if tool_name == "search_leads":
        return await crm_client.get_leads(filters=parameters)
    elif tool_name == "get_lead_details":
        return await crm_client.get_lead(parameters["lead_id"])
    # ... more tools
```

**Why MCP?**
- Standardized tool definitions
- Self-documenting for LLMs
- Easy to add new tools
- Compatible with LangChain/LangGraph

---

### 6. `rag/embeddings.py` - Sentence Transformers

**Purpose**: Generate embeddings for semantic search

**Implementation**:
```python
from sentence_transformers import SentenceTransformer

class EmbeddingService:
    def __init__(self):
        # Load model (384 dimensions)
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
    
    def encode(self, text: str) -> List[float]:
        """Generate embedding vector"""
        return self.model.encode(text).tolist()
    
    def encode_batch(self, texts: List[str]) -> List[List[float]]:
        """Batch encode for efficiency"""
        return self.model.encode(texts).tolist()
```

**Usage**:
- Embed user queries for semantic search
- Embed documents for storage in pgvector
- Compare similarity between texts

---

### 7. `rag/vector_store.py` - Pgvector Integration

**Purpose**: Store and search vectors in PostgreSQL

**Implementation**:
```python
class VectorStore:
    async def store_embedding(self, text: str, embedding: List[float], metadata: dict):
        """Store vector in pgvector"""
        query = """
        INSERT INTO embeddings (text, embedding, metadata)
        VALUES ($1, $2, $3)
        """
        await self.db.execute(query, text, embedding, metadata)
    
    async def search_similar(self, query_embedding: List[float], limit: int = 10):
        """Search similar vectors using cosine similarity"""
        query = """
        SELECT text, metadata, 
               1 - (embedding <=> $1::vector) AS similarity
        FROM embeddings
        ORDER BY embedding <=> $1::vector
        LIMIT $2
        """
        return await self.db.fetch(query, query_embedding, limit)
```

**Vector Operations**:
- `<=>`: Cosine distance (used for similarity)
- `<->`: Euclidean distance
- `<#>`: Inner product

---

## 🔐 Authentication Flow

### JWT Token Validation

```
Frontend
    │
    │ User logs in via Spring Boot
    │ POST /api/v1/auth/login
    │ { email, password }
    ▼
Spring Boot
    │
    ├─→ Validate credentials
    ├─→ Generate JWT token
    └─→ Return { token, refreshToken, user }
          │
          ▼
Frontend
    │
    ├─→ Store token in localStorage
    │
    │ Make AI Service request
    │ POST /chat
    │ Headers: { Authorization: Bearer <token> }
    ▼
AI Service
    │
    ├─→ Extract token from header
    │
    ├─→ Pass token to CRMClient
    │
    │ CRMClient makes Spring Boot API calls
    │ GET /api/v1/leads
    │ Headers: { Authorization: Bearer <token> }
    ▼
Spring Boot
    │
    ├─→ Validate JWT token
    ├─→ Extract user ID and tenant ID
    ├─→ Apply tenant isolation
    ├─→ Check permissions
    └─→ Return data
```

**Key Points**:
1. AI Service **never validates tokens** directly
2. Tokens are **passed through** to Spring Boot
3. Spring Boot handles all authentication/authorization
4. Multi-tenancy is enforced at Spring Boot layer

---

## 📝 Request/Response Examples

### Example 1: Chat Request

**Request**:
```bash
curl -X POST http://localhost:8000/chat \
  -H "Authorization: Bearer eyJhbGci..." \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Show me high-value deals closing this week"}
    ],
    "context": {"page": "deals"}
  }'
```

**AI Service Processing**:
1. Extracts JWT token
2. Initializes CRM Agent
3. Agent analyzes query: needs deals + date filter + value filter
4. Calls `crm_client.get_deals()`
5. Filters deals by:
   - `closeDate` within 7 days
   - `value` > $50,000
   - `stage` not in CLOSED_WON/CLOSED_LOST
6. Formats response with LLM
7. Streams response via SSE

**Response** (streamed):
```
data: {"type":"token","content":"I"}
data: {"type":"token","content":" found"}
data: {"type":"token","content":" 3"}
data: {"type":"token","content":" high"}
data: {"type":"token","content":"-value"}
data: {"type":"token","content":" deals"}
data: {"type":"token","content":" closing"}
data: {"type":"token","content":" this"}
data: {"type":"token","content":" week"}
data: {"type":"token","content":":\n\n"}
data: {"type":"token","content":"1"}
data: {"type":"token","content":". **"}
data: {"type":"token","content":"Enterprise"}
data: {"type":"token","content":" Software"}
data: {"type":"token","content":"** - $"}
data: {"type":"token","content":"125"}
data: {"type":"token","content":",000"}
data: {"type":"complete"}
```

---

### Example 2: Report Generation

**Request**:
```bash
curl -X POST http://localhost:8000/reports/generate \
  -H "Authorization: Bearer eyJhbGci..." \
  -H "Content-Type: application/json" \
  -d '{
    "report_type": "custom",
    "custom_query": "meeting reports",
    "date_range": "last_30_days"
  }'
```

**AI Service Processing**:

**Step 1: collect_data**
```python
# Detects "meeting" keyword
# Calls Spring Boot:
GET /api/v1/events?limit=1000
# Returns 20 events
```

**Step 2: calculate_metrics**
```python
# Processes events:
{
  "total_events": 20,
  "events_by_type": {"Unknown": 20},
  "events_by_location": {
    "Office": 6,
    "Client Site": 5,
    "Conference Room A": 7,
    "Zoom": 2
  },
  "upcoming_events": 4,
  "past_events": 16,
  "events_with_contacts": 0,
  "events_with_deals": 0
}
```

**Step 3: generate_charts**
```python
charts = [
  {
    "type": "pie",
    "title": "Events by Type",
    "data": {"Unknown": 20}
  },
  {
    "type": "bar",
    "title": "Events Timeline",
    "data": {"Past": 16, "Upcoming": 4}
  },
  {
    "type": "bar",
    "title": "Events by Location",
    "data": {"Office": 6, "Client Site": 5, ...}
  }
]
```

**Step 4: analyze_insights**
```python
# LLM generates insights:
insights = [
  "All events categorized as 'Unknown' - need better type tracking",
  "Preference for in-person meetings (18/20)",
  "Only 2 virtual meetings suggest low remote adoption",
  ...
]

recommendations = [
  "Implement event type categorization system",
  "Increase Zoom usage for flexibility",
  "Link events to contacts/deals for better tracking",
  ...
]
```

**Step 5: create_report**
```python
# LLM generates full report
report = {
  "title": "Meeting Analysis Report",
  "summary": "Analysis of 20 meetings...",
  "content": "## Executive Summary\n\n...",
  ...
}
```

**Response**:
```json
{
  "success": true,
  "report_id": "rep_123456",
  "title": "Meeting Analysis Report",
  "summary": "Analysis of 20 meetings showing strong preference for in-person interactions...",
  "metrics": {
    "total_events": 20,
    "events_by_type": {"Unknown": 20},
    "events_by_location": {"Office": 6, "Client Site": 5, "Conference Room A": 7, "Zoom": 2},
    "upcoming_events": 4,
    "past_events": 16
  },
  "charts": [...],
  "insights": [...],
  "recommendations": [...],
  "content": "## Executive Summary\n\n...",
  "generated_at": "2026-01-19T11:35:00Z"
}
```

---

## ➕ Adding New Features

### Add a New Agent

**1. Create agent file**:
```bash
touch ai-service/app/agents/my_new_agent.py
```

**2. Implement LangGraph workflow**:
```python
from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from typing import TypedDict

class MyAgentState(TypedDict):
    """State for the agent"""
    query: str
    data: dict
    response: str

class MyNewAgent:
    def __init__(self, backend_url: str, groq_api_key: str):
        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            groq_api_key=groq_api_key
        )
        self.workflow = self._build_workflow()
    
    def _build_workflow(self) -> StateGraph:
        """Build LangGraph workflow"""
        workflow = StateGraph(MyAgentState)
        
        # Add nodes
        workflow.add_node("step1", self._step1)
        workflow.add_node("step2", self._step2)
        workflow.add_node("step3", self._step3)
        
        # Connect nodes
        workflow.set_entry_point("step1")
        workflow.add_edge("step1", "step2")
        workflow.add_edge("step2", "step3")
        workflow.add_edge("step3", END)
        
        return workflow.compile()
    
    async def _step1(self, state: MyAgentState) -> MyAgentState:
        """First processing step"""
        # Your logic here
        return state
    
    async def _step2(self, state: MyAgentState) -> MyAgentState:
        """Second processing step"""
        # Your logic here
        return state
    
    async def _step3(self, state: MyAgentState) -> MyAgentState:
        """Final processing step"""
        # Your logic here
        return state
    
    async def execute(self, query: str) -> dict:
        """Execute the agent"""
        state = {
            "query": query,
            "data": {},
            "response": ""
        }
        result = await self.workflow.ainvoke(state)
        return result
```

**3. Add endpoint in `main.py`**:
```python
from app.agents.my_new_agent import MyNewAgent

@app.post("/my-feature")
async def my_feature(
    request: MyFeatureRequest,
    user_token: str = Depends(get_user_token)
):
    agent = MyNewAgent(
        backend_url=settings.CRM_API_URL,
        groq_api_key=settings.GROQ_API_KEY
    )
    result = await agent.execute(request.query)
    return result
```

---

### Add a New MCP Tool

**1. Define tool in `mcp/` directory**:
```python
# mcp/my_tools_mcp.py

MY_TOOLS = [
    {
        "name": "my_new_tool",
        "description": "Does something useful",
        "parameters": {
            "type": "object",
            "properties": {
                "param1": {"type": "string"},
                "param2": {"type": "number"}
            },
            "required": ["param1"]
        }
    }
]

async def execute_tool(tool_name: str, parameters: dict, crm_client):
    """Execute tool"""
    if tool_name == "my_new_tool":
        # Call Spring Boot API
        result = await crm_client.custom_api_call(parameters)
        return result
```

**2. Add method to `CRMClient`**:
```python
# services/crm_client.py

async def custom_api_call(self, params: dict) -> dict:
    """New API call method"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{self.backend_url}/api/v1/custom-endpoint",
            headers=self.headers,
            json=params
        )
        response.raise_for_status()
        return response.json()
```

**3. Register tool in agent**:
```python
# agents/crm_agent.py

from app.mcp.my_tools_mcp import MY_TOOLS

self.available_tools = LEADS_TOOLS + DEALS_TOOLS + MY_TOOLS
```

---

### Add New Backend Endpoint Support

**1. Add method to `CRMClient`**:
```python
# services/crm_client.py

async def get_new_entity(self, entity_id: str = None) -> Union[List[dict], dict]:
    """Fetch new entity from Spring Boot"""
    endpoint = f"{self.backend_url}/api/v1/new-entity"
    if entity_id:
        endpoint += f"/{entity_id}"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(endpoint, headers=self.headers)
        response.raise_for_status()
        return response.json()

async def create_new_entity(self, data: dict) -> dict:
    """Create new entity in Spring Boot"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{self.backend_url}/api/v1/new-entity",
            headers=self.headers,
            json=data
        )
        response.raise_for_status()
        return response.json()
```

**2. Create MCP tools**:
```python
# mcp/new_entity_mcp.py

NEW_ENTITY_TOOLS = [
    {
        "name": "search_new_entity",
        "description": "Search new entities",
        "parameters": {...}
    },
    {
        "name": "create_new_entity",
        "description": "Create a new entity",
        "parameters": {...}
    }
]
```

**3. Use in agent**:
```python
# Agent can now call:
result = await crm_client.get_new_entity()
```

---

## 🔍 Debugging AI Service

### Enable Debug Logging

```python
# config.py
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

### View Request/Response Logs

```bash
# View all AI service logs
docker logs -f crm-ai-service

# Filter for specific logs
docker logs crm-ai-service 2>&1 | grep "HTTP Request"
docker logs crm-ai-service 2>&1 | grep "Collected"
docker logs crm-ai-service 2>&1 | grep ERROR
```

### Test Endpoints Directly

```bash
# Health check
curl http://localhost:8000/health | jq .

# Test report generation
curl -X POST http://localhost:8000/reports/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"report_type":"custom","custom_query":"meeting reports"}' | jq .

# Test semantic search
curl -X POST "http://localhost:8000/search/semantic?query=enterprise&entity_type=lead&limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## 📊 Performance Optimization

### Async Operations

All API calls are async for non-blocking I/O:
```python
async with httpx.AsyncClient() as client:
    # Multiple concurrent requests
    leads_task = client.get(f"{url}/api/v1/leads")
    deals_task = client.get(f"{url}/api/v1/deals")
    contacts_task = client.get(f"{url}/api/v1/contacts")
    
    # Wait for all
    leads, deals, contacts = await asyncio.gather(
        leads_task, deals_task, contacts_task
    )
```

### Caching Embeddings

```python
from functools import lru_cache

@lru_cache(maxsize=1000)
def get_cached_embedding(text: str) -> List[float]:
    """Cache frequently used embeddings"""
    return embedding_service.encode(text)
```

### Streaming Responses

```python
async def generate_stream():
    """Stream tokens as they're generated"""
    async for token in llm.astream(prompt):
        yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
    yield f"data: {json.dumps({'type': 'complete'})}\n\n"

return StreamingResponse(generate_stream(), media_type="text/event-stream")
```

---

## 🎓 Summary

**Key Takeaways**:

1. **AI Service is a microservice** - Separate from Spring Boot backend
2. **JWT tokens are passed through** - No token validation in AI service
3. **All CRM data comes from Spring Boot API** - Single source of truth
4. **LangGraph manages workflows** - Multi-step reasoning and planning
5. **MCP provides standardized tools** - Easy to add new capabilities
6. **RAG enables semantic search** - Vector-based document retrieval
7. **Async all the way** - Non-blocking I/O for performance

**Communication Pattern**:
```
Frontend → AI Service (FastAPI) → Spring Boot (REST API) → PostgreSQL
                ↓
           Groq LLM (Llama 3.3 70B)
```

**File Responsibilities**:
- `main.py`: API endpoints
- `agents/*.py`: LangGraph workflows
- `mcp/*.py`: Tool definitions
- `services/crm_client.py`: Spring Boot API client
- `rag/*.py`: Vector embeddings and search

**To Add New Feature**:
1. Add method to `CRMClient` for API call
2. Create MCP tool definition
3. Create or update LangGraph agent
4. Add endpoint in `main.py`
5. Test with curl or frontend

---

**🎉 You now understand the complete AI service architecture!**

For more details:
- **LangGraph Docs**: https://langchain-ai.github.io/langgraph/
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **Groq API**: https://console.groq.com/docs/
- **Sentence Transformers**: https://www.sbert.net/
