# 🎨 Frontend (UI) Architecture Guide

> **Complete technical guide to the React frontend, API integration, state management, and UI components**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Diagram](#architecture-diagram)
4. [Project Structure](#project-structure)
5. [API Integration Layer](#api-integration-layer)
6. [Authentication & Token Management](#authentication--token-management)
7. [State Management](#state-management)
8. [Component Architecture](#component-architecture)
9. [Routing & Navigation](#routing--navigation)
10. [Chat Integration (AI Service)](#chat-integration-ai-service)
11. [Data Flow Examples](#data-flow-examples)
12. [Key Features Implementation](#key-features-implementation)
13. [Performance Optimization](#performance-optimization)
14. [Adding New Features](#adding-new-features)

---

## 🎯 Overview

The frontend is a **React 18 + TypeScript** single-page application (SPA) built with **Vite** for fast development and optimized builds. It communicates with two backend services:

1. **Spring Boot Backend** (Port 8080): CRM data, authentication, business logic
2. **AI Service** (Port 8000): Chat assistant, reports, semantic search

### Architecture Philosophy

- **Component-based**: Reusable UI components with clear responsibilities
- **Type-safe**: TypeScript for compile-time error detection
- **Responsive**: TailwindCSS for mobile-first design
- **Real-time**: SSE (Server-Sent Events) for chat streaming
- **Optimistic UI**: Immediate feedback with background sync

---

## 🛠️ Technology Stack

```typescript
{
  "framework": "React 18.3.1",
  "language": "TypeScript 5.5.3",
  "buildTool": "Vite 5.4.2",
  "styling": "TailwindCSS 3.4.1",
  "routing": "React Router DOM 6.x",
  "icons": "Lucide React",
  "charts": "Recharts 2.12.7",
  "state": "React Hooks (useState, useEffect, useContext)",
  "http": "Fetch API (native)",
  "realtime": "EventSource (SSE)"
}
```

### Key Dependencies

```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.26.2",
  "typescript": "^5.5.3",
  "vite": "^5.4.2",
  "tailwindcss": "^3.4.1",
  "lucide-react": "^0.446.0",
  "recharts": "^2.12.7"
}
```

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    BROWSER (http://localhost:5173)               │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                     React Application                       │ │
│  │                                                             │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │   Pages      │  │  Components  │  │    Utils     │    │ │
│  │  │              │  │              │  │              │    │ │
│  │  │ - Dashboard  │  │ - Header     │  │ - API client │    │ │
│  │  │ - Leads      │  │ - Sidebar    │  │ - Auth       │    │ │
│  │  │ - Deals      │  │ - Forms      │  │ - Helpers    │    │ │
│  │  │ - Chat       │  │ - Tables     │  │              │    │ │
│  │  │ - Reports    │  │ - Modals     │  │              │    │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │ │
│  │                           │                               │ │
│  └───────────────────────────┼───────────────────────────────┘ │
│                              │                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                               │ HTTP/HTTPS Requests
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Spring Boot     │  │  AI Service     │  │  Static Assets  │
│ Backend         │  │  (FastAPI)      │  │  (CDN/S3)       │
│ :8080           │  │  :8000          │  │                 │
│                 │  │                 │  │ - Images        │
│ REST API:       │  │ Endpoints:      │  │ - Fonts         │
│ /api/v1/leads   │  │ /chat (SSE)     │  │ - Icons         │
│ /api/v1/deals   │  │ /reports/gen    │  │                 │
│ /api/v1/contacts│  │ /search/sem     │  │                 │
│ /api/v1/auth    │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
        │                      │
        │                      │
        ▼                      ▼
┌─────────────────────────────────┐
│       PostgreSQL Database        │
│       + pgvector extension       │
│                                  │
│ - CRM Tables (leads, deals, etc) │
│ - Vector Embeddings              │
└─────────────────────────────────┘
```

---

## 📁 Project Structure

```
src/
├── main.tsx                    # Application entry point
├── App.tsx                     # Root component with routing
├── index.css                   # Global styles & Tailwind imports
│
├── assets/                     # Static assets (images, icons)
│
├── components/                 # Reusable UI components
│   ├── Header.tsx             # Top navigation bar
│   ├── Sidebar.tsx            # Left navigation menu
│   ├── MainMenu.tsx           # Mobile menu
│   ├── Modal.tsx              # Generic modal component
│   ├── Toast.tsx              # Notification system
│   ├── SortableTable.tsx      # Data table with sorting
│   ├── DetailSidebar.tsx      # Right-side detail panel
│   ├── EmptyState.tsx         # Empty state placeholder
│   ├── ErrorBoundary.tsx      # Error boundary wrapper
│   ├── LoadingSkeleton.tsx    # Loading placeholders
│   ├── CommandPalette.tsx     # Cmd+K quick actions
│   ├── AdvancedFilters.tsx    # Filter panel
│   ├── BulkActionsBar.tsx     # Bulk operations bar
│   ├── ChatAssistant.tsx      # AI chat interface
│   ├── Widgets.tsx            # Dashboard widgets
│   ├── PageLayout.tsx         # Page wrapper layout
│   ├── icons.tsx              # Icon components
│   │
│   ├── forms/                 # Form components for entities
│   │   ├── index.ts           # Export all forms
│   │   ├── LeadForm.tsx       # Lead creation/edit form
│   │   ├── DealForm.tsx       # Deal creation/edit form
│   │   ├── ContactForm.tsx    # Contact creation/edit form
│   │   ├── CompanyForm.tsx    # Company creation/edit form
│   │   ├── TaskForm.tsx       # Task creation/edit form
│   │   ├── EventForm.tsx      # Event/meeting form
│   │   ├── ProductForm.tsx    # Product form
│   │   ├── QuoteForm.tsx      # Quote form
│   │   ├── InvoiceForm.tsx    # Invoice form
│   │   ├── EmailComposeModal.tsx     # Email composer
│   │   └── DocumentUploadModal.tsx   # File upload
│   │
│   └── layout/                # Layout components
│
├── pages/                     # Page components (routes)
│   ├── Dashboard.tsx          # Main dashboard (/)
│   ├── Leads.tsx              # Leads management (/leads)
│   ├── Deals.tsx              # Deals pipeline (/deals)
│   ├── Contacts.tsx           # Contacts directory (/contacts)
│   ├── Companies.tsx          # Companies (/companies)
│   ├── Tasks.tsx              # Task management (/tasks)
│   ├── Calendar.tsx           # Calendar view (/calendar)
│   ├── Email.tsx              # Email client (/email)
│   ├── Documents.tsx          # Document library (/documents)
│   ├── Products.tsx           # Product catalog (/products)
│   ├── Quotes.tsx             # Quote management (/quotes)
│   ├── Invoices.tsx           # Invoice management (/invoices)
│   ├── Pipeline.tsx           # Sales pipeline (/pipeline)
│   ├── Forecasting.tsx        # Sales forecasting (/forecasting)
│   ├── Reports.tsx            # Reports & analytics (/reports)
│   ├── Chat.tsx               # AI chat assistant (/chat)
│   └── Settings.tsx           # User settings (/settings)
│
└── lib/                       # Utility functions & helpers
    ├── utils.ts               # General utilities (classNames, etc)
    └── helpers.ts             # Helper functions
```

---

## 🔌 API Integration Layer

### Base Configuration

All API calls are centralized for consistency and easier maintenance:

```typescript
// Configuration constants (typically in utils.ts or separate config)
const API_BASE_URL = 'http://localhost:8080/api/v1';
const AI_SERVICE_URL = 'http://localhost:8000';

// Get authentication token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

// Get authorization headers
const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};
```

---

### API Call Pattern

**Standard REST API Call to Spring Boot**:

```typescript
// Example: Fetch all leads
const fetchLeads = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/leads`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, redirect to login
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching leads:', error);
    throw error;
  }
};

// Example: Create a new lead
const createLead = async (leadData: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/leads`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(leadData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating lead:', error);
    throw error;
  }
};

// Example: Update a lead
const updateLead = async (leadId: string, leadData: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/leads/${leadId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(leadData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating lead:', error);
    throw error;
  }
};

// Example: Delete a lead
const deleteLead = async (leadId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/leads/${leadId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting lead:', error);
    throw error;
  }
};
```

---

### Component Usage Pattern

**How Pages/Components Use API Calls**:

```typescript
// Example: Leads.tsx page
import React, { useState, useEffect } from 'react';

const Leads: React.FC = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch leads on component mount
  useEffect(() => {
    const loadLeads = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:8080/api/v1/leads', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch leads');
        }

        const data = await response.json();
        setLeads(data);
      } catch (err) {
        setError(err.message);
        console.error('Error loading leads:', err);
      } finally {
        setLoading(false);
      }
    };

    loadLeads();
  }, []); // Empty dependency array = run once on mount

  // Handle create lead
  const handleCreateLead = async (leadData: any) => {
    try {
      const response = await fetch('http://localhost:8080/api/v1/leads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData),
      });

      if (!response.ok) {
        throw new Error('Failed to create lead');
      }

      const newLead = await response.json();
      
      // Update local state (optimistic UI)
      setLeads(prev => [...prev, newLead]);
      
      // Show success toast
      showToast('Lead created successfully', 'success');
    } catch (err) {
      showToast('Failed to create lead', 'error');
      console.error('Error creating lead:', err);
    }
  };

  // Handle update lead
  const handleUpdateLead = async (leadId: string, updates: any) => {
    try {
      const response = await fetch(`http://localhost:8080/api/v1/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update lead');
      }

      const updatedLead = await response.json();
      
      // Update local state
      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? updatedLead : lead
      ));
      
      showToast('Lead updated successfully', 'success');
    } catch (err) {
      showToast('Failed to update lead', 'error');
      console.error('Error updating lead:', err);
    }
  };

  // Handle delete lead
  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8080/api/v1/leads/${leadId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete lead');
      }

      // Update local state
      setLeads(prev => prev.filter(lead => lead.id !== leadId));
      
      showToast('Lead deleted successfully', 'success');
    } catch (err) {
      showToast('Failed to delete lead', 'error');
      console.error('Error deleting lead:', err);
    }
  };

  // Render loading state
  if (loading) {
    return <LoadingSkeleton />;
  }

  // Render error state
  if (error) {
    return <div className="error">{error}</div>;
  }

  // Render leads table
  return (
    <div className="leads-page">
      <Header 
        title="Leads" 
        onCreateClick={() => setShowCreateModal(true)} 
      />
      
      <SortableTable 
        data={leads}
        columns={columns}
        onEdit={handleUpdateLead}
        onDelete={handleDeleteLead}
      />

      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)}>
          <LeadForm onSubmit={handleCreateLead} />
        </Modal>
      )}
    </div>
  );
};

export default Leads;
```

---

## 🔐 Authentication & Token Management

### Login Flow

```typescript
// Login process
const handleLogin = async (email: string, password: string) => {
  try {
    const response = await fetch('http://localhost:8080/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Invalid credentials');
    }

    const data = await response.json();
    // Response: { token, refreshToken, user: { id, email, name, role } }

    // Store tokens
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));

    // Redirect to dashboard
    window.location.href = '/';
  } catch (error) {
    console.error('Login error:', error);
    alert('Login failed. Please check your credentials.');
  }
};
```

### Token Usage in Requests

```typescript
// Every API request includes token in header
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
};

// Example request
fetch('http://localhost:8080/api/v1/deals', { headers })
  .then(response => {
    if (response.status === 401) {
      // Token expired, logout
      localStorage.clear();
      window.location.href = '/login';
    }
    return response.json();
  });
```

### Protected Routes

```typescript
// ProtectedRoute component (typically in App.tsx or separate file)
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    // No token, redirect to login
    return <Navigate to="/login" replace />;
  }

  // Token exists, render children
  return <>{children}</>;
};

// Usage in App.tsx
<Routes>
  <Route path="/login" element={<Login />} />
  
  <Route path="/" element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  } />
  
  <Route path="/leads" element={
    <ProtectedRoute>
      <Leads />
    </ProtectedRoute>
  } />
</Routes>
```

### Logout Flow

```typescript
const handleLogout = () => {
  // Clear all stored data
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  
  // Redirect to login
  window.location.href = '/login';
};
```

---

## 💬 Chat Integration (AI Service)

### Server-Sent Events (SSE) for Streaming

The chat uses **SSE** for real-time streaming responses from the AI service:

```typescript
// ChatAssistant.tsx or Chat.tsx
const sendMessage = async (userMessage: string) => {
  // Add user message to chat
  const newMessages = [...messages, { role: 'user', content: userMessage }];
  setMessages(newMessages);

  try {
    // Create EventSource for SSE
    const eventSource = new EventSource(
      `http://localhost:8000/chat?message=${encodeURIComponent(userMessage)}&token=${localStorage.getItem('token')}`
    );

    let aiResponse = '';

    // Handle incoming message chunks
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'token') {
        // Accumulate tokens
        aiResponse += data.content;
        
        // Update UI with partial response (streaming effect)
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg?.role === 'assistant') {
            // Update existing assistant message
            return [
              ...prev.slice(0, -1),
              { role: 'assistant', content: aiResponse }
            ];
          } else {
            // Add new assistant message
            return [
              ...prev,
              { role: 'assistant', content: aiResponse }
            ];
          }
        });
      } else if (data.type === 'complete') {
        // Stream complete, close connection
        eventSource.close();
      } else if (data.type === 'error') {
        // Handle error
        eventSource.close();
        setError(data.message);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      eventSource.close();
      setError('Connection error. Please try again.');
    };

  } catch (error) {
    console.error('Chat error:', error);
    setError('Failed to send message');
  }
};
```

### Alternative: POST with Streaming (Fetch API)

```typescript
const sendMessageWithFetch = async (userMessage: string) => {
  try {
    const response = await fetch('http://localhost:8000/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [...messages, { role: 'user', content: userMessage }],
        context: { page: 'chat' },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    // Read response as stream
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let aiResponse = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        // Decode chunk
        const chunk = decoder.decode(value);
        
        // Parse SSE format: "data: {...}\n\n"
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.substring(6));
            
            if (data.type === 'token') {
              aiResponse += data.content;
              
              // Update UI
              setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg?.role === 'assistant') {
                  return [
                    ...prev.slice(0, -1),
                    { role: 'assistant', content: aiResponse }
                  ];
                } else {
                  return [
                    ...prev,
                    { role: 'assistant', content: aiResponse }
                  ];
                }
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Chat error:', error);
    setError('Failed to send message');
  }
};
```

---

## 📊 State Management

### Local Component State (useState)

Most components use React's built-in state management:

```typescript
const Leads: React.FC = () => {
  // State for leads data
  const [leads, setLeads] = useState<Lead[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  // Filter/sort state
  const [filters, setFilters] = useState({ status: 'all', search: '' });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // ... component logic
};
```

### Effect Hooks (useEffect)

Side effects like data fetching:

```typescript
// Fetch data on mount
useEffect(() => {
  fetchLeads();
}, []);

// Fetch data when filters change
useEffect(() => {
  fetchLeads(filters);
}, [filters]);

// Cleanup on unmount
useEffect(() => {
  const interval = setInterval(() => {
    refreshData();
  }, 30000); // Refresh every 30s

  return () => clearInterval(interval);
}, []);
```

### Context API (Optional)

For global state (user, theme, etc.):

```typescript
// Create context
const UserContext = React.createContext<User | null>(null);

// Provider in App.tsx
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  return (
    <UserContext.Provider value={user}>
      <Router>
        {/* Routes */}
      </Router>
    </UserContext.Provider>
  );
};

// Use in components
const Header: React.FC = () => {
  const user = React.useContext(UserContext);
  
  return (
    <header>
      <span>Welcome, {user?.name}</span>
    </header>
  );
};
```

---

## 🧩 Component Architecture

### Page Components

**Purpose**: Route-level components that represent full pages

**Example**: `Leads.tsx`
```typescript
const Leads: React.FC = () => {
  // Data state
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [showModal, setShowModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  // Fetch data
  useEffect(() => {
    fetchLeads();
  }, []);

  return (
    <PageLayout title="Leads">
      <div className="leads-header">
        <button onClick={() => setShowModal(true)}>Create Lead</button>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <SortableTable 
          data={leads}
          columns={columns}
          onRowClick={(lead) => setSelectedLead(lead)}
        />
      )}

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <LeadForm onSubmit={handleCreateLead} />
        </Modal>
      )}

      {selectedLead && (
        <DetailSidebar 
          data={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </PageLayout>
  );
};
```

---

### Reusable Components

#### SortableTable Component

**Purpose**: Generic data table with sorting, filtering, actions

```typescript
interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

interface SortableTableProps {
  data: any[];
  columns: Column[];
  onRowClick?: (row: any) => void;
  onEdit?: (row: any) => void;
  onDelete?: (id: string) => void;
}

const SortableTable: React.FC<SortableTableProps> = ({
  data,
  columns,
  onRowClick,
  onEdit,
  onDelete,
}) => {
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const sortedData = useMemo(() => {
    if (!sortBy) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [data, sortBy, sortOrder]);

  return (
    <table className="sortable-table">
      <thead>
        <tr>
          {columns.map(column => (
            <th key={column.key}>
              {column.sortable ? (
                <button onClick={() => {
                  setSortBy(column.key);
                  setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                }}>
                  {column.label}
                  {sortBy === column.key && (
                    <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              ) : (
                column.label
              )}
            </th>
          ))}
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {sortedData.map(row => (
          <tr key={row.id} onClick={() => onRowClick?.(row)}>
            {columns.map(column => (
              <td key={column.key}>
                {column.render ? column.render(row[column.key], row) : row[column.key]}
              </td>
            ))}
            <td>
              <button onClick={(e) => {
                e.stopPropagation();
                onEdit?.(row);
              }}>Edit</button>
              <button onClick={(e) => {
                e.stopPropagation();
                onDelete?.(row.id);
              }}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

#### Modal Component

**Purpose**: Generic modal wrapper

```typescript
interface ModalProps {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ title, onClose, children }) => {
  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          {title && <h2>{title}</h2>}
          <button onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};
```

---

## 🗺️ Routing & Navigation

### Routes Definition (App.tsx)

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
        <Route path="/deals" element={<ProtectedRoute><Deals /></ProtectedRoute>} />
        <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
        <Route path="/companies" element={<ProtectedRoute><Companies /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
        <Route path="/email" element={<ProtectedRoute><Email /></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
        <Route path="/quotes" element={<ProtectedRoute><Quotes /></ProtectedRoute>} />
        <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
        <Route path="/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
        <Route path="/forecasting" element={<ProtectedRoute><Forecasting /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
```

### Programmatic Navigation

```typescript
import { useNavigate } from 'react-router-dom';

const MyComponent: React.FC = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    // Navigate to leads page
    navigate('/leads');
    
    // Navigate with state
    navigate('/leads', { state: { fromDashboard: true } });
    
    // Navigate back
    navigate(-1);
  };

  return <button onClick={handleClick}>Go to Leads</button>;
};
```

---

## 📈 Data Flow Examples

### Example 1: Creating a Lead

```
User fills out form in LeadForm.tsx
        ↓
Click "Create Lead" button
        ↓
handleSubmit() in LeadForm
        ↓
POST /api/v1/leads
Body: { name, email, company, phone, status, score }
Headers: { Authorization: Bearer <token> }
        ↓
Spring Boot Backend
        ↓
Validates data
Creates Lead entity
Saves to PostgreSQL
        ↓
Returns 201 Created
Body: { id, name, email, ..., createdAt }
        ↓
Frontend receives response
        ↓
Updates local state: setLeads([...leads, newLead])
        ↓
Shows success toast
Closes modal
Refreshes table
```

### Example 2: Chat with AI Assistant

```
User types message in Chat.tsx
        ↓
Click "Send" button
        ↓
sendMessage(userMessage)
        ↓
Add user message to UI immediately
        ↓
POST /chat (AI Service)
Body: { messages: [...history, newMessage], context: {} }
Headers: { Authorization: Bearer <token> }
        ↓
AI Service (FastAPI)
        ↓
Initialize CRM Agent (LangGraph)
Parse query → Determine tools needed
        ↓
Call Spring Boot API (with same token)
GET /api/v1/leads?status=NEW
        ↓
Spring Boot validates token
Returns leads data
        ↓
AI Service processes data with LLM
        ↓
Stream response via SSE
data: {"type":"token","content":"I"}
data: {"type":"token","content":" found"}
data: {"type":"token","content":" 5"}
...
data: {"type":"complete"}
        ↓
Frontend receives stream
        ↓
Update UI with each token (streaming effect)
        ↓
Display complete AI response
```

### Example 3: Dashboard Data Loading

```
User navigates to Dashboard (/)
        ↓
Dashboard.tsx mounts
        ↓
useEffect() runs
        ↓
Parallel API calls:
- GET /api/v1/deals/summary
- GET /api/v1/leads/count
- GET /api/v1/tasks?status=pending
- GET /api/v1/events/upcoming
All with Authorization header
        ↓
Spring Boot Backend
        ↓
Validates token for each request
Queries PostgreSQL
Applies tenant isolation
        ↓
Returns data for each endpoint:
- deals: { total: 150, won: 45, lost: 20, ... }
- leads: { total: 234, new: 67, qualified: 89 }
- tasks: [{ id, title, dueDate }, ...]
- events: [{ id, title, startTime }, ...]
        ↓
Frontend receives all responses
        ↓
Update state for each widget:
setDealsData(...)
setLeadsData(...)
setTasks(...)
setEvents(...)
        ↓
Widgets render with data
        ↓
Dashboard displays complete view
```

---

## 🎯 Key Features Implementation

### 1. Report Generation

**Reports.tsx**:
```typescript
const Reports: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);

  const generateReport = async (reportType: string, customQuery?: string) => {
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:8000/reports/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          report_type: reportType,
          custom_query: customQuery,
          date_range: 'last_30_days',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const data = await response.json();
      setReport(data);
    } catch (error) {
      console.error('Report generation error:', error);
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reports-page">
      <div className="report-controls">
        <button onClick={() => generateReport('custom', 'meeting reports')}>
          Meeting Reports
        </button>
        <button onClick={() => generateReport('custom', 'sales performance')}>
          Sales Performance
        </button>
      </div>

      {loading && <LoadingSkeleton />}

      {report && (
        <div className="report-content">
          <h1>{report.title}</h1>
          <p>{report.summary}</p>

          {/* Render charts */}
          <div className="charts-grid">
            {report.charts?.map((chart, idx) => (
              <div key={idx} className="chart-card">
                <h3>{chart.title}</h3>
                {chart.type === 'bar' && (
                  <BarChart width={500} height={300} data={chart.data}>
                    <Bar dataKey="value" fill="#3b82f6" />
                    <XAxis dataKey="name" />
                    <YAxis />
                  </BarChart>
                )}
                {chart.type === 'pie' && (
                  <PieChart width={400} height={300}>
                    <Pie data={chart.data} dataKey="value" nameKey="name" />
                  </PieChart>
                )}
              </div>
            ))}
          </div>

          {/* Insights */}
          <div className="insights">
            <h2>Key Insights</h2>
            <ul>
              {report.insights?.map((insight, idx) => (
                <li key={idx}>{insight}</li>
              ))}
            </ul>
          </div>

          {/* Recommendations */}
          <div className="recommendations">
            <h2>Recommendations</h2>
            <ul>
              {report.recommendations?.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
```

---

### 2. Toast Notifications

**Toast.tsx**:
```typescript
let showToastFn: ((message: string, type: 'success' | 'error' | 'info') => void) | null = null;

export const Toast: React.FC = () => {
  const [toasts, setToasts] = useState<Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>>([]);

  useEffect(() => {
    showToastFn = (message, type) => {
      const id = Date.now().toString();
      setToasts(prev => [...prev, { id, message, type }]);

      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3000);
    };
  }, []);

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
};

// Global function to show toasts
export const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  if (showToastFn) {
    showToastFn(message, type);
  }
};
```

---

### 3. Command Palette (Cmd+K)

**CommandPalette.tsx**:
```typescript
const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  // Open on Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const commands = [
    { label: 'Go to Dashboard', action: () => navigate('/') },
    { label: 'Go to Leads', action: () => navigate('/leads') },
    { label: 'Go to Deals', action: () => navigate('/deals') },
    { label: 'Create New Lead', action: () => navigate('/leads?create=true') },
    { label: 'Open Chat', action: () => navigate('/chat') },
    { label: 'Generate Report', action: () => navigate('/reports') },
  ];

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={() => setIsOpen(false)}>
      <div className="command-palette" onClick={e => e.stopPropagation()}>
        <input
          type="text"
          placeholder="Type a command..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="command-list">
          {filteredCommands.map((cmd, idx) => (
            <div
              key={idx}
              className="command-item"
              onClick={() => {
                cmd.action();
                setIsOpen(false);
              }}
            >
              {cmd.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

---

## ⚡ Performance Optimization

### 1. Lazy Loading Routes

```typescript
import { lazy, Suspense } from 'react';

// Lazy load pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Leads = lazy(() => import('./pages/Leads'));
const Deals = lazy(() => import('./pages/Deals'));

// Use with Suspense
<Suspense fallback={<LoadingSkeleton />}>
  <Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/leads" element={<Leads />} />
    <Route path="/deals" element={<Deals />} />
  </Routes>
</Suspense>
```

### 2. Memoization

```typescript
import { useMemo, useCallback } from 'react';

const MyComponent: React.FC = () => {
  // Memoize expensive calculations
  const sortedData = useMemo(() => {
    return data.sort((a, b) => a.value - b.value);
  }, [data]);

  // Memoize callbacks
  const handleClick = useCallback(() => {
    doSomething(id);
  }, [id]);

  return <ExpensiveChild data={sortedData} onClick={handleClick} />;
};
```

### 3. Virtual Scrolling (for large lists)

```typescript
// For tables with 1000+ rows, consider react-window or react-virtualized
import { FixedSizeList } from 'react-window';

const VirtualTable: React.FC = ({ data }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      {data[index].name}
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={data.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};
```

---

## ➕ Adding New Features

### Step 1: Create Backend API Endpoint (Spring Boot)

```java
// In Spring Boot: LeadController.java
@GetMapping("/leads/recent")
public ResponseEntity<List<Lead>> getRecentLeads() {
    List<Lead> leads = leadService.getRecentLeads(10);
    return ResponseEntity.ok(leads);
}
```

### Step 2: Create Frontend API Call

```typescript
// In utils or services file
export const fetchRecentLeads = async () => {
  const response = await fetch('http://localhost:8080/api/v1/leads/recent', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch recent leads');
  }
  
  return response.json();
};
```

### Step 3: Use in Component

```typescript
const Dashboard: React.FC = () => {
  const [recentLeads, setRecentLeads] = useState([]);

  useEffect(() => {
    const loadRecentLeads = async () => {
      try {
        const leads = await fetchRecentLeads();
        setRecentLeads(leads);
      } catch (error) {
        console.error('Error loading recent leads:', error);
      }
    };

    loadRecentLeads();
  }, []);

  return (
    <div className="dashboard">
      <div className="recent-leads-widget">
        <h3>Recent Leads</h3>
        <ul>
          {recentLeads.map(lead => (
            <li key={lead.id}>{lead.name}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};
```

---

## 🎓 Summary

**Frontend Architecture**:
- **React + TypeScript + Vite** for modern, type-safe development
- **Component-based** with clear separation of concerns
- **Centralized API calls** with consistent error handling
- **JWT authentication** with token stored in localStorage
- **Real-time chat** using Server-Sent Events (SSE)
- **Responsive design** with TailwindCSS

**Communication Flow**:
```
React Component
    ↓
Fetch API (with JWT token)
    ↓
Spring Boot Backend (:8080) OR AI Service (:8000)
    ↓
PostgreSQL Database
```

**Key Files**:
- `App.tsx`: Routing and app structure
- `pages/*.tsx`: Route components (18 pages)
- `components/*.tsx`: Reusable UI components (36+ components)
- `components/forms/*.tsx`: Entity forms (11 forms)
- `lib/utils.ts`: API calls and utilities

**API Patterns**:
- **Spring Boot**: REST API with fetch/async-await
- **AI Service**: SSE streaming for chat, POST for reports
- **Auth**: JWT token in Authorization header for all requests

**State Management**:
- **useState**: Component-level state
- **useEffect**: Side effects (data fetching)
- **Context API**: Global state (optional)

---

**🎉 You now understand the complete frontend architecture and API integration!**
