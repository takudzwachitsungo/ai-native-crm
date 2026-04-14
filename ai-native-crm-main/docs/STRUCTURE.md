# 🏗️ CRM System - Complete Architecture & File Structure

> **Complete guide to navigating the codebase and understanding the system architecture**

---

## 📊 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                               │
│                     React + TypeScript + Vite                        │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────┐  │
│  │   18 Pages   │  │ 36 Components │  │  TanStack Query +       │  │
│  │   (src/pages)│  │ (src/components)│  │  Zustand State         │  │
│  └──────────────┘  └──────────────┘  └─────────────────────────┘  │
│         │                   │                      │                 │
│         └───────────────────┴──────────────────────┘                │
│                              │                                       │
│                    REST API (Axios + JWT)                           │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────┴──────────────────────────────────────┐
│                        BACKEND LAYER                                 │
│                  Spring Boot + PostgreSQL                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │ 175 Java   │  │    15      │  │   Redis    │  │  RabbitMQ  │   │
│  │   Files    │  │  Entities  │  │   Cache    │  │   Queue    │   │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │
│         │                                                             │
│         └──────────────┬──────────────────┐                         │
└────────────────────────┼──────────────────┼─────────────────────────┘
                         │                  │
         ┌───────────────┴──────┐    ┌──────┴─────────────────┐
         │                      │    │                         │
┌────────┴─────────┐   ┌────────┴────┴──────────────────────────────┐
│   PostgreSQL 15  │   │     AI SERVICE LAYER                        │
│   with pgvector  │   │     Python FastAPI + LangGraph              │
│                  │   │  ┌────────────┐  ┌────────────────────┐    │
│  15 Tables       │   │  │  21 Python │  │  LangGraph Agents: │    │
│  6 Services      │   │  │    Files   │  │  - CRM Agent       │    │
│  Running on      │   │  └────────────┘  │  - Report Agent    │    │
│  Port 5432       │   │                  │  - Lead Scorer     │    │
│                  │   │                  │  - Forecaster      │    │
└──────────────────┘   │  Groq LLM + RAG + MCP Tools             │    │
                       └──────────────────────────────────────────────┘
```

---

## 📁 Complete File Structure

```
CRM-React/                                    # 🏠 Root Directory
│
├── 📱 FRONTEND (React + TypeScript)          # Port 5173 (dev)
│   ├── src/
│   │   ├── pages/                           # 📄 18 Page Components
│   │   │   ├── Dashboard.tsx               # Home page with metrics & AI chat
│   │   │   ├── Leads.tsx                   # Lead management (26KB, largest page)
│   │   │   ├── Contacts.tsx                # Contact management
│   │   │   ├── Companies.tsx               # Company management
│   │   │   ├── Deals.tsx                   # Deal/opportunity management
│   │   │   ├── Pipeline.tsx                # Kanban deal pipeline
│   │   │   ├── Tasks.tsx                   # Task management
│   │   │   ├── Calendar.tsx                # Event calendar
│   │   │   ├── Products.tsx                # Product catalog
│   │   │   ├── Quotes.tsx                  # Quote generation
│   │   │   ├── Invoices.tsx                # Invoice management
│   │   │   ├── Documents.tsx               # Document management
│   │   │   ├── Email.tsx                   # Email interface
│   │   │   ├── Chat.tsx                    # Full AI chat interface
│   │   │   ├── Reports.tsx                 # AI-powered reports
│   │   │   ├── Forecasting.tsx             # Sales forecasting
│   │   │   ├── Settings.tsx                # User settings
│   │   │   └── Login.tsx                   # Authentication
│   │   │
│   │   ├── components/                      # 🧩 36 Reusable Components
│   │   │   ├── 🎨 LAYOUT COMPONENTS
│   │   │   │   ├── Header.tsx              # Top navigation bar
│   │   │   │   ├── Sidebar.tsx             # Left sidebar menu
│   │   │   │   ├── MainMenu.tsx            # Main navigation menu
│   │   │   │   └── PageLayout.tsx          # Page wrapper
│   │   │   │
│   │   │   ├── 🤖 AI & CHAT COMPONENTS
│   │   │   │   ├── Widgets.tsx             # Dashboard AI chat widget (44KB)
│   │   │   │   ├── ChatAssistant.tsx       # Floating chat button
│   │   │   │   ├── DashboardChat.tsx       # Dashboard chat interface
│   │   │   │   └── InsightsPanel.tsx       # AI insights display
│   │   │   │
│   │   │   ├── 📋 DATA DISPLAY COMPONENTS
│   │   │   │   ├── SortableTable.tsx       # Reusable data table
│   │   │   │   ├── SimpleChart.tsx         # Chart rendering
│   │   │   │   ├── InsightBadge.tsx        # Status badges (Hot, Overdue, etc.)
│   │   │   │   ├── LoadingSkeleton.tsx     # Loading placeholders
│   │   │   │   └── EmptyState.tsx          # Empty state UI
│   │   │   │
│   │   │   ├── 🛠️ UI COMPONENTS
│   │   │   │   ├── Modal.tsx               # Modal dialog
│   │   │   │   ├── Toast.tsx               # Toast notifications
│   │   │   │   ├── CommandPalette.tsx      # Cmd+K search
│   │   │   │   ├── AdvancedFilters.tsx     # Advanced filtering
│   │   │   │   ├── BulkActionsBar.tsx      # Bulk actions toolbar
│   │   │   │   ├── DetailSidebar.tsx       # Detail view sidebar
│   │   │   │   └── DebugPanel.tsx          # Dev debug panel
│   │   │   │
│   │   │   ├── 📜 DOCUMENT COMPONENTS
│   │   │   │   ├── QuoteView.tsx           # Quote preview/print
│   │   │   │   └── InvoiceView.tsx         # Invoice preview/print
│   │   │   │
│   │   │   ├── 📝 FORMS (components/forms/)
│   │   │   │   ├── index.ts                # Form exports
│   │   │   │   ├── LeadForm.tsx            # Lead creation/edit
│   │   │   │   ├── ContactForm.tsx         # Contact creation/edit
│   │   │   │   ├── CompanyForm.tsx         # Company creation/edit
│   │   │   │   ├── DealForm.tsx            # Deal creation/edit
│   │   │   │   ├── TaskForm.tsx            # Task creation/edit
│   │   │   │   ├── EventForm.tsx           # Event creation/edit
│   │   │   │   ├── ProductForm.tsx         # Product creation/edit
│   │   │   │   ├── QuoteForm.tsx           # Quote creation/edit
│   │   │   │   ├── InvoiceForm.tsx         # Invoice creation/edit
│   │   │   │   ├── DocumentUploadModal.tsx # Document upload
│   │   │   │   └── EmailComposeModal.tsx   # Email composition
│   │   │   │
│   │   │   ├── icons.tsx                   # Lucide icon exports
│   │   │   ├── ErrorBoundary.tsx           # Error boundaries
│   │   │   └── ChatAssistant_old.tsx       # Old chat (to be removed)
│   │   │
│   │   ├── hooks/                           # 🪝 React Hooks
│   │   │   ├── useChatStore.ts             # Zustand chat state (synced)
│   │   │   ├── useAuth.ts                  # Authentication hook
│   │   │   └── useToast.ts                 # Toast notifications hook
│   │   │
│   │   ├── lib/                             # 📚 Utilities & Config
│   │   │   ├── api.ts                      # Axios API client
│   │   │   ├── types.ts                    # TypeScript types
│   │   │   ├── utils.ts                    # Utility functions
│   │   │   ├── helpers.ts                  # Helper functions
│   │   │   └── constants.ts                # App constants
│   │   │
│   │   ├── contexts/                        # ⚛️ React Contexts
│   │   │   └── AuthContext.tsx             # Authentication context
│   │   │
│   │   ├── App.tsx                          # Root component with routing
│   │   ├── main.tsx                         # React entry point
│   │   └── index.css                        # Global styles + Tailwind
│   │
│   ├── public/                              # Static assets
│   ├── package.json                         # Dependencies
│   ├── vite.config.ts                       # Vite configuration
│   ├── tsconfig.json                        # TypeScript config
│   ├── tailwind.config.js                   # TailwindCSS config
│   ├── eslint.config.js                     # ESLint config
│   └── index.html                           # HTML entry point
│
├── 🔧 BACKEND (Spring Boot + Java)          # Port 8080
│   └── backend/
│       ├── src/main/java/com/crm/           # Java source code (175 files)
│       │   │
│       │   ├── entity/                      # 🗃️ JPA Entities (15 entities)
│       │   │   ├── AbstractEntity.java     # Base entity with audit fields
│       │   │   ├── Tenant.java             # Multi-tenancy
│       │   │   ├── User.java               # User accounts
│       │   │   ├── Lead.java               # Sales leads
│       │   │   ├── Contact.java            # Customer contacts
│       │   │   ├── Company.java            # Companies
│       │   │   ├── Deal.java               # Deals/opportunities
│       │   │   ├── Task.java               # Tasks
│       │   │   ├── Event.java              # Calendar events
│       │   │   ├── Product.java            # Products
│       │   │   ├── Quote.java              # Sales quotes
│       │   │   ├── Invoice.java            # Invoices
│       │   │   ├── Document.java           # Documents
│       │   │   ├── Email.java              # Emails
│       │   │   └── ... (more entities)
│       │   │
│       │   ├── repository/                  # 🗄️ Spring Data JPA Repositories
│       │   │   ├── LeadRepository.java
│       │   │   ├── ContactRepository.java
│       │   │   ├── CompanyRepository.java
│       │   │   ├── DealRepository.java
│       │   │   └── ... (one per entity)
│       │   │
│       │   ├── service/                     # 🔧 Service Interfaces
│       │   │   ├── LeadService.java
│       │   │   ├── ContactService.java
│       │   │   ├── DealService.java
│       │   │   └── ... (business logic interfaces)
│       │   │
│       │   ├── service/impl/                # ⚙️ Service Implementations
│       │   │   ├── LeadServiceImpl.java
│       │   │   ├── ContactServiceImpl.java
│       │   │   ├── DealServiceImpl.java
│       │   │   └── ... (business logic)
│       │   │
│       │   ├── controller/                  # 🌐 REST Controllers
│       │   │   ├── LeadController.java     # /api/v1/leads
│       │   │   ├── ContactController.java  # /api/v1/contacts
│       │   │   ├── CompanyController.java  # /api/v1/companies
│       │   │   ├── DealController.java     # /api/v1/deals
│       │   │   ├── TaskController.java     # /api/v1/tasks
│       │   │   ├── EventController.java    # /api/v1/events
│       │   │   ├── ProductController.java  # /api/v1/products
│       │   │   ├── QuoteController.java    # /api/v1/quotes
│       │   │   ├── InvoiceController.java  # /api/v1/invoices
│       │   │   ├── DocumentController.java # /api/v1/documents
│       │   │   ├── EmailController.java    # /api/v1/emails
│       │   │   └── AuthController.java     # /api/v1/auth
│       │   │
│       │   ├── dto/                         # 📦 Data Transfer Objects
│       │   │   ├── request/                # Request DTOs
│       │   │   │   ├── CreateLeadRequest.java
│       │   │   │   ├── UpdateLeadRequest.java
│       │   │   │   └── ... (all create/update requests)
│       │   │   │
│       │   │   └── response/               # Response DTOs
│       │   │       ├── LeadResponse.java
│       │   │       ├── ContactResponse.java
│       │   │       └── ... (all responses)
│       │   │
│       │   ├── mapper/                      # 🔀 MapStruct Mappers
│       │   │   ├── LeadMapper.java         # Entity ↔ DTO mapping
│       │   │   ├── ContactMapper.java
│       │   │   └── ... (one per entity)
│       │   │
│       │   ├── security/                    # 🔐 Security & JWT
│       │   │   ├── JwtTokenProvider.java   # JWT token generation
│       │   │   ├── JwtAuthFilter.java      # JWT authentication filter
│       │   │   ├── SecurityConfig.java     # Security configuration
│       │   │   └── UserDetailsServiceImpl.java
│       │   │
│       │   ├── config/                      # ⚙️ Spring Configurations
│       │   │   ├── WebConfig.java          # Web/CORS config
│       │   │   ├── CacheConfig.java        # Redis caching
│       │   │   ├── RabbitConfig.java       # RabbitMQ setup
│       │   │   ├── OpenApiConfig.java      # Swagger docs
│       │   │   └── ... (more configs)
│       │   │
│       │   ├── ai/                          # 🤖 AI/RAG Integration
│       │   │   ├── OpenAIService.java      # OpenAI API client
│       │   │   ├── EmbeddingService.java   # Vector embeddings
│       │   │   └── VectorSearchService.java # Semantic search
│       │   │
│       │   ├── messaging/                   # 📨 RabbitMQ Consumers
│       │   │   └── LeadScoringConsumer.java
│       │   │
│       │   ├── exception/                   # ⚠️ Exception Handling
│       │   │   ├── GlobalExceptionHandler.java
│       │   │   ├── ResourceNotFoundException.java
│       │   │   └── ... (custom exceptions)
│       │   │
│       │   ├── util/                        # 🛠️ Utility Classes
│       │   │   ├── DateUtils.java
│       │   │   ├── ValidationUtils.java
│       │   │   └── ... (helpers)
│       │   │
│       │   └── CrmApplication.java          # 🚀 Main Spring Boot App
│       │
│       ├── src/main/resources/
│       │   ├── application.yml              # Main configuration
│       │   ├── application-dev.yml          # Dev profile
│       │   ├── application-prod.yml         # Production profile
│       │   └── db/migration/                # Flyway migrations
│       │       ├── V1__init_schema.sql
│       │       ├── V2__add_indexes.sql
│       │       └── ... (database migrations)
│       │
│       ├── pom.xml                          # Maven dependencies
│       ├── Dockerfile                       # Backend Docker image
│       ├── docker-compose.yml               # Full stack orchestration
│       ├── README.md                        # Backend documentation
│       └── STRUCTURE.md                     # Backend structure guide
│
├── 🤖 AI SERVICE (Python FastAPI)           # Port 8000
│   └── ai-service/
│       ├── app/                             # Python source code (21 files)
│       │   │
│       │   ├── agents/                      # 🧠 LangGraph AI Agents
│       │   │   ├── crm_agent.py            # Main CRM conversation agent
│       │   │   ├── report_agent.py         # Report generation agent
│       │   │   ├── lead_scoring_agent.py   # Lead scoring agent
│       │   │   ├── forecasting_agent.py    # Sales forecasting agent
│       │   │   ├── autonomous_lead_scorer.py # Background lead scorer
│       │   │   └── __init__.py
│       │   │
│       │   ├── mcp/                         # 🛠️ MCP (Model Context Protocol) Tools
│       │   │   ├── leads_mcp.py            # Lead management tools
│       │   │   ├── deals_mcp.py            # Deal management tools
│       │   │   ├── contacts_mcp.py         # Contact management tools
│       │   │   └── __init__.py
│       │   │
│       │   ├── rag/                         # 🔍 RAG (Retrieval Augmented Generation)
│       │   │   ├── embeddings.py           # Sentence transformers embeddings
│       │   │   ├── vector_store.py         # Pgvector integration
│       │   │   └── __init__.py
│       │   │
│       │   ├── services/                    # 🔧 Services
│       │   │   ├── crm_client.py           # CRM backend API client
│       │   │   ├── autonomous_forecasting_service.py # Forecasting service
│       │   │   └── __init__.py
│       │   │
│       │   ├── main.py                      # FastAPI application entry
│       │   ├── config.py                    # Configuration settings
│       │   └── dependencies.py              # FastAPI dependencies
│       │
│       ├── requirements.txt                 # Python dependencies
│       ├── Dockerfile                       # AI service Docker image
│       └── README.md                        # AI service documentation
│
├── 🗄️ DATA & SCRIPTS
│   ├── backups/                             # Database backups
│   │   ├── crm_backup_20260119_113553.dump # Custom format (268KB)
│   │   └── crm_backup_20260119_113713.sql  # SQL format (668KB)
│   │
│   ├── scripts/                             # Utility scripts
│   │   ├── check_data.sh                   # Check data counts
│   │   ├── load_data_via_docker.sh         # Load data to Docker DB
│   │   └── generate_fintech_data.py        # Fintech data generator
│   │
│   ├── generate_crm_data.py                 # Main data generator
│   ├── import_crm_data.py                   # Data import script
│   ├── verify_data_compatibility.py         # Data validation
│   ├── test_lead_scoring_agent.py           # Agent testing
│   ├── backup_database.sh                   # Database backup script
│   └── restore_database.sh                  # Database restore script
│
├── 📚 DOCUMENTATION
│   ├── README.md                            # Main project README
│   ├── STRUCTURE.md                         # This file - architecture guide
│   ├── DATABASE_BACKUP_GUIDE.md             # Backup & migration guide
│   ├── DATABASE_SCHEMA_REQUIREMENTS.md      # Schema documentation
│   ├── DATA_GENERATION_GUIDE.md             # Data generation guide
│   ├── UI_COMPONENTS_GUIDE.md               # Frontend component guide
│   ├── QUICKSTART_AI.md                     # AI service quickstart
│   ├── AUTONOMOUS_LEAD_SCORING.md           # Lead scoring docs
│   ├── SMTP_SETUP.md                        # Email setup guide
│   ├── PITCH.md                             # Project pitch deck
│   └── README-vite-template.md              # Vite template README
│
└── ⚙️ CONFIGURATION FILES
    ├── .env                                 # Environment variables
    ├── .gitignore                           # Git ignore rules
    ├── package.json                         # Frontend dependencies
    ├── package-lock.json                    # Locked versions
    ├── vite.config.ts                       # Vite bundler config
    ├── tsconfig.json                        # TypeScript config
    ├── tsconfig.app.json                    # App TypeScript config
    ├── tsconfig.node.json                   # Node TypeScript config
    ├── tailwind.config.js                   # TailwindCSS config
    ├── eslint.config.js                     # ESLint config
    └── requirements.txt                     # Python dependencies (root level)
```

---

## 🔍 Where to Find What

### 🎨 Frontend Development

| What You Need | Where to Find It | Purpose |
|---------------|------------------|---------|
| **Add a new page** | `src/pages/` | Create new `.tsx` file, add route in `App.tsx` |
| **Create reusable component** | `src/components/` | Shared UI components |
| **Add form** | `src/components/forms/` | Entity creation/editing forms |
| **API calls** | `src/lib/api.ts` | Axios client with JWT interceptors |
| **Type definitions** | `src/lib/types.ts` | TypeScript interfaces |
| **Global state** | `src/hooks/useChatStore.ts` | Zustand stores |
| **Styling** | `src/index.css` | TailwindCSS + custom CSS |
| **Icons** | `src/components/icons.tsx` | Lucide icon exports |
| **Routing** | `src/App.tsx` | React Router configuration |

### 🔧 Backend Development

| What You Need | Where to Find It | Purpose |
|---------------|------------------|---------|
| **Add new entity** | `backend/src/main/java/com/crm/entity/` | JPA entities |
| **Database queries** | `backend/src/main/java/com/crm/repository/` | Spring Data repositories |
| **Business logic** | `backend/src/main/java/com/crm/service/impl/` | Service implementations |
| **REST endpoints** | `backend/src/main/java/com/crm/controller/` | Spring REST controllers |
| **Request/Response DTOs** | `backend/src/main/java/com/crm/dto/` | Data transfer objects |
| **Security/JWT** | `backend/src/main/java/com/crm/security/` | Authentication & authorization |
| **Configuration** | `backend/src/main/resources/` | Application properties |
| **Database migrations** | `backend/src/main/resources/db/migration/` | Flyway SQL scripts |
| **AI integration** | `backend/src/main/java/com/crm/ai/` | OpenAI & vector search |

### 🤖 AI Service Development

| What You Need | Where to Find It | Purpose |
|---------------|------------------|---------|
| **Add AI agent** | `ai-service/app/agents/` | LangGraph workflow agents |
| **MCP tools** | `ai-service/app/mcp/` | Model Context Protocol tools |
| **RAG/Embeddings** | `ai-service/app/rag/` | Vector search & embeddings |
| **CRM API client** | `ai-service/app/services/crm_client.py` | Backend API integration |
| **FastAPI routes** | `ai-service/app/main.py` | API endpoints |
| **Configuration** | `ai-service/app/config.py` | Service settings |

### 🗄️ Database & Data

| What You Need | Where to Find It | Purpose |
|---------------|------------------|---------|
| **Generate test data** | `generate_crm_data.py` | Create realistic CRM data |
| **Import data** | `import_crm_data.py` | Load data into database |
| **Backup database** | `./backup_database.sh` | Create database backups |
| **Restore database** | `./restore_database.sh` | Restore from backup |
| **View backups** | `backups/` | Stored backup files |
| **Database schema** | `DATABASE_SCHEMA_REQUIREMENTS.md` | Schema documentation |

---

## 🚀 Key Entry Points

### Starting the Application

```bash
# 1. Start infrastructure (PostgreSQL, Redis, RabbitMQ, etc.)
cd backend
docker-compose up -d

# 2. Start backend (Spring Boot)
./mvnw spring-boot:run
# → http://localhost:8080

# 3. Start AI service (Already running in Docker)
# → http://localhost:8000

# 4. Start frontend (React)
npm run dev
# → http://localhost:5173
```

### Main Files to Know

1. **Frontend Entry**: `src/main.tsx` → `src/App.tsx` → `src/pages/Dashboard.tsx`
2. **Backend Entry**: `backend/src/main/java/com/crm/CrmApplication.java`
3. **AI Service Entry**: `ai-service/app/main.py`
4. **Database Config**: `backend/src/main/resources/application.yml`
5. **Docker Orchestration**: `backend/docker-compose.yml`

---

## 📊 File Statistics

| Category | Count | Notes |
|----------|-------|-------|
| **Frontend Pages** | 18 | React/TypeScript pages |
| **Frontend Components** | 36 | Reusable UI components |
| **Backend Java Files** | 175 | Spring Boot application |
| **Backend Entities** | 15 | JPA database entities |
| **AI Python Files** | 21 | FastAPI + LangGraph |
| **Database Tables** | 15+ | PostgreSQL with pgvector |
| **Docker Services** | 7 | Containers orchestrated |
| **Documentation Files** | 13 | Markdown guides |

---

## 🎯 Common Tasks Quick Reference

### Add a New Entity

**1. Backend (Spring Boot):**
```
└── backend/src/main/java/com/crm/
    ├── entity/NewEntity.java           # Create JPA entity
    ├── repository/NewEntityRepository.java  # Create repository
    ├── service/NewEntityService.java        # Create service interface
    ├── service/impl/NewEntityServiceImpl.java  # Implement service
    ├── controller/NewEntityController.java     # Create REST controller
    ├── dto/request/CreateNewEntityRequest.java # Request DTO
    ├── dto/response/NewEntityResponse.java     # Response DTO
    └── mapper/NewEntityMapper.java             # MapStruct mapper
```

**2. Frontend (React):**
```
└── src/
    ├── pages/NewEntities.tsx           # Create page component
    ├── components/forms/NewEntityForm.tsx  # Create form
    ├── lib/types.ts                    # Add TypeScript interface
    └── App.tsx                         # Add route
```

### Add an AI Agent

```
└── ai-service/app/agents/
    └── my_new_agent.py                 # Create LangGraph agent
        ├── Define StateGraph
        ├── Add nodes (functions)
        ├── Connect nodes
        └── Compile workflow
```

### Add an API Endpoint

**Backend:**
```java
// backend/src/main/java/com/crm/controller/MyController.java
@RestController
@RequestMapping("/api/v1/myentity")
public class MyEntityController {
    
    @GetMapping
    public ResponseEntity<List<MyEntity>> getAll() {
        // Implementation
    }
    
    @PostMapping
    public ResponseEntity<MyEntity> create(@RequestBody CreateRequest request) {
        // Implementation
    }
}
```

**Frontend:**
```typescript
// src/lib/api.ts
export const myEntityAPI = {
  getAll: () => api.get('/api/v1/myentity'),
  create: (data: CreateRequest) => api.post('/api/v1/myentity', data),
};
```

---

## 🔌 Service Ports

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| **Frontend** | 5173 | http://localhost:5173 | React dev server |
| **Backend** | 8080 | http://localhost:8080 | Spring Boot API |
| **AI Service** | 8000 | http://localhost:8000 | FastAPI + LangGraph |
| **PostgreSQL** | 5432 | localhost:5432 | Database |
| **Redis** | 6379 | localhost:6379 | Cache |
| **RabbitMQ** | 5672 | localhost:5672 | Message queue |
| **RabbitMQ UI** | 15672 | http://localhost:15672 | Management console |
| **SMTP Provider** | 587 | provider-specific | Outbound email delivery |
| **Jaeger** | 16686 | http://localhost:16686 | Distributed tracing |

---

## 🧩 Technology Stack Summary

### Frontend Stack
- **Framework**: React 19.2 + TypeScript
- **Build Tool**: Vite 6+
- **Routing**: React Router 7
- **State Management**: TanStack Query 5 (server state) + Zustand 5 (client state)
- **Styling**: TailwindCSS 4 + CSS Variables
- **HTTP Client**: Axios 1.13
- **Icons**: Lucide React
- **Markdown**: React Markdown
- **UI Components**: Custom + class-variance-authority

### Backend Stack
- **Framework**: Spring Boot 3.2.1
- **Language**: Java 17
- **Database**: PostgreSQL 15 with pgvector
- **ORM**: Spring Data JPA + Hibernate
- **Security**: Spring Security + JWT (jjwt)
- **Caching**: Redis 7
- **Message Queue**: RabbitMQ 3
- **Mapping**: MapStruct
- **Migrations**: Flyway
- **Build Tool**: Maven 3.9
- **Observability**: OpenTelemetry, Jaeger, Prometheus

### AI Service Stack
- **Framework**: FastAPI (Python 3.11)
- **AI Framework**: LangGraph + LangChain
- **LLM**: Groq API (Llama 3.3 70B)
- **Embeddings**: Sentence Transformers (all-MiniLM-L6-v2)
- **Vector DB**: pgvector (384 dimensions)
- **Async**: asyncio + httpx
- **Streaming**: Server-Sent Events (SSE)

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Database**: PostgreSQL 15 (pgvector/pgvector:pg15)
- **Cache**: Redis 7 (redis:7-alpine)
- **Queue**: RabbitMQ 3 (rabbitmq:3-management-alpine)
- **Email**: External SMTP provider
- **Tracing**: Jaeger (jaegertracing/all-in-one)

---

## 📝 Development Workflow

### Making Changes

1. **Frontend Change**:
   - Edit files in `src/`
   - Hot reload at http://localhost:5173
   - Build: `npm run build`

2. **Backend Change**:
   - Edit files in `backend/src/main/java/`
   - Spring Boot DevTools auto-restarts
   - Manual restart: `./mvnw spring-boot:run`

3. **AI Service Change**:
   - Edit files in `ai-service/app/`
   - Rebuild Docker: `cd backend && docker-compose up -d --build ai-service`
   - Or use volume mount for hot reload

4. **Database Change**:
   - Create Flyway migration: `backend/src/main/resources/db/migration/V{n}__{description}.sql`
   - Restart backend to apply

---

## 🎓 Learning the Codebase

### Start Here (Recommended Order):

1. **README.md** - Project overview
2. **STRUCTURE.md** (this file) - Architecture understanding
3. **src/App.tsx** - Frontend routing
4. **src/pages/Dashboard.tsx** - Main dashboard
5. **backend/src/main/java/com/crm/CrmApplication.java** - Backend entry
6. **backend/src/main/java/com/crm/entity/** - Data models
7. **ai-service/app/main.py** - AI service entry
8. **ai-service/app/agents/crm_agent.py** - Main AI agent

### Key Concepts to Understand:

1. **JWT Authentication** - Tokens stored in localStorage, auto-refresh
2. **TanStack Query** - Server state caching with auto-refetch
3. **Zustand** - Client state (chat history) with localStorage sync
4. **LangGraph** - Workflow orchestration for AI agents
5. **MCP Tools** - Standardized AI tool interface
6. **RAG** - Vector embeddings for semantic search
7. **Multi-tenancy** - Tenant isolation with Hibernate filters
8. **MapStruct** - Entity-DTO mapping

---

## 🔐 Security Notes

- **JWT Tokens**: 15min access, 7-day refresh
- **Password Hashing**: BCrypt with strength 10
- **CORS**: Configured in `backend/src/main/java/com/crm/config/WebConfig.java`
- **Rate Limiting**: Bucket4j (100-10,000 req/min per tenant tier)
- **SQL Injection**: Prevented by JPA/Hibernate prepared statements
- **XSS**: React auto-escapes by default
- **CSRF**: Disabled for stateless JWT API

---

## 📞 Support & Troubleshooting

### Common Issues:

1. **Port already in use**: Check running services with `docker ps` and `lsof -i :PORT`
2. **Database connection failed**: Verify PostgreSQL is running: `docker ps | grep postgres`
3. **AI service not responding**: Check logs: `docker logs crm-ai-service`
4. **Frontend build errors**: Clear cache: `rm -rf node_modules dist && npm install`
5. **Backend build errors**: Clean Maven: `./mvnw clean install`

### Useful Commands:

```bash
# View all container logs
docker-compose logs -f

# Restart specific service
docker restart crm-backend
docker restart crm-ai-service

# Check database
docker exec -it crm-postgres psql -U crm_user -d crm_db

# Check Redis cache
docker exec -it crm-redis redis-cli

# Check RabbitMQ queues
# Visit: http://localhost:15672 (guest/guest)
```

---

## 🎯 Quick Navigation Guide

**Need to...**

- **Add a new page?** → `src/pages/` + route in `src/App.tsx`
- **Create a form?** → `src/components/forms/`
- **Add API endpoint?** → `backend/src/main/java/com/crm/controller/`
- **Add database table?** → `backend/src/main/java/com/crm/entity/` + Flyway migration
- **Create AI agent?** → `ai-service/app/agents/`
- **Add MCP tool?** → `ai-service/app/mcp/`
- **Change styling?** → `src/index.css` or component-level Tailwind
- **Configure backend?** → `backend/src/main/resources/application.yml`
- **Add dependency?** → `package.json` (frontend) or `pom.xml` (backend) or `requirements.txt` (AI)
- **Backup database?** → `./backup_database.sh`
- **Generate test data?** → `python generate_crm_data.py`

---

**🎉 You now have a complete map of the CRM system!**

For more details on specific topics:
- **Backend Architecture**: `backend/STRUCTURE.md`
- **AI Service**: `ai-service/README.md` & `QUICKSTART_AI.md`
- **Database Backup**: `DATABASE_BACKUP_GUIDE.md`
- **UI Components**: `UI_COMPONENTS_GUIDE.md`
- **Data Generation**: `DATA_GENERATION_GUIDE.md`
