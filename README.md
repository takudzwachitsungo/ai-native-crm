# 🚀 Enterprise CRM System with AI Intelligence

A modern, full-stack Customer Relationship Management (CRM) system with integrated AI agents for sales automation, lead scoring, and forecasting.

## 📋 Table of Contents

- [System Overview](#system-overview)
- [Architecture](#architecture)
- [Current Features](#current-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Backend Setup (Spring Boot)](#backend-setup-spring-boot)
- [AI Service Setup (Python FastAPI)](#ai-service-setup-python-fastapi)
- [Frontend Setup (React + TypeScript)](#frontend-setup-react--typescript)
- [Data Generation & Import](#data-generation--import)
- [AI Agents Architecture](#ai-agents-architecture)
- [Development Workflow](#development-workflow)
- [Next Steps & Roadmap](#next-steps--roadmap)
- [Troubleshooting](#troubleshooting)

---

## 🎯 System Overview

This is a **production-ready CRM system** designed for modern sales teams, featuring:

- **Complete CRM Functionality**: Manage leads, contacts, companies, deals, tasks, quotes, invoices, and more
- **AI-Powered Insights**: Real-time deal analysis, lead scoring, and sales forecasting
- **Interactive Dashboard**: Chat-based AI assistant with streaming responses
- **Real-Time Updates**: Background polling for live data synchronization
- **Professional UI**: Dark mode support, responsive design, accessibility compliant
- **Enterprise-Grade Backend**: Spring Boot REST API with JWT authentication
- **Intelligent Agents**: Python-based AI service for autonomous sales operations

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  React + TypeScript + TanStack Query + Zustand + TailwindCSS   │
│  - Dashboard with inline AI chat                                │
│  - Real-time badge system for insights                          │
│  - Auto-refresh every 30s-5min per page                         │
└────────────────────┬────────────────────────────────────────────┘
                     │ REST API (axios)
                     │
┌────────────────────┴────────────────────────────────────────────┐
│                         BACKEND                                  │
│              Spring Boot + JPA + PostgreSQL                      │
│  - RESTful API endpoints for all CRM entities                   │
│  - JWT authentication & authorization                            │
│  - MapStruct for DTO transformations                             │
│  - Validation & error handling                                   │
└────────────────────┬────────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
┌────────┴─────────┐   ┌────────┴─────────────────────────────┐
│   PostgreSQL     │   │      AI SERVICE (Python FastAPI)      │
│   Database       │   │  - Chat endpoint (streaming SSE)      │
│                  │   │  - Insights generation                 │
│                  │   │  - Background agents (planned):        │
│                  │   │    * Lead scoring agent               │
│                  │   │    * Sales forecasting agent          │
│                  │   │    * Deal optimization agent          │
└──────────────────┘   └───────────────────────────────────────┘
```

---

## ✅ Current Features

### **CRM Core Functionality**
- ✅ **Dashboard** - Metrics, quick actions, inline AI chat
- ✅ **Leads Management** - Lead tracking with conversion pipeline
- ✅ **Contacts & Companies** - Full contact relationship management
- ✅ **Deals/Opportunities** - Deal stages, probability tracking
- ✅ **Pipeline View** - Drag-and-drop Kanban board
- ✅ **Tasks** - Task management with overdue tracking
- ✅ **Calendar** - Event scheduling and management
- ✅ **Products** - Product catalog management
- ✅ **Quotes** - Quote generation with line items
- ✅ **Invoices** - Invoice tracking and payment status
- ✅ **Documents** - Document attachment system
- ✅ **Reports** - Basic reporting interface
- ✅ **Settings** - User preferences and configuration

### **AI Features**
- ✅ **AI Chat Assistant** - Inline dashboard chat with streaming responses
- ✅ **Conversation Persistence** - Zustand store + localStorage for chat history
- ✅ **Dynamic Suggestions** - 12 pre-built actions, randomly selects 6
- ✅ **Auto-Submit Suggestions** - Click suggestion → auto-submits to AI
- ✅ **Insight Badges** - Contextual badges on items:
  - 🔴 **Overdue** (tasks past due date)
  - 🟠 **Hot** (high-value deals with high probability)
  - 🟢 **Closing Soon** (deals closing within 7 days)
  - 🟡 **Stuck** (deals in negotiation with low probability)
  - 🟣 **At Risk** (late-stage deals with low probability)
  - ⚪ **Inactive** (inactive contacts)

### **Data & Performance**
- ✅ **Background Polling** - Auto-refresh:
  - Dashboard: 30 seconds
  - Tasks: 30 seconds (for real-time overdue detection)
  - Pipeline: 30 seconds (for real-time deal movement)
  - Deals: 60 seconds
  - Contacts: 5 minutes
- ✅ **Data Generation Scripts** - Python scripts to generate 16,500+ realistic records
- ✅ **Smart Import System** - Batch import with relationship handling

### **Authentication & Security**
- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **Protected Routes** - Frontend route guards
- ✅ **Token Refresh** - Automatic token management
- ✅ **Debug Panel** - Development-only debugging tools

---

## 🛠️ Tech Stack

### **Frontend**
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: 
  - TanStack Query (server state)
  - Zustand (client state, chat persistence)
- **Styling**: TailwindCSS + CSS Variables for theming
- **UI Components**: Custom components + lucide-react icons
- **API Client**: Axios
- **Markdown**: ReactMarkdown for AI responses

### **Backend**
- **Framework**: Spring Boot 3.2+
- **Language**: Java 17+
- **Database**: PostgreSQL
- **ORM**: Spring Data JPA
- **Security**: Spring Security + JWT
- **Mapping**: MapStruct
- **Build Tool**: Maven
- **Validation**: Jakarta Validation

### **AI Service**
- **Framework**: FastAPI (Python)
- **LLM Integration**: OpenAI API / Claude API
- **Streaming**: Server-Sent Events (SSE)
- **Task Queue**: Celery + Redis (planned for agents)
- **ML Libraries**: 
  - scikit-learn (for ML models)
  - pandas (data processing)
  - faker (data generation)

---

## 📁 Project Structure

```
CRM-React/
├── README.md                          # This file
├── DATA_GENERATION_GUIDE.md          # Data generation documentation
├── package.json                       # Frontend dependencies
├── vite.config.ts                     # Vite configuration
├── tsconfig.json                      # TypeScript configuration
├── tailwind.config.js                 # TailwindCSS configuration
├── index.html                         # HTML entry point
│
├── src/                               # Frontend source code
│   ├── main.tsx                      # React entry point
│   ├── App.tsx                       # Root component with routing
│   ├── index.css                     # Global styles + Tailwind
│   │
│   ├── components/                   # Reusable UI components
│   │   ├── Header.tsx               # Top navigation bar
│   │   ├── Sidebar.tsx              # Left sidebar navigation
│   │   ├── MainMenu.tsx             # Main menu component
│   │   ├── Widgets.tsx              # Dashboard widgets + inline chat
│   │   ├── InsightBadge.tsx         # Badge component (overdue, hot, etc.)
│   │   ├── CommandPalette.tsx       # Cmd+K search interface
│   │   ├── ChatAssistant.tsx        # Full-page chat interface
│   │   ├── DashboardChat.tsx        # Dashboard inline chat
│   │   ├── SortableTable.tsx        # Reusable table component
│   │   ├── Modal.tsx                # Modal dialog
│   │   ├── Toast.tsx                # Toast notifications
│   │   ├── LoadingSkeleton.tsx      # Loading states
│   │   ├── EmptyState.tsx           # Empty state component
│   │   ├── ErrorBoundary.tsx        # Error boundaries
│   │   ├── DebugPanel.tsx           # Development debug panel
│   │   ├── BulkActionsBar.tsx       # Bulk action toolbar
│   │   ├── AdvancedFilters.tsx      # Advanced filtering UI
│   │   ├── DetailSidebar.tsx        # Detail view sidebar
│   │   ├── icons.tsx                # Icon exports (lucide-react)
│   │   │
│   │   └── forms/                   # Form components for each entity
│   │       ├── index.ts             # Form exports
│   │       ├── LeadForm.tsx
│   │       ├── ContactForm.tsx
│   │       ├── CompanyForm.tsx
│   │       ├── DealForm.tsx
│   │       ├── TaskForm.tsx
│   │       ├── ProductForm.tsx
│   │       ├── QuoteForm.tsx
│   │       ├── InvoiceForm.tsx
│   │       └── EventForm.tsx
│   │
│   ├── pages/                        # Page components (routes)
│   │   ├── Dashboard.tsx            # Main dashboard
│   │   ├── Leads.tsx                # Leads list & management
│   │   ├── Contacts.tsx             # Contacts list & management
│   │   ├── Companies.tsx            # Companies list & management
│   │   ├── Deals.tsx                # Deals list & management
│   │   ├── Pipeline.tsx             # Kanban pipeline view
│   │   ├── Tasks.tsx                # Tasks list (table + board views)
│   │   ├── Calendar.tsx             # Calendar view
│   │   ├── Products.tsx             # Products catalog
│   │   ├── Quotes.tsx               # Quotes management
│   │   ├── Invoices.tsx             # Invoices management
│   │   ├── Documents.tsx            # Documents management
│   │   ├── Email.tsx                # Email interface
│   │   ├── Chat.tsx                 # Full-page chat interface
│   │   ├── Reports.tsx              # Reporting page
│   │   ├── Forecasting.tsx          # Sales forecasting (UI only)
│   │   └── Settings.tsx             # Settings page
│   │
│   ├── lib/                          # Utility libraries
│   │   ├── api.ts                   # Backend API client (axios)
│   │   ├── ai-api.ts                # AI service API client + types
│   │   ├── types.ts                 # TypeScript type definitions
│   │   ├── utils.ts                 # General utilities (cn, etc.)
│   │   └── helpers.ts               # Helper functions
│   │
│   ├── hooks/                        # Custom React hooks
│   │   ├── useInsights.ts           # Hook for fetching insights
│   │   ├── useChatStore.ts          # Zustand store for chat state
│   │   └── useInsightsStore.ts      # Zustand store for insights
│   │
│   ├── contexts/                     # React contexts
│   │   └── AuthContext.tsx          # Authentication context
│   │
│   └── assets/                       # Static assets
│       └── [images, icons, etc.]
│
├── backend/                          # Spring Boot backend (separate repo/folder)
│   ├── src/main/java/
│   │   └── com/crm/
│   │       ├── controller/          # REST controllers
│   │       ├── service/             # Business logic
│   │       ├── repository/          # JPA repositories
│   │       ├── entity/              # JPA entities
│   │       ├── dto/                 # Data Transfer Objects
│   │       ├── mapper/              # MapStruct mappers
│   │       ├── security/            # JWT & security config
│   │       └── config/              # Spring configuration
│   ├── src/main/resources/
│   │   └── application.properties   # Backend configuration
│   └── pom.xml                       # Maven dependencies
│
├── ai-service/                       # Python AI service (separate repo/folder)
│   ├── main.py                      # FastAPI application
│   ├── requirements.txt             # Python dependencies
│   ├── agents/                      # AI agents (planned)
│   │   ├── lead_scoring.py
│   │   ├── sales_forecasting.py
│   │   └── deal_optimizer.py
│   └── models/                      # ML models (planned)
│
├── generate_crm_data.py             # Data generation script
├── import_crm_data.py               # Data import script
├── requirements.txt                  # Python dependencies for scripts
│
└── crm_generated_data/              # Generated data (after running scripts)
    ├── companies.json
    ├── contacts.json
    ├── leads.json
    ├── deals.json
    ├── tasks.json
    ├── products.json
    ├── quotes.json
    ├── invoices.json
    ├── events.json
    └── documents.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Java** 17+ and Maven
- **Python** 3.9+
- **PostgreSQL** 14+
- **Git**

### Quick Start (All Services)

```bash
# 1. Clone the repository
git clone <repo-url>
cd CRM-React

# 2. Install frontend dependencies
npm install

# 3. Start PostgreSQL (ensure it's running)

# 4. Start backend (in separate terminal)
cd backend
./mvnw spring-boot:run

# 5. Start AI service (in separate terminal)
cd ai-service
pip install -r requirements.txt
python main.py

# 6. Start frontend (in separate terminal)
cd CRM-React
npm run dev

# Frontend: http://localhost:5173
# Backend: http://localhost:8080
# AI Service: http://localhost:8000
```

---

## 🔧 Backend Setup (Spring Boot)

### 1. Database Configuration

Create PostgreSQL database:

```sql
CREATE DATABASE crm_db;
CREATE USER crm_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE crm_db TO crm_user;
```

### 2. Configure Application Properties

`backend/src/main/resources/application.properties`:

```properties
# Database Configuration
spring.datasource.url=jdbc:postgresql://localhost:5432/crm_db
spring.datasource.username=crm_user
spring.datasource.password=your_password
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true

# JWT Configuration
jwt.secret=your-secret-key-change-this-in-production
jwt.expiration=86400000

# Server Configuration
server.port=8080

# CORS Configuration
cors.allowed-origins=http://localhost:5173
```

### 3. Build & Run Backend

```bash
cd backend

# Build the project
./mvnw clean install

# Run the application
./mvnw spring-boot:run

# Or run the JAR
java -jar target/crm-backend-0.0.1-SNAPSHOT.jar
```

### 4. Backend API Endpoints

Base URL: `http://localhost:8080/api`

#### Authentication
- `POST /auth/login` - Login (returns JWT token)
- `POST /auth/register` - Register new user
- `POST /auth/refresh` - Refresh JWT token

#### CRM Entities (All follow RESTful conventions)
- `/leads` - Lead management
- `/contacts` - Contact management
- `/companies` - Company management
- `/deals` - Deal management
- `/tasks` - Task management
- `/products` - Product management
- `/quotes` - Quote management
- `/invoices` - Invoice management
- `/calendar` - Event management
- `/documents` - Document management

Each endpoint supports:
- `GET /` - List all (with pagination & search)
- `GET /{id}` - Get by ID
- `POST /` - Create new
- `PUT /{id}` - Update existing
- `DELETE /{id}` - Delete

### 5. Key Backend Components

**Controllers** (`controller/`):
- Handle HTTP requests
- Input validation
- Call service layer

**Services** (`service/`):
- Business logic
- Transaction management
- Call repositories

**Repositories** (`repository/`):
- JPA data access
- Custom queries

**Entities** (`entity/`):
- Database models
- JPA annotations

**DTOs** (`dto/`):
- Request/response objects
- Separate from entities

**Mappers** (`mapper/`):
- MapStruct mappers
- Entity ↔ DTO conversion
- **Important**: Use explicit `@Mapping` for field name mismatches

**Security** (`security/`):
- JWT token generation/validation
- Authentication filters
- CORS configuration

---

## 🤖 AI Service Setup (Python FastAPI)

### 1. Directory Structure

```
ai-service/
├── main.py                    # FastAPI app entry point
├── requirements.txt           # Python dependencies
├── .env                       # Environment variables
├── agents/                    # AI agents (future)
└── models/                    # ML models (future)
```

### 2. Install Dependencies

```bash
cd ai-service

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

`requirements.txt`:
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
python-dotenv==1.0.0
openai==1.3.0
anthropic==0.7.0
httpx==0.25.0
```

### 3. Configure Environment

`.env` file:
```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-...

# Or Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-...

# Server Configuration
HOST=0.0.0.0
PORT=8000

# JWT Secret (must match backend)
JWT_SECRET=your-secret-key-change-this-in-production

# Model Selection
LLM_PROVIDER=openai  # or anthropic
LLM_MODEL=gpt-4-turbo-preview  # or claude-3-opus-20240229
```

### 4. Run AI Service

```bash
# Development mode (auto-reload)
uvicorn main:app --reload --port 8000

# Production mode
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 5. AI Service Endpoints

Base URL: `http://localhost:8000`

- `GET /health` - Health check
- `POST /api/chat` - Chat endpoint (streaming SSE)
- `POST /api/insights` - Generate insights
- `POST /api/analyze-deal` - Deal analysis (future)
- `POST /api/score-lead` - Lead scoring (future)

### 6. Chat Endpoint Example

**Request**:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Show me top 5 deals"
    }
  ],
  "context": {
    "user_id": "123",
    "crm_data": {}
  }
}
```

**Response** (Server-Sent Events):
```
event: token
data: {"content": "Here"}

event: token
data: {"content": " are"}

event: token
data: {"content": " the"}

event: done
data: {"status": "complete"}
```

### 7. AI Service Architecture

**Current Implementation**:
```python
# main.py structure
├── FastAPI app setup
├── JWT authentication middleware
├── /chat endpoint (streaming)
│   ├── Validate JWT token
│   ├── Stream LLM responses via SSE
│   └── Return structured responses
├── /insights endpoint
│   └── Generate contextual insights
└── CORS configuration
```

**Streaming Flow**:
1. Frontend sends message array
2. AI service validates JWT
3. Calls LLM API (OpenAI/Claude)
4. Streams response via SSE
5. Frontend renders markdown in real-time

---

## ⚛️ Frontend Setup (React + TypeScript)

### 1. Install Dependencies

```bash
npm install
```

Key dependencies:
- `react` + `react-dom` - UI framework
- `react-router-dom` - Routing
- `@tanstack/react-query` - Server state
- `zustand` - Client state
- `axios` - HTTP client
- `lucide-react` - Icons
- `react-markdown` - Markdown rendering
- `tailwindcss` - Styling

### 2. Environment Variables

`.env` file:
```bash
VITE_API_URL=http://localhost:8080/api
VITE_AI_API_URL=http://localhost:8000
```

### 3. Run Development Server

```bash
npm run dev
```

Access at: `http://localhost:5173`

### 4. Build for Production

```bash
npm run build
npm run preview  # Preview production build
```

### 5. Key Frontend Concepts

**State Management**:
- **Server State** (TanStack Query):
  - Fetching data from backend
  - Caching & automatic refetching
  - Background polling (refetchInterval)
  
- **Client State** (Zustand):
  - Chat messages (persisted to localStorage)
  - UI state (modals, filters, etc.)

**API Integration**:
```typescript
// lib/api.ts - Backend API
export const dealsApi = {
  getAll: (params) => axios.get('/deals', { params }),
  create: (data) => axios.post('/deals', data),
  update: (id, data) => axios.put(`/deals/${id}`, data),
  delete: (id) => axios.delete(`/deals/${id}`),
};

// lib/ai-api.ts - AI Service
export async function* streamAgenticResponse(
  messages: Message[]
): AsyncGenerator<StreamEvent> {
  // SSE streaming implementation
}
```

**Badge System**:
```typescript
// Each page calculates badges based on data
const getDealBadges = (deal: Deal) => {
  const badges = [];
  
  // Hot deal
  if (deal.value > 50000 && deal.probability > 70) {
    badges.push({ type: 'hot' });
  }
  
  // Closing soon
  const daysUntilClose = calculateDays(deal.expectedCloseDate);
  if (daysUntilClose <= 7) {
    badges.push({ type: 'closing_soon', label: `${daysUntilClose}d` });
  }
  
  return badges;
};
```

**Background Polling**:
```typescript
const { data } = useQuery({
  queryKey: ['deals'],
  queryFn: () => dealsApi.getAll(),
  refetchInterval: 60000, // 60 seconds
});
```

---

## 📊 Data Generation & Import

### 1. Generate Realistic Data

```bash
# Install Python dependencies
pip install faker requests

# Generate data (creates 16,500+ records)
python generate_crm_data.py
```

This creates:
- 500 companies
- 2,000 contacts
- 3,000 leads
- 1,500 deals
- 5,000 tasks
- 100 products
- 800 quotes
- 600 invoices
- 2,000 events
- 1,000 documents

Output: `crm_generated_data/*.json`

### 2. Import Data to Backend

```bash
# Ensure backend is running first!
python import_crm_data.py

# Follow prompts:
# - Backend URL: http://localhost:8080/api
# - Data directory: crm_generated_data
```

Import takes 2-5 minutes depending on system.

### 3. Customizing Data Generation

Edit `generate_crm_data.py`:

```python
CONFIG = {
    'companies': 1000,      # Increase/decrease
    'contacts': 5000,
    'leads': 10000,
    'deals': 3000,
    'historical_months': 24,  # 2 years of data
}
```

See [DATA_GENERATION_GUIDE.md](./DATA_GENERATION_GUIDE.md) for details.

---

## 🤖 AI Agents Architecture

### Planned Agents

#### 1. **Lead Scoring Agent**
- **Purpose**: Automatically score leads 0-100 based on conversion likelihood
- **Triggers**: New lead created, lead data updated
- **ML Model**: XGBoost/LightGBM trained on historical conversions
- **Features**:
  - Company size, industry, location
  - Engagement level (email opens, clicks)
  - Behavioral signals (downloads, demo requests)
  - Fit with Ideal Customer Profile

#### 2. **Sales Forecasting Agent**
- **Purpose**: Predict revenue for future periods
- **Triggers**: Daily/weekly scheduled job
- **ML Model**: Time series (Prophet) + classification (deal win probability)
- **Output**:
  - Revenue forecast by month/quarter
  - Individual deal close probability
  - Pipeline velocity metrics

#### 3. **Deal Optimization Agent**
- **Purpose**: Identify stuck deals, recommend actions
- **Triggers**: Hourly analysis of active deals
- **Logic**:
  - Analyze time in stage
  - Compare to historical patterns
  - Identify risk factors
  - Suggest next best actions

### Implementation Plan

**Phase 1** (Current): Infrastructure
- ✅ FastAPI service running
- ✅ JWT authentication
- ✅ Chat endpoint working
- ⏳ Add Celery + Redis for background jobs

**Phase 2** (Next): Lead Scoring
- Data export for training
- Train ML model on historical data
- Deploy model to AI service
- Create scoring endpoint
- Integrate with frontend badges

**Phase 3**: Forecasting
- Collect deal velocity data
- Train time series model
- Create forecast endpoint
- Build forecast dashboard

**Phase 4**: Deal Optimization
- Implement deal health checks
- Create recommendation engine
- Add action suggestions to UI

---

## 🔄 Development Workflow

### 1. Adding a New Page

```typescript
// 1. Create page component
// src/pages/NewPage.tsx
export default function NewPage() {
  return <div>New Page</div>;
}

// 2. Add route in App.tsx
<Route path="/new-page" element={<NewPage />} />

// 3. Add navigation in Sidebar.tsx
{ icon: NewIcon, label: 'New Page', path: '/new-page' }
```

### 2. Adding a New Entity

**Backend**:
```java
// 1. Create Entity (entity/NewEntity.java)
@Entity
public class NewEntity {
  @Id @GeneratedValue
  private Long id;
  // fields...
}

// 2. Create Repository (repository/NewEntityRepository.java)
public interface NewEntityRepository extends JpaRepository<NewEntity, Long> {}

// 3. Create DTO (dto/NewEntityDto.java)
public class NewEntityDto {
  // fields matching entity
}

// 4. Create Mapper (mapper/NewEntityMapper.java)
@Mapper(componentModel = "spring")
public interface NewEntityMapper {
  NewEntityDto toDto(NewEntity entity);
  NewEntity toEntity(NewEntityDto dto);
}

// 5. Create Service (service/NewEntityService.java)
@Service
public class NewEntityService {
  // business logic
}

// 6. Create Controller (controller/NewEntityController.java)
@RestController
@RequestMapping("/api/new-entities")
public class NewEntityController {
  // REST endpoints
}
```

**Frontend**:
```typescript
// 1. Add type (lib/types.ts)
export interface NewEntity {
  id: string;
  name: string;
  // other fields
}

// 2. Add API functions (lib/api.ts)
export const newEntitiesApi = {
  getAll: (params) => axios.get('/new-entities', { params }),
  create: (data) => axios.post('/new-entities', data),
  // etc.
};

// 3. Create form (components/forms/NewEntityForm.tsx)
export function NewEntityForm({ ... }) {
  // form component
}

// 4. Create page (pages/NewEntities.tsx)
export default function NewEntitiesPage() {
  const { data } = useQuery({
    queryKey: ['new-entities'],
    queryFn: () => newEntitiesApi.getAll(),
  });
  // render list
}
```

### 3. Adding Insight Badges

```typescript
// In your page component
const getBadges = (item: YourType) => {
  const badges = [];
  
  if (/* condition */) {
    badges.push({ 
      type: 'overdue' | 'hot' | 'stuck' | 'at_risk' | 'closing_soon' | 'inactive',
      label: 'optional label' 
    });
  }
  
  return badges;
};

// In JSX
{getBadges(item).map((badge, idx) => (
  <InsightBadge key={idx} type={badge.type} label={badge.label} />
))}
```

### 4. Adding Background Polling

```typescript
const { data } = useQuery({
  queryKey: ['your-entity'],
  queryFn: () => yourApi.getAll(),
  refetchInterval: 30000, // 30 seconds in milliseconds
});
```

---

## 🎯 Next Steps & Roadmap

### Immediate Next Steps (Week 1-2)

1. **Generate & Import Test Data**
   - Run data generation scripts
   - Import into database
   - Verify all relationships
   - Test badge system with real data

2. **Deploy AI Agents Infrastructure**
   - Set up Celery + Redis
   - Implement background job scheduling
   - Create agent base classes

3. **Implement Lead Scoring Agent**
   - Export historical lead data
   - Train initial model
   - Deploy scoring endpoint
   - Add score display to frontend

### Short Term (Month 1)

- [ ] Lead scoring agent (fully functional)
- [ ] Deal health monitoring
- [ ] Email integration (send/receive)
- [ ] Advanced reporting (charts, exports)
- [ ] Mobile-responsive improvements
- [ ] User permissions & roles

### Medium Term (Month 2-3)

- [ ] Sales forecasting agent
- [ ] Revenue predictions dashboard
- [ ] Activity feed/timeline
- [ ] File upload for documents
- [ ] Email templates
- [ ] Automated workflows

### Long Term (Month 4-6)

- [ ] Deal optimization agent
- [ ] Market intelligence integration
- [ ] Advanced analytics & BI
- [ ] Mobile app (React Native)
- [ ] Integrations (Gmail, Outlook, Slack)
- [ ] Multi-tenancy support

---

## 🐛 Troubleshooting

### Common Issues

#### Backend won't start
```
Error: Could not connect to database
```
**Solution**: Check PostgreSQL is running and credentials in `application.properties` are correct.

#### Frontend API calls fail
```
Error: Network Error / CORS Error
```
**Solution**: 
1. Ensure backend is running on port 8080
2. Check CORS configuration in backend
3. Verify `VITE_API_URL` in `.env`

#### AI chat not working
```
Error: Connection refused to AI service
```
**Solution**:
1. Start AI service: `python main.py`
2. Check `VITE_AI_API_URL` in `.env`
3. Verify OpenAI/Claude API key in AI service `.env`

#### Badges not showing
**Possible causes**:
1. No data meeting badge conditions (check data quality)
2. Background polling not working (check browser console)
3. Badge logic thresholds too strict (adjust in page components)

#### Chat messages not persisting
**Solution**: Check browser localStorage, clear if corrupted:
```javascript
localStorage.removeItem('crm-chat-storage');
```

#### MapStruct compilation errors
```
Error: Unknown property in target type
```
**Solution**: Add explicit `@Mapping` annotations in mapper:
```java
@Mapping(source = "sourceField", target = "targetField")
```

### Debug Tools

**Frontend Debug Panel** (Dev mode only):
- Shows auth state, token info
- Available bottom-right corner

**Backend Logs**:
```bash
# Enable SQL logging
spring.jpa.show-sql=true
logging.level.org.hibernate.SQL=DEBUG
```

**AI Service Logs**:
```bash
# Add to main.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

---

## 📞 Contact & Support

For questions or issues:
1. Check this README first
2. Review relevant documentation files
3. Check GitHub issues
4. Contact development team

---

## 📄 License

[Your License Here]

---

**Last Updated**: January 16, 2026

**Version**: 1.0.0

**Status**: Active Development 🚧

---

## Quick Reference

### Essential Commands

```bash
# Frontend
npm install              # Install dependencies
npm run dev             # Start dev server
npm run build           # Production build

# Backend
./mvnw spring-boot:run  # Start backend
./mvnw clean install    # Build project

# AI Service
python main.py          # Start AI service
pip install -r requirements.txt  # Install deps

# Data
python generate_crm_data.py   # Generate data
python import_crm_data.py     # Import data
```

### Key URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8080/api
- **AI Service**: http://localhost:8000
- **Database**: postgresql://localhost:5432/crm_db

---

**Happy Coding! 🚀**
