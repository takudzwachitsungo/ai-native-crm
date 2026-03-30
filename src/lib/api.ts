import { apiClient } from './api-client';
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  Lead,
  Deal,
  DealApprovalActionRequest,
  DealAttentionSummary,
  DealAutomationResult,
  DealTerritoryQueueSummary,
  DealTerritoryReassignmentResult,
  Company,
  CompanyInsights,
  CompanyTerritoryQueueSummary,
  CompanyTerritoryReassignmentResult,
  Contact,
  Task,
  Event,
  Product,
  Quote,
  Invoice,
  Document,
  Email,
  EmailFolder,
  PageResponse,
  TenantUser,
  TenantDatabaseSettings,
  TenantDatabaseSettingsUpdateRequest,
  QuotaRiskAlertSummary,
  QuotaRiskAutomationResult,
  GovernanceDigestAutomationResult,
  GovernanceAutomationResult,
  GovernanceInboxSummary,
  GovernanceTaskAcknowledgementResult,
  TerritoryAutoRemediationResult,
  TerritoryEscalationAutomationResult,
  TerritoryEscalationSummary,
  TerritoryExceptionSummary,
  TerritoryExceptionAutomationResult,
  UserRole,
  RevenueOpsSummary,
  WorkspaceTerritory,
  AutomationRun,
  LeadIntakeWorkflowSettings,
  DealRescueWorkflowSettings,
  QuotaRiskWorkflowSettings,
  DealApprovalWorkflowSettings,
  GovernanceOpsWorkflowSettings,
  TerritoryEscalationWorkflowSettings,
} from './types';

// AI Service URL from environment
const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

function parseDownloadFilename(contentDisposition?: string): string | null {
  if (!contentDisposition) {
    return null;
  }

  const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]);
  }

  const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  return plainMatch?.[1] ?? null;
}

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
  
  convertToCustomer: async (id: string): Promise<{ contactId: string }> => {
    const response = await apiClient.post(`/api/v1/leads/${id}/convert`);
    return response.data;
  },

  updateScore: async (id: string, score: number): Promise<Lead> => {
    const response = await apiClient.put(`/api/v1/leads/${id}/score`, { score });
    return response.data;
  },

  bulkDelete: async (ids: string[]): Promise<void> => {
    await apiClient.post('/api/v1/leads/bulk-delete', ids);
  },

  getStatistics: async (): Promise<{
    totalLeads: number;
    leadsByStatus: Record<string, number>;
    totalEstimatedValue: number;
    averageScore: number;
    leadsConvertedThisMonth: number;
    conversionRate: number;
  }> => {
    const response = await apiClient.get('/api/v1/leads/statistics');
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

  getStatistics: async (): Promise<{
    totalDeals: number;
    dealsByStage: Record<string, number>;
    valueByStage: Record<string, number>;
    totalValue: number;
    weightedTotalValue: number;
    averageDealValue: number;
    wonDealsThisMonth: number;
    wonValueThisMonth: number;
    winRate: number;
    activeDeals: number;
    highRiskDealCount: number;
    stalledDealCount: number;
    overdueNextStepCount: number;
    dealsNeedingAttention: number;
    pendingApprovalCount: number;
  }> => {
    const response = await apiClient.get('/api/v1/deals/statistics');
    return response.data;
  },

  getAttentionSummary: async (): Promise<DealAttentionSummary> => {
    const response = await apiClient.get('/api/v1/deals/attention-summary');
    return response.data;
  },

  runStalledReviewAutomation: async (): Promise<DealAutomationResult> => {
    const response = await apiClient.post('/api/v1/deals/automation/stalled-review');
    return response.data;
  },

  getTerritoryGovernanceQueue: async (): Promise<DealTerritoryQueueSummary> => {
    const response = await apiClient.get('/api/v1/deals/governance/territory-queue');
    return response.data;
  },

  reassignTerritoryMismatches: async (dealIds?: string[]): Promise<DealTerritoryReassignmentResult> => {
    const response = await apiClient.post('/api/v1/deals/governance/reassign', {
      dealIds: dealIds && dealIds.length > 0 ? dealIds : undefined,
    });
    return response.data;
  },

  requestApproval: async (id: string, data?: DealApprovalActionRequest): Promise<Deal> => {
    const response = await apiClient.post(`/api/v1/deals/${id}/request-approval`, data ?? {});
    return response.data;
  },

  approve: async (id: string, data?: DealApprovalActionRequest): Promise<Deal> => {
    const response = await apiClient.post(`/api/v1/deals/${id}/approve`, data ?? {});
    return response.data;
  },

  reject: async (id: string, data?: DealApprovalActionRequest): Promise<Deal> => {
    const response = await apiClient.post(`/api/v1/deals/${id}/reject`, data ?? {});
    return response.data;
  },
};

export const companiesApi = {
  ...createCrudApi<Company>('/api/v1/companies'),

  getInsights: async (id: string): Promise<CompanyInsights> => {
    const response = await apiClient.get(`/api/v1/companies/${id}/insights`);
    return response.data;
  },

  getTerritoryGovernanceQueue: async (): Promise<CompanyTerritoryQueueSummary> => {
    const response = await apiClient.get('/api/v1/companies/governance/territory-queue');
    return response.data;
  },

  reassignTerritoryMismatches: async (companyIds?: string[]): Promise<CompanyTerritoryReassignmentResult> => {
    const response = await apiClient.post('/api/v1/companies/governance/reassign', {
      companyIds: companyIds && companyIds.length > 0 ? companyIds : undefined,
    });
    return response.data;
  },
};
export const contactsApi = createCrudApi<Contact>('/api/v1/contacts');
export const tasksApi = createCrudApi<Task>('/api/v1/tasks');
export const eventsApi = createCrudApi<Event>('/api/v1/events');
export const productsApi = createCrudApi<Product>('/api/v1/products');
export const quotesApi = createCrudApi<Quote>('/api/v1/quotes');
export const invoicesApi = createCrudApi<Invoice>('/api/v1/invoices');

export const documentsApi = {
  ...createCrudApi<Document>('/api/v1/documents'),

  getAll: async (params?: {
    page?: number;
    size?: number;
    search?: string;
    sort?: string;
    category?: Document['category'];
    relatedEntityType?: string;
    relatedEntityId?: string;
  }): Promise<PageResponse<Document>> => {
    const response = await apiClient.get('/api/v1/documents', { params });
    return response.data;
  },

  getRelated: async (entityType: string, entityId: string): Promise<Document[]> => {
    const response = await apiClient.get('/api/v1/documents/related', {
      params: { entityType, entityId },
    });
    return response.data;
  },

  upload: async (data: {
    file: File;
    name: string;
    category: Document['category'];
    description?: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
    uploadedById?: string;
  }): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('name', data.name);
    formData.append('category', data.category);
    if (data.description) {
      formData.append('description', data.description);
    }
    if (data.relatedEntityType) {
      formData.append('relatedEntityType', data.relatedEntityType);
    }
    if (data.relatedEntityId) {
      formData.append('relatedEntityId', data.relatedEntityId);
    }
    if (data.uploadedById) {
      formData.append('uploadedById', data.uploadedById);
    }

    const response = await apiClient.post('/api/v1/documents/upload', formData);
    return response.data;
  },

  download: async (
    id: string
  ): Promise<{ blob: Blob; fileName: string | null; contentType: string | null }> => {
    const response = await apiClient.get(`/api/v1/documents/${id}/download`, {
      responseType: 'blob',
      headers: {
        Accept: '*/*',
      },
    });

    return {
      blob: response.data,
      fileName: parseDownloadFilename(response.headers['content-disposition']),
      contentType: response.headers['content-type'] ?? null,
    };
  },
};

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
    territory?: string;
    quarterlyQuota?: number;
    annualQuota?: number;
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

  updateRevenueOps: async (
    id: string,
    data: { territory?: string; quarterlyQuota?: number | null; annualQuota?: number | null }
  ): Promise<TenantUser> => {
    const response = await apiClient.patch(`/api/v1/users/${id}/revenue-ops`, data);
    return response.data;
  },
};

export const territoriesApi = {
  getAll: async (): Promise<WorkspaceTerritory[]> => {
    const response = await apiClient.get('/api/v1/territories');
    return response.data;
  },

  create: async (data: {
    name: string;
    description?: string;
    isActive?: boolean;
  }): Promise<WorkspaceTerritory> => {
    const response = await apiClient.post('/api/v1/territories', data);
    return response.data;
  },

  update: async (
    id: string,
    data: {
      name: string;
      description?: string;
      isActive?: boolean;
    }
  ): Promise<WorkspaceTerritory> => {
    const response = await apiClient.put(`/api/v1/territories/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/territories/${id}`);
  },
};

export const workflowRulesApi = {
  getLeadIntake: async (): Promise<LeadIntakeWorkflowSettings> => {
    const response = await apiClient.get('/api/v1/workflows/lead-intake');
    return response.data;
  },

  updateLeadIntake: async (data: LeadIntakeWorkflowSettings): Promise<LeadIntakeWorkflowSettings> => {
    const response = await apiClient.put('/api/v1/workflows/lead-intake', data);
    return response.data;
  },

  getDealRescue: async (): Promise<DealRescueWorkflowSettings> => {
    const response = await apiClient.get('/api/v1/workflows/deal-rescue');
    return response.data;
  },

  updateDealRescue: async (data: DealRescueWorkflowSettings): Promise<DealRescueWorkflowSettings> => {
    const response = await apiClient.put('/api/v1/workflows/deal-rescue', data);
    return response.data;
  },

  getQuotaRisk: async (): Promise<QuotaRiskWorkflowSettings> => {
    const response = await apiClient.get('/api/v1/workflows/quota-risk');
    return response.data;
  },

  updateQuotaRisk: async (data: QuotaRiskWorkflowSettings): Promise<QuotaRiskWorkflowSettings> => {
    const response = await apiClient.put('/api/v1/workflows/quota-risk', data);
    return response.data;
  },

  getDealApproval: async (): Promise<DealApprovalWorkflowSettings> => {
    const response = await apiClient.get('/api/v1/workflows/deal-approval');
    return response.data;
  },

  updateDealApproval: async (data: DealApprovalWorkflowSettings): Promise<DealApprovalWorkflowSettings> => {
    const response = await apiClient.put('/api/v1/workflows/deal-approval', data);
    return response.data;
  },

  getGovernanceOps: async (): Promise<GovernanceOpsWorkflowSettings> => {
    const response = await apiClient.get('/api/v1/workflows/governance-ops');
    return response.data;
  },

  updateGovernanceOps: async (data: GovernanceOpsWorkflowSettings): Promise<GovernanceOpsWorkflowSettings> => {
    const response = await apiClient.put('/api/v1/workflows/governance-ops', data);
    return response.data;
  },

  getTerritoryEscalation: async (): Promise<TerritoryEscalationWorkflowSettings> => {
    const response = await apiClient.get('/api/v1/workflows/territory-escalation');
    return response.data;
  },

  updateTerritoryEscalation: async (data: TerritoryEscalationWorkflowSettings): Promise<TerritoryEscalationWorkflowSettings> => {
    const response = await apiClient.put('/api/v1/workflows/territory-escalation', data);
    return response.data;
  },
};

// Email API
export const emailsApi = {
  ...createCrudApi<Email>('/api/v1/emails'),

  getAll: async (params?: {
    page?: number;
    size?: number;
    search?: string;
    sort?: string;
    folder?: EmailFolder;
    isDraft?: boolean;
    isSent?: boolean;
    isRead?: boolean;
    relatedEntityType?: string;
    relatedEntityId?: string;
  }): Promise<PageResponse<Email>> => {
    const response = await apiClient.get('/api/v1/emails', { params });
    return response.data;
  },
  
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
    const response = await apiClient.patch(`/api/v1/emails/${id}/move`, null, {
      params: { folder },
    });
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
    activeDeals: number;
    stalledDealCount: number;
    dealsNeedingAttention: number;
  }> => {
    const response = await apiClient.get('/api/v1/dashboard/stats');
    return response.data;
  },

  getRecentActivity: async (): Promise<any[]> => {
    const response = await apiClient.get('/api/v1/dashboard/activity');
    return response.data;
  },

  getRevenueOpsSummary: async (): Promise<RevenueOpsSummary> => {
    const response = await apiClient.get('/api/v1/dashboard/revenue-ops');
    return response.data;
  },

  getAutomationRuns: async (size: number = 10): Promise<AutomationRun[]> => {
    const response = await apiClient.get('/api/v1/dashboard/automation-runs', {
      params: { size },
    });
    return response.data;
  },

  getQuotaRiskAlerts: async (): Promise<QuotaRiskAlertSummary> => {
    const response = await apiClient.get('/api/v1/dashboard/quota-risk-alerts');
    return response.data;
  },

  runQuotaRiskAlertAutomation: async (): Promise<QuotaRiskAutomationResult> => {
    const response = await apiClient.post('/api/v1/dashboard/quota-risk-alerts/automation');
    return response.data;
  },

  getTerritoryExceptions: async (): Promise<TerritoryExceptionSummary> => {
    const response = await apiClient.get('/api/v1/dashboard/territory-exceptions');
    return response.data;
  },

  runTerritoryExceptionAutomation: async (): Promise<TerritoryExceptionAutomationResult> => {
    const response = await apiClient.post('/api/v1/dashboard/territory-exceptions/automation');
    return response.data;
  },

  getTerritoryEscalations: async (): Promise<TerritoryEscalationSummary> => {
    const response = await apiClient.get('/api/v1/dashboard/territory-escalations');
    return response.data;
  },

  runTerritoryEscalationAutomation: async (): Promise<TerritoryEscalationAutomationResult> => {
    const response = await apiClient.post('/api/v1/dashboard/territory-escalations/automation');
    return response.data;
  },

    runTerritoryAutoRemediation: async (): Promise<TerritoryAutoRemediationResult> => {
      const response = await apiClient.post('/api/v1/dashboard/territory-exceptions/auto-remediate');
      return response.data;
    },

    getGovernanceInbox: async (): Promise<GovernanceInboxSummary> => {
      const response = await apiClient.get('/api/v1/dashboard/governance-inbox');
      return response.data;
    },

    runGovernanceDigestAutomation: async (): Promise<GovernanceDigestAutomationResult> => {
      const response = await apiClient.post('/api/v1/dashboard/governance-digest/automation');
      return response.data;
    },

    runGovernanceAutomation: async (): Promise<GovernanceAutomationResult> => {
      const response = await apiClient.post('/api/v1/dashboard/governance-ops/automation');
      return response.data;
    },

    acknowledgeGovernanceTask: async (taskId: string): Promise<GovernanceTaskAcknowledgementResult> => {
      const response = await apiClient.post(`/api/v1/dashboard/governance-tasks/${taskId}/acknowledge`);
      return response.data;
    },
  };

// Search API
export const searchApi = {
  hybridSearch: async (
    query: string,
    entityType: 'lead' | 'deal' | 'contact' | 'company' | 'task' | 'document',
    options?: {
      limit?: number;
      vectorWeight?: number;
      textWeight?: number;
    }
  ): Promise<Array<Record<string, any>>> => {
    const response = await apiClient.get('/api/v1/search/hybrid', {
      params: {
        query,
        entityType,
        limit: options?.limit ?? 10,
        vectorWeight: options?.vectorWeight ?? 0.6,
        textWeight: options?.textWeight ?? 0.4,
      },
    });
    return response.data;
  },
};

export const tenantAdminApi = {
  getDatabaseSettings: async (): Promise<TenantDatabaseSettings> => {
    const response = await apiClient.get('/api/v1/workspace/database');
    return response.data;
  },

  updateDatabaseSettings: async (
    data: TenantDatabaseSettingsUpdateRequest
  ): Promise<TenantDatabaseSettings> => {
    const response = await apiClient.put('/api/v1/workspace/database', data);
    return response.data;
  },

  validateDatabaseSettings: async (): Promise<TenantDatabaseSettings> => {
    const response = await apiClient.post('/api/v1/workspace/database/validate');
    return response.data;
  },

  migrateToDedicatedDatabase: async (): Promise<TenantDatabaseSettings> => {
    const response = await apiClient.post('/api/v1/workspace/database/migrate');
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
    degraded_mode?: boolean;
    degraded_reason?: string | null;
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
    degraded_mode?: boolean;
    degraded_reason?: string | null;
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
    degraded_mode?: boolean;
    degraded_reason?: string | null;
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
    degraded_mode?: boolean;
    degraded_reason?: string | null;
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
