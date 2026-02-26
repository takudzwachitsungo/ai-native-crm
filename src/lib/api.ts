import { apiClient } from './api-client';
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  Lead,
  Deal,
  Company,
  Contact,
  Task,
  Event,
  Product,
  Quote,
  Invoice,
  Email,
  PageResponse,
  TenantUser,
  UserRole,
} from './types';

// AI Service URL from environment
const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

// Auth API
export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post('/api/v1/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post('/api/v1/auth/register', data);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

// Generic CRUD operations
const createCrudApi = <T>(endpoint: string) => ({
  getAll: async (params?: {
    page?: number;
    size?: number;
    search?: string;
    sort?: string;
  }): Promise<PageResponse<T>> => {
    const response = await apiClient.get(endpoint, { params });
    return response.data;
  },

  getById: async (id: string): Promise<T> => {
    const response = await apiClient.get(`${endpoint}/${id}`);
    return response.data;
  },

  create: async (data: Partial<T>): Promise<T> => {
    const response = await apiClient.post(endpoint, data);
    return response.data;
  },

  update: async (id: string, data: Partial<T>): Promise<T> => {
    const response = await apiClient.put(`${endpoint}/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${endpoint}/${id}`);
  },
});

// Entity-specific APIs
export const leadsApi = {
  ...createCrudApi<Lead>('/api/v1/leads'),
  
  convertToCustomer: async (id: string): Promise<void> => {
    await apiClient.post(`/api/v1/leads/${id}/convert`);
  },

  updateScore: async (id: string, score: number): Promise<Lead> => {
    const response = await apiClient.put(`/api/v1/leads/${id}/score`, { score });
    return response.data;
  },
};

export const dealsApi = {
  ...createCrudApi<Deal>('/api/v1/deals'),
  
  updateStage: async (id: string, stage: Deal['stage']): Promise<Deal> => {
    const response = await apiClient.put(`/api/v1/deals/${id}/stage`, { stage });
    return response.data;
  },

  getPipeline: async (): Promise<{ stage: string; count: number; value: number }[]> => {
    const response = await apiClient.get('/api/v1/deals/pipeline');
    return response.data;
  },
};

export const companiesApi = createCrudApi<Company>('/api/v1/companies');
export const contactsApi = createCrudApi<Contact>('/api/v1/contacts');
export const tasksApi = createCrudApi<Task>('/api/v1/tasks');
export const eventsApi = createCrudApi<Event>('/api/v1/events');
export const productsApi = createCrudApi<Product>('/api/v1/products');
export const quotesApi = createCrudApi<Quote>('/api/v1/quotes');
export const invoicesApi = createCrudApi<Invoice>('/api/v1/invoices');

// Tenant user management API (admin only)
export const usersApi = {
  getAll: async (params?: { page?: number; size?: number; sort?: string }): Promise<PageResponse<TenantUser>> => {
    const response = await apiClient.get('/api/v1/users', { params });
    return response.data;
  },

  create: async (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: UserRole;
    isActive?: boolean;
  }): Promise<TenantUser> => {
    const response = await apiClient.post('/api/v1/users', data);
    return response.data;
  },

  updateRole: async (id: string, role: UserRole): Promise<TenantUser> => {
    const response = await apiClient.patch(`/api/v1/users/${id}/role`, { role });
    return response.data;
  },

  updateStatus: async (id: string, isActive: boolean): Promise<TenantUser> => {
    const response = await apiClient.patch(`/api/v1/users/${id}/status`, { isActive });
    return response.data;
  },
};

// Email API
export const emailsApi = {
  ...createCrudApi<Email>('/api/v1/emails'),
  
  send: async (id: string): Promise<Email> => {
    const response = await apiClient.post(`/api/v1/emails/${id}/send`);
    return response.data;
  },

  markAsRead: async (id: string): Promise<Email> => {
    const response = await apiClient.patch(`/api/v1/emails/${id}/mark-read`);
    return response.data;
  },

  markAsUnread: async (id: string): Promise<Email> => {
    const response = await apiClient.patch(`/api/v1/emails/${id}/mark-unread`);
    return response.data;
  },

  moveToFolder: async (id: string, folder: string): Promise<Email> => {
    const response = await apiClient.patch(`/api/v1/emails/${id}/move-to-folder`, { folder });
    return response.data;
  },

  bulkDelete: async (ids: string[]): Promise<void> => {
    await apiClient.post('/api/v1/emails/bulk-delete', { ids });
  },
};

// Dashboard API
export const dashboardApi = {
  getStats: async (): Promise<{
    totalLeads: number;
    totalDeals: number;
    totalRevenue: number;
    conversionRate: number;
    winRate: number;
  }> => {
    const response = await apiClient.get('/api/v1/dashboard/stats');
    return response.data;
  },

  getRecentActivity: async (): Promise<any[]> => {
    const response = await apiClient.get('/api/v1/dashboard/activity');
    return response.data;
  },
};

// Search API
export const searchApi = {
  search: async (query: string, filters?: any): Promise<any> => {
    const response = await apiClient.post('/api/v1/search', { query, filters });
    return response.data;
  },
};

// AI Agent API
export const aiAgentApi = {
  scoreLead: async (leadId: string): Promise<{
    success: boolean;
    lead_id: string;
    score?: number;
    score_breakdown?: Record<string, any>;
    qualification?: string;
    recommended_actions?: string[];
    draft_email?: string;
    task_created?: boolean;
    error?: string;
  }> => {
    const response = await apiClient.post(`${AI_API_URL}/agents/score-lead`, 
      { lead_id: leadId },
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      }
    );
    return response.data;
  },

  batchScoreLeads: async (): Promise<{
    success: boolean;
    total_leads: number;
    successful: number;
    failed: number;
    results: any[];
  }> => {
    const response = await apiClient.post(`${AI_API_URL}/agents/batch-score-leads`, 
      {},
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      }
    );
    return response.data;
  },
};

// Forecasting API
export const forecastingApi = {
  generate: async (forecastMonths: number = 6): Promise<{
    success: boolean;
    monthly_forecasts?: Array<{
      month: string;
      month_date: string;
      pipeline: number;
      forecast: number;
      actual: number;
      quota: number;
    }>;
    team_forecasts?: Array<{
      name: string;
      quota: number;
      forecast: number;
      closed: number;
      pipeline: number;
      attainment: number;
    }>;
    weighted_pipeline?: number;
    total_quota?: number;
    forecast_vs_quota?: number;
    insights?: string[];
    risks?: Array<{
      deal_id: string;
      title: string;
      value: number;
      stage: string;
      age_days: number;
      reason: string;
    }>;
    opportunities?: Array<{
      deal_id: string;
      title: string;
      value: number;
      probability: number;
      weighted_value: number;
      stage: string;
      reason: string;
    }>;
    recommendations?: string[];
    stage_conversion_rates?: Record<string, number>;
    cached?: boolean;
    cache_age_seconds?: number;
    generated_at?: string;
    error?: string;
  }> => {
    const response = await apiClient.post(`${AI_API_URL}/forecasting/generate`, 
      { forecast_months: forecastMonths },
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      }
    );
    return response.data;
  },

  getLatest: async (): Promise<{
    success: boolean;
    monthly_forecasts?: Array<any>;
    team_forecasts?: Array<any>;
    weighted_pipeline?: number;
    total_quota?: number;
    forecast_vs_quota?: number;
    insights?: string[];
    risks?: Array<any>;
    opportunities?: Array<any>;
    recommendations?: string[];
    cached?: boolean;
    cache_age_seconds?: number;
    generated_at?: string;
    error?: string;
  }> => {
    const response = await apiClient.get(`${AI_API_URL}/forecasting/latest`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      }
    );
    return response.data;
  },
};

// Reports API
export const reportsApi = {
  generate: async (params: {
    report_type: string;
    custom_query?: string;
    date_range?: { start: string; end: string };
    filters?: Record<string, any>;
  }): Promise<{
    success: boolean;
    report_type: string;
    title: string;
    summary: string;
    date_range: { start: string; end: string };
    metrics: Record<string, any>;
    charts: Array<{
      type: string;
      title: string;
      data: any;
      xAxis?: string;
      yAxis?: string;
    }>;
    insights: string[];
    recommendations: string[];
    sections: Array<{
      title: string;
      type: string;
      content: any;
    }>;
    generated_at: string;
    error?: string;
  }> => {
    const response = await apiClient.post(`${AI_API_URL}/reports/generate`, params, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      }
    });
    return response.data;
  },

  getTemplates: async (): Promise<{
    success: boolean;
    templates: Array<{
      id: string;
      title: string;
      description: string;
      data_requirements: string[];
      metrics: string[];
    }>;
  }> => {
    const response = await apiClient.get(`${AI_API_URL}/reports/templates`);
    return response.data;
  },
};
