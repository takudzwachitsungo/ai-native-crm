# CRM AI Service

Agentic AI microservice with LangGraph, MCP, and RAG for intelligent CRM operations.

## Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────┐
│   Frontend  │─────▶│  Python FastAPI  │─────▶│ Java Backend│
│  (React)    │      │  (LangGraph/MCP) │      │   (CRM)     │
└─────────────┘      └──────────────────┘      └─────────────┘
                             │                         │
                             ▼                         ▼
                      ┌──────────────┐         ┌──────────────┐
                      │   Groq API   │         │  PostgreSQL  │
                      │  (Chat LLM)  │         │  (CRM Data)  │
                      └──────────────┘         └──────────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │   Pgvector   │
                      │ (Embeddings) │
                      └──────────────┘
```

## Features

### 🤖 **Agentic AI with LangGraph**
- Autonomous decision-making workflows
- Multi-step reasoning and planning
- Context-aware responses

### 🛠️ **MCP (Model Context Protocol) Tools**
- **Leads MCP**: Search, create, analyze leads
- **Deals MCP**: Pipeline metrics, closing deals, at-risk detection
- **Contacts MCP**: VIP contacts, relationship management

### 🔍 **RAG (Retrieval Augmented Generation)**
- Local embeddings with sentence-transformers (all-MiniLM-L6-v2)
- Semantic search with pgvector
- Context from CRM data in responses

### 💬 **Chat Capabilities**
- Natural language queries
- CRM data integration
- Tool calling and function execution
- Conversation history

## Tech Stack

- **FastAPI**: Web framework
- **LangGraph**: Agentic workflows
- **LangChain + Groq**: LLM integration (Llama 3.3 70B)
- **Sentence Transformers**: Local embeddings (384 dimensions)
- **Pgvector**: Vector similarity search
- **PostgreSQL**: Data storage
- **Redis**: Caching

## Setup

### 1. Environment Variables

Create `.env` file:
```bash
GROQ_API_KEY=your_groq_api_key
CRM_API_URL=http://crm-backend:8080
CRM_API_USERNAME=admin@crm.com
CRM_API_PASSWORD=admin123
```

### 2. Run with Docker Compose

From `backend/` directory:
```bash
docker-compose up -d ai-service
```

### 3. Verify Service

```bash
curl http://localhost:8000/health
```

## API Endpoints

### Chat
```bash
POST /chat
{
  "messages": [
    {"role": "user", "content": "Show me high-value leads"}
  ],
  "context": {"page": "leads"}
}
```

### Semantic Search
```bash
POST /search/semantic?query=enterprise%20customers&entity_type=lead&limit=5
```

### Generate Embeddings
```bash
POST /embeddings/generate?entity_type=lead&entity_id=<uuid>
```

### List Tools
```bash
GET /tools
```

## MCP Tools

The agent has access to these tools:

### Leads
- `search_leads`: Search leads by query, status
- `get_lead_details`: Get full lead information
- `create_lead`: Create new lead
- `get_high_value_leads`: Find leads above value threshold
- `get_stale_leads`: Find leads not contacted recently

### Deals
- `search_deals`: Search deals by query, stage
- `get_deal_details`: Get full deal information
- `get_pipeline_metrics`: Get pipeline statistics
- `get_deals_by_stage`: Get deals in specific stage
- `get_closing_soon_deals`: Find deals closing soon
- `get_at_risk_deals`: Identify at-risk deals

### Contacts
- `search_contacts`: Search contacts by query
- `get_contact_details`: Get full contact information
- `get_vip_contacts`: Find VIP/decision maker contacts

## LangGraph Workflow

```
User Query
    ↓
Understand Intent
    ↓
Plan Actions
    ↓
Execute Tools / RAG Search
    ↓
Synthesize Response
    ↓
Return Answer
```

## Example Queries

**Lead Management:**
- "Show me high-value leads that haven't been contacted in 2 weeks"
- "Find leads in the technology industry"
- "Create a new lead for John Doe at Acme Corp"

**Deal Pipeline:**
- "What deals are closing this month?"
- "Show me at-risk deals"
- "Give me pipeline metrics"

**Semantic Search:**
- "Find similar leads to this one"
- "Show me contacts at Fortune 500 companies"
- "Search for enterprise deals"

## Development

### Local Development
```bash
cd ai-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Test Endpoints
```bash
# Health check
curl http://localhost:8000/health

# List tools
curl http://localhost:8000/tools

# Chat
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Show me all leads"}]}'
```

## Next Steps

1. ✅ Connect frontend to AI service (update Chat.tsx)
2. ⏳ Generate embeddings for existing CRM data
3. ⏳ Add more MCP tools (tasks, companies, analytics)
4. ⏳ Implement streaming responses
5. ⏳ Add memory/conversation persistence
