import { apiClient } from './api-client';
import type {
  AccountProfile,
  AccountProfileUpdateRequest,
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
  Campaign,
  CampaignInsights,
  CampaignStats,
  Contract,
  SupportCaseAssignmentAutomationResult,
  SupportCaseAssignmentQueueSummary,
  SupportCase,
  SupportCaseSlaAutomationResult,
  SupportCaseStats,
  Quote,
  Invoice,
  Document,
  Email,
  EmailFolder,
  PageResponse,
  TenantUser,
  TenantDatabaseSettings,
  TenantDatabaseSettingsUpdateRequest,
  SettingsCapabilityOverview,
  NotificationPreferences,
  NotificationPreferenceUpdateRequest,
  UserSessionSummary,
  BillingPortalSummary,
  TwoFactorStatus,
  TwoFactorSetup,
  ForecastSubmissionSummary,
  WorkspaceIntegration,
  WorkspaceIntegrationOAuthExchangeRequest,
  WorkspaceIntegrationOAuthStart,
  WorkspaceIntegrationUpdateRequest,
  IntegrationSyncResult,
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
  WorkOrder,
  WorkOrderStats,
  WorkspaceTerritory,
  AutomationRun,
  LeadIntakeWorkflowSettings,
  CampaignNurtureWorkflowSettings,
  CaseAssignmentWorkflowSettings,
  CaseSlaWorkflowSettings,
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
    localStorage.removeItem('refreshToken');
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

export const accountApi = {
  getProfile: async (): Promise<AccountProfile> => {
    const response = await apiClient.get('/api/v1/account/profile');
    return response.data;
  },

  updateProfile: async (data: AccountProfileUpdateRequest): Promise<AccountProfile> => {
    const response = await apiClient.put('/api/v1/account/profile', data);
    return response.data;
  },

  getNotificationPreferences: async (): Promise<NotificationPreferences> => {
    const response = await apiClient.get('/api/v1/account/notifications');
    return response.data;
  },

  updateNotificationPreferences: async (
    data: NotificationPreferenceUpdateRequest
  ): Promise<NotificationPreferences> => {
    const response = await apiClient.put('/api/v1/account/notifications', data);
    return response.data;
  },

  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
    revokeOtherSessions?: boolean;
  }): Promise<void> => {
    await apiClient.post('/api/v1/account/password/change', data);
  },

  getSessions: async (): Promise<UserSessionSummary[]> => {
    const response = await apiClient.get('/api/v1/account/sessions');
    return response.data;
  },

  revokeSession: async (sessionId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/account/sessions/${sessionId}`);
  },

  revokeOtherSessions: async (): Promise<void> => {
    await apiClient.post('/api/v1/account/sessions/revoke-others');
  },

  getBillingPortal: async (): Promise<BillingPortalSummary> => {
    const response = await apiClient.get('/api/v1/account/billing');
    return response.data;
  },

  getTwoFactorStatus: async (): Promise<TwoFactorStatus> => {
    const response = await apiClient.get('/api/v1/account/2fa');
    return response.data;
  },

  beginTwoFactorSetup: async (): Promise<TwoFactorSetup> => {
    const response = await apiClient.post('/api/v1/account/2fa/setup');
    return response.data;
  },

  enableTwoFactor: async (code: string): Promise<TwoFactorStatus> => {
    const response = await apiClient.post('/api/v1/account/2fa/enable', { code });
    return response.data;
  },

  disableTwoFactor: async (currentPassword: string): Promise<TwoFactorStatus> => {
    const response = await apiClient.post('/api/v1/account/2fa/disable', { currentPassword });
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

  syncToErp: async (id: string, providerKey: 'quickbooks' | 'xero'): Promise<IntegrationSyncResult> => {
    const response = await apiClient.post(`/api/v1/companies/${id}/sync/${providerKey}`);
    return response.data;
  },
};
export const contactsApi = createCrudApi<Contact>('/api/v1/contacts');
export const tasksApi = createCrudApi<Task>('/api/v1/tasks');
export const eventsApi = {
  ...createCrudApi<Event>('/api/v1/events'),

  syncMicrosoft365: async (): Promise<IntegrationSyncResult> => {
    const response = await apiClient.post('/api/v1/events/sync/microsoft-365');
    return response.data;
  },

  syncGoogleWorkspace: async (): Promise<IntegrationSyncResult> => {
    const response = await apiClient.post('/api/v1/events/sync/google-workspace');
    return response.data;
  },
};
export const productsApi = createCrudApi<Product>('/api/v1/products');
export const campaignsApi = {
  ...createCrudApi<Campaign>('/api/v1/campaigns'),

  getAll: async (params?: {
    page?: number;
    size?: number;
    search?: string;
    sort?: string;
    status?: Campaign['status'];
    type?: Campaign['type'];
    channel?: Campaign['channel'];
  }): Promise<PageResponse<Campaign>> => {
    const response = await apiClient.get('/api/v1/campaigns', { params });
    return response.data;
  },

  getStatistics: async (): Promise<CampaignStats> => {
    const response = await apiClient.get('/api/v1/campaigns/statistics');
    return response.data;
  },

  getInsights: async (id: string): Promise<CampaignInsights> => {
    const response = await apiClient.get(`/api/v1/campaigns/${id}/insights`);
    return response.data;
  },
};
export const supportCasesApi = {
  ...createCrudApi<SupportCase>('/api/v1/cases'),

  getAll: async (params?: {
    page?: number;
    size?: number;
    search?: string;
    sort?: string;
    status?: SupportCase['status'];
    priority?: SupportCase['priority'];
    source?: SupportCase['source'];
  }): Promise<PageResponse<SupportCase>> => {
    const response = await apiClient.get('/api/v1/cases', { params });
    return response.data;
  },

  getStatistics: async (): Promise<SupportCaseStats> => {
    const response = await apiClient.get('/api/v1/cases/statistics');
    return response.data;
  },

  getAssignmentQueue: async (): Promise<SupportCaseAssignmentQueueSummary> => {
    const response = await apiClient.get('/api/v1/cases/assignment-queue');
    return response.data;
  },

  runAssignmentAutomation: async (): Promise<SupportCaseAssignmentAutomationResult> => {
    const response = await apiClient.post('/api/v1/cases/automation/assign');
    return response.data;
  },

  runSlaAutomation: async (): Promise<SupportCaseSlaAutomationResult> => {
    const response = await apiClient.post('/api/v1/cases/automation/sla-breach');
    return response.data;
  },
};
export const quotesApi = createCrudApi<Quote>('/api/v1/quotes');

export const contractsApi = {
  ...createCrudApi<Contract>('/api/v1/contracts'),

  activate: async (id: string): Promise<Contract> => {
    const response = await apiClient.patch(`/api/v1/contracts/${id}/activate`);
    return response.data;
  },

  markRenewalDue: async (id: string): Promise<Contract> => {
    const response = await apiClient.patch(`/api/v1/contracts/${id}/renewal-due`);
    return response.data;
  },

  generateRenewalInvoice: async (id: string, invoiceNumber: string): Promise<Contract> => {
    const response = await apiClient.patch(`/api/v1/contracts/${id}/generate-renewal-invoice`, null, {
      params: { invoiceNumber },
    });
    return response.data;
  },

  renew: async (id: string, contractNumber: string): Promise<Contract> => {
    const response = await apiClient.post(`/api/v1/contracts/${id}/renew`, null, {
      params: { contractNumber },
    });
    return response.data;
  },

  terminate: async (id: string, reason: string): Promise<Contract> => {
    const response = await apiClient.patch(`/api/v1/contracts/${id}/terminate`, null, {
      params: { reason },
    });
    return response.data;
  },

  createFromQuote: async (
    quoteId: string,
    data: {
      contractNumber: string;
      title?: string;
      startDate: string;
      endDate: string;
      autoRenew?: boolean;
      renewalNoticeDays?: number;
      ownerId?: string;
      notes?: string;
    }
  ): Promise<Contract> => {
    const response = await apiClient.post(`/api/v1/contracts/from-quote/${quoteId}`, data);
    return response.data;
  },
};

export const invoicesApi = {
  ...createCrudApi<Invoice>('/api/v1/invoices'),

  syncToErp: async (id: string, providerKey: 'quickbooks' | 'xero'): Promise<IntegrationSyncResult> => {
    const response = await apiClient.post(`/api/v1/invoices/${id}/sync/${providerKey}`);
    return response.data;
  },
};

export const workOrdersApi = {
  ...createCrudApi<WorkOrder>('/api/v1/field-service/work-orders'),

  getStatistics: async (): Promise<WorkOrderStats> => {
    const response = await apiClient.get('/api/v1/field-service/work-orders/statistics');
    return response.data;
  },

  dispatch: async (id: string): Promise<WorkOrder> => {
    const response = await apiClient.post(`/api/v1/field-service/work-orders/${id}/dispatch`);
    return response.data;
  },

  start: async (id: string): Promise<WorkOrder> => {
    const response = await apiClient.post(`/api/v1/field-service/work-orders/${id}/start`);
    return response.data;
  },

  complete: async (id: string, completionNotes?: string): Promise<WorkOrder> => {
    const response = await apiClient.post(`/api/v1/field-service/work-orders/${id}/complete`, {
      completionNotes,
    });
    return response.data;
  },
};

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

  getCampaignNurture: async (): Promise<CampaignNurtureWorkflowSettings> => {
    const response = await apiClient.get('/api/v1/workflows/campaign-nurture');
    return response.data;
  },

  updateCampaignNurture: async (data: CampaignNurtureWorkflowSettings): Promise<CampaignNurtureWorkflowSettings> => {
    const response = await apiClient.put('/api/v1/workflows/campaign-nurture', data);
    return response.data;
  },

  getCaseAssignment: async (): Promise<CaseAssignmentWorkflowSettings> => {
    const response = await apiClient.get('/api/v1/workflows/case-assignment');
    return response.data;
  },

  updateCaseAssignment: async (data: CaseAssignmentWorkflowSettings): Promise<CaseAssignmentWorkflowSettings> => {
    const response = await apiClient.put('/api/v1/workflows/case-assignment', data);
    return response.data;
  },

  getCaseSla: async (): Promise<CaseSlaWorkflowSettings> => {
    const response = await apiClient.get('/api/v1/workflows/case-sla');
    return response.data;
  },

  updateCaseSla: async (data: CaseSlaWorkflowSettings): Promise<CaseSlaWorkflowSettings> => {
    const response = await apiClient.put('/api/v1/workflows/case-sla', data);
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

  syncMicrosoft365: async (): Promise<IntegrationSyncResult> => {
    const response = await apiClient.post('/api/v1/emails/sync/microsoft-365');
    return response.data;
  },

  syncGoogleWorkspace: async (): Promise<IntegrationSyncResult> => {
    const response = await apiClient.post('/api/v1/emails/sync/google-workspace');
    return response.data;
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

export const settingsApi = {
  getCapabilities: async (): Promise<SettingsCapabilityOverview> => {
    const response = await apiClient.get('/api/v1/settings/capabilities');
    return response.data;
  },

  getIntegrations: async (): Promise<WorkspaceIntegration[]> => {
    const response = await apiClient.get('/api/v1/settings/integrations');
    return response.data;
  },

  updateIntegration: async (
    providerKey: string,
    data: WorkspaceIntegrationUpdateRequest
  ): Promise<WorkspaceIntegration> => {
    const response = await apiClient.put(`/api/v1/settings/integrations/${providerKey}`, data);
    return response.data;
  },

  startIntegrationOAuth: async (providerKey: string): Promise<WorkspaceIntegrationOAuthStart> => {
    const response = await apiClient.post(`/api/v1/settings/integrations/${providerKey}/oauth/start`);
    return response.data;
  },

  exchangeIntegrationOAuth: async (
    providerKey: string,
    data: WorkspaceIntegrationOAuthExchangeRequest
  ): Promise<WorkspaceIntegration> => {
    const response = await apiClient.post(`/api/v1/settings/integrations/${providerKey}/oauth/exchange`, data);
    return response.data;
  },

  refreshIntegrationOAuth: async (providerKey: string): Promise<WorkspaceIntegration> => {
    const response = await apiClient.post(`/api/v1/settings/integrations/${providerKey}/oauth/refresh`);
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
  generate: async (
    options: number | {
      forecastMonths?: number;
      forecastCategory?: 'COMMIT' | 'BEST_CASE' | 'UPSIDE';
      managerAdjustmentPercent?: number;
      snapshotLabel?: string;
    } = 6
  ): Promise<{
    success: boolean;
    monthly_forecasts?: Array<{
      month: string;
      month_date: string;
      pipeline: number;
      base_forecast?: number;
      forecast: number;
      actual: number;
      quota: number;
    }>;
    team_forecasts?: Array<{
      owner_id?: string;
      name: string;
      manager_id?: string;
      manager_name?: string;
      quota: number;
      base_forecast?: number;
      forecast: number;
      closed: number;
      pipeline: number;
      attainment: number;
    }>;
    rollup_hierarchy?: Array<{
      id: string;
      parent_id?: string | null;
      level: 'TEAM' | 'MANAGER' | 'OWNER';
      label: string;
      quota: number;
      base_forecast?: number;
      forecast: number;
      closed: number;
      pipeline: number;
      attainment: number;
    }>;
    forecast_categories?: Array<{
      category: 'COMMIT' | 'BEST_CASE' | 'UPSIDE';
      forecast: number;
      variance_to_quota: number;
      variance_percent: number;
    }>;
    selected_forecast_category?: 'COMMIT' | 'BEST_CASE' | 'UPSIDE';
    manager_adjustment_percent?: number;
    base_forecast?: number;
    final_forecast?: number;
    closed_revenue?: number;
    open_pipeline?: number;
    snapshot_history?: Array<{
      generated_at: string;
      snapshot_label: string;
      forecast_category: 'COMMIT' | 'BEST_CASE' | 'UPSIDE';
      manager_adjustment_percent: number;
      base_forecast: number;
      final_forecast: number;
      quota: number;
    }>;
    variance_to_prior?: {
      amount: number;
      percent: number;
      prior_generated_at?: string;
      prior_snapshot_label?: string;
    } | null;
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
    const request =
      typeof options === 'number'
        ? { forecast_months: options }
        : {
            forecast_months: options.forecastMonths ?? 6,
            forecast_category: options.forecastCategory ?? 'COMMIT',
            manager_adjustment_percent: options.managerAdjustmentPercent ?? 0,
            snapshot_label: options.snapshotLabel,
          };
    const response = await apiClient.post(`${AI_API_URL}/forecasting/generate`, 
      request,
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
    rollup_hierarchy?: Array<any>;
    forecast_categories?: Array<any>;
    selected_forecast_category?: 'COMMIT' | 'BEST_CASE' | 'UPSIDE';
    manager_adjustment_percent?: number;
    base_forecast?: number;
    final_forecast?: number;
    closed_revenue?: number;
    open_pipeline?: number;
    snapshot_history?: Array<any>;
    variance_to_prior?: Record<string, any> | null;
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

    listSubmissions: async (): Promise<{
      success: boolean;
      submissions: ForecastSubmissionSummary[];
    }> => {
      const response = await apiClient.get(`${AI_API_URL}/forecasting/submissions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });
      return response.data;
    },

    submitForReview: async (params: {
      title: string;
      forecastMonths?: number;
      forecastCategory?: 'COMMIT' | 'BEST_CASE' | 'UPSIDE';
      managerAdjustmentPercent?: number;
      snapshotLabel?: string;
      notes?: string;
    }): Promise<ForecastSubmissionSummary> => {
      const response = await apiClient.post(`${AI_API_URL}/forecasting/submissions`, {
        title: params.title,
        forecast_months: params.forecastMonths ?? 6,
        forecast_category: params.forecastCategory ?? 'COMMIT',
        manager_adjustment_percent: params.managerAdjustmentPercent ?? 0,
        snapshot_label: params.snapshotLabel,
        notes: params.notes,
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });
      return response.data;
    },

    reviewSubmission: async (
      submissionId: string,
      params: { status: 'APPROVED' | 'CHANGES_REQUESTED'; reviewNotes?: string }
    ): Promise<ForecastSubmissionSummary> => {
      const response = await apiClient.post(`${AI_API_URL}/forecasting/submissions/${submissionId}/review`, {
        status: params.status,
        review_notes: params.reviewNotes,
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });
      return response.data;
    },
  };

function normalizeStandardReportResponse(data: any) {
  return {
    success: Boolean(data?.success),
    report_type: data?.reportType,
    report_mode: data?.reportMode,
    title: data?.title,
    summary: data?.summary,
    date_range: data?.dateRange,
    metrics: data?.metrics ?? {},
    charts: data?.charts ?? [],
    insights: data?.insights ?? [],
    recommendations: data?.recommendations ?? [],
    sections: data?.sections ?? [],
    generated_at: data?.generatedAt,
    error: data?.error,
  };
}

// Reports API
export const reportsApi = {
  generate: async (params: {
    report_type: string;
    report_mode?: 'TABULAR' | 'SUMMARY' | 'MATRIX';
    custom_query?: string;
    date_range?: { start: string; end: string };
    filters?: Record<string, any>;
  }): Promise<{
    success: boolean;
    report_type: string;
    report_mode?: 'TABULAR' | 'SUMMARY' | 'MATRIX';
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
    definition_id?: string;
    error?: string;
    degraded_mode?: boolean;
    degraded_reason?: string | null;
  }> => {
    if (params.report_type === 'custom') {
      const response = await apiClient.post(`${AI_API_URL}/reports/generate`, params, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });
      return response.data;
    }

    const response = await apiClient.post('/api/v1/reports/generate', {
      reportType: params.report_type,
      reportMode: params.report_mode ?? 'SUMMARY',
      dateRange: params.date_range,
      filters: params.filters ?? {},
    });
    return normalizeStandardReportResponse(response.data);
  },

  getTemplates: async (): Promise<{
    success: boolean;
    templates: Array<{
      id: string;
      category: string;
      title: string;
      description: string;
      data_requirements: string[];
      metrics: string[];
      display_modes: Array<'TABULAR' | 'SUMMARY' | 'MATRIX'>;
      default_mode: 'TABULAR' | 'SUMMARY' | 'MATRIX';
    }>;
  }> => {
    const response = await apiClient.get('/api/v1/reports/templates');
    return {
      success: Boolean(response.data?.success),
      templates: (response.data?.templates ?? []).map((template: any) => ({
        id: template.id,
        category: template.category,
        title: template.title,
        description: template.description,
        data_requirements: template.dataRequirements ?? [],
        metrics: template.metrics ?? [],
        display_modes: template.displayModes ?? ['SUMMARY', 'TABULAR', 'MATRIX'],
        default_mode: template.defaultMode ?? 'SUMMARY',
      })),
    };
  },

  listDefinitions: async (): Promise<{
    success: boolean;
    definitions: Array<{
      id: string;
      name: string;
      report_type: string;
      report_mode: 'TABULAR' | 'SUMMARY' | 'MATRIX';
      custom_query?: string;
      date_range?: { start: string; end: string };
      filters?: Record<string, any>;
      schedule?: Record<string, any> | null;
      created_at: string;
      updated_at: string;
    }>;
  }> => {
    const response = await apiClient.get(`${AI_API_URL}/reports/definitions`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      }
    });
    return {
      success: Boolean(response.data?.success),
      definitions: (response.data?.definitions ?? []).filter((definition: any) => definition.report_type === 'custom'),
    };
  },

  saveDefinition: async (params: {
    name: string;
    report_type: string;
    report_mode?: 'TABULAR' | 'SUMMARY' | 'MATRIX';
    custom_query?: string;
    date_range?: { start: string; end: string };
    filters?: Record<string, any>;
    schedule?: Record<string, any> | null;
  }): Promise<{
    id: string;
    name: string;
    report_type: string;
    report_mode: 'TABULAR' | 'SUMMARY' | 'MATRIX';
    custom_query?: string;
    date_range?: { start: string; end: string };
    filters?: Record<string, any>;
    schedule?: Record<string, any> | null;
    created_at: string;
    updated_at: string;
  }> => {
    if (params.report_type !== 'custom') {
      throw new Error('Only custom AI reports can be saved here. Standard reports now come from the Java backend.');
    }
    const response = await apiClient.post(`${AI_API_URL}/reports/definitions`, {
      ...params,
      delivery_refresh_token: localStorage.getItem('refreshToken') || undefined,
    }, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      }
    });
    return response.data;
  },

  deleteDefinition: async (definitionId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete(`${AI_API_URL}/reports/definitions/${definitionId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      }
    });
    return response.data;
  },

  runDefinition: async (definitionId: string): Promise<{
    success: boolean;
    report_type: string;
    report_mode?: 'TABULAR' | 'SUMMARY' | 'MATRIX';
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
    definition_id?: string;
    error?: string;
    degraded_mode?: boolean;
    degraded_reason?: string | null;
  }> => {
    const response = await apiClient.post(`${AI_API_URL}/reports/definitions/${definitionId}/run`, {}, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      }
    });
    return response.data;
  },
};
