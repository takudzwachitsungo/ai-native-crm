import axios from 'axios';
import type { User } from './types';

const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

// Create axios instance for AI API
const aiClient = axios.create({
  baseURL: AI_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
aiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
aiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('AI service authentication failed - token may be expired');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('ai_user_id');
      
      if (window.location.pathname !== '/login') {
        alert('Your session has expired. Please sign in again.');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

function getStoredUser(): Partial<User> | null {
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    return null;
  }

  try {
    return JSON.parse(userStr) as Partial<User>;
  } catch (error) {
    console.error('Failed to parse user from localStorage', error);
    return null;
  }
}

// Generate or retrieve user ID for conversation tracking
// Prefer authenticated user id so frontend and AI service agree on conversation ownership.
function getUserId(): string {
  const user = getStoredUser();
  if (user?.id) {
    return user.id;
  }

  if (user?.email) {
    return user.email;
  }

  let userId = localStorage.getItem('ai_user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('ai_user_id', userId);
  }
  return userId;
}

function getConversationId(context?: Record<string, any>): string {
  const user = getStoredUser();
  const workspaceKey = user?.tenantId || user?.tenantSlug || 'workspace';
  const pageKey =
    typeof context?.page === 'string' && context.page.trim()
      ? context.page.trim().toLowerCase()
      : 'chat';

  return `${workspaceKey}:${pageKey}`;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: Message[];
  context?: Record<string, any>;
  stream?: boolean;
  user_id?: string;
  conversation_id?: string;
}

export interface ToolCall {
  tool: string;
  query?: string;
  [key: string]: any;
}

export interface Source {
  entity_id: string;
  entity_type: string;
  content: string;
  similarity: number;
}

export interface ChatResponse {
  message: string;
  tool_calls?: ToolCall[];
  sources?: Source[];
  degraded_mode?: boolean;
  degraded_reason?: string | null;
}

export interface AIHealthResponse {
  status: string;
  groq_configured: boolean;
  crm_backend: string;
}

export interface AIGovernanceCapabilities {
  audit_logging: boolean;
  insight_lifecycle: boolean;
  runtime?: {
    provider: string;
    model: string;
    embedding_model: string;
    temperature: number;
    max_tokens: number;
    streaming: boolean;
    rag?: {
      enabled: boolean;
      embedding_dimensions: number;
      similarity_threshold: number;
      top_k_results: number;
    };
    storage?: Record<string, string>;
    cost_tracking?: {
      enabled: boolean;
      currency: string;
      input_token_cost_per_1m: number;
      output_token_cost_per_1m: number;
    };
    alert_thresholds?: {
      failure_rate_percent: number;
      fallback_rate_percent: number;
      latency_p95_ms: number;
      provider_errors: number;
    };
    secrets?: {
      groq_configured: boolean;
      smtp_configured: boolean;
    };
  };
  tool_domains?: string[];
  tools?: string[];
  rag_indexing?: {
    enabled: boolean;
    domains: string[];
    status_endpoint: string;
    index_endpoint: string;
    scheduler?: {
      enabled: boolean;
      configured: boolean;
      auth_mode?: string;
      interval_seconds: number;
      domains: string[];
      status_endpoint: string;
      run_endpoint: string;
      token_rotation?: {
        status: string;
        expires_at?: string | null;
        rotation_required: boolean;
        rotation_warning: boolean;
        warning_days: number;
        warning_at?: string | null;
      };
    };
  };
  observability?: {
    metrics_endpoint: string;
    metrics_format: string;
  };
  approvals?: {
    enabled: boolean;
    list_endpoint: string;
    create_endpoint: string;
    approve_endpoint: string;
    reject_endpoint: string;
  };
  actions: {
    mode: string;
    requires_confirmation: boolean;
    approval_policy?: Record<string, string>;
    supported_actions: Array<{
      type: string;
      label: string;
      risk_level: string;
      executes: boolean;
      description: string;
    }>;
    guardrails: string[];
  };
}

export interface AIAuditEvent {
  id: string;
  tenant_id: string;
  user_id: string;
  event_type: string;
  action?: string | null;
  outcome: string;
  conversation_id?: string | null;
  request_id?: string | null;
  prompt?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface AIActionProposal {
  proposal_id: string;
  action_type: string;
  requires_confirmation: boolean;
  risk_level: string;
  approval_status?: string;
  can_execute: boolean;
  preview: string;
  payload: Record<string, any>;
  created_at: string;
}

export interface AIActionApproval {
  id: string;
  tenant_id: string;
  requested_by: string;
  reviewed_by?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string | null;
  proposal: AIActionProposal | Record<string, any>;
  created_at: string;
  updated_at: string;
  review_note?: string | null;
}

export interface AIGovernanceSummary {
  window_event_limit: number;
  total_events: number;
  by_type: Record<string, number>;
  by_outcome: Record<string, number>;
  action_counts: Record<string, number>;
  tool_counts?: Record<string, number>;
  events_by_day?: Record<string, number>;
  degraded_count: number;
  tool_call_count: number;
  failure_rate?: number;
  fallback_rate?: number;
  latency?: {
    count: number;
    average_ms?: number | null;
    p95_ms?: number | null;
    max_ms?: number | null;
  };
  token_usage?: {
    llm_calls: number;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  usage_by_model?: Record<string, {
    llm_calls: number;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  }>;
  cost?: {
    currency: string;
    estimated_usd?: number | null;
    pricing_configured: boolean;
  };
  provider_errors?: {
    total: number;
    by_provider: Record<string, number>;
  };
  action_executions: number;
  action_failures: number;
  action_success_rate?: number | null;
  recent_failures: Array<{
    id?: string;
    event_type: string;
    action?: string | null;
    created_at?: string | null;
    error?: string | null;
  }>;
  latest_degraded_event_at?: string | null;
  health?: {
    status: string;
    reasons: string[];
    thresholds?: {
      failure_rate_percent: number;
      fallback_rate_percent: number;
      latency_p95_ms: number;
      provider_errors: number;
      action_success_rate_percent: number;
    };
  };
  last_event_at?: string | null;
  storage: string;
}

/**
 * Stream chat response with Server-Sent Events
 * Yields events: tool_start, tool_end, token, done
 */
export async function* streamAgenticResponse(
  messages: Message[],
  context?: Record<string, any>
): AsyncGenerator<{
  type: string; 
  content?: string; 
  tool?: string; 
  display_name?: string;
  query?: string;
  message?: string;
  toolCalls?: ToolCall[];
  sources?: Source[];
  degraded_mode?: boolean;
  degraded_reason?: string | null;
}, void, unknown> {
  const userId = getUserId();
  const conversationId = getConversationId(context);
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${AI_API_URL}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      messages,
      context,
      stream: true,
      user_id: userId,
      conversation_id: conversationId
    })
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('ai_user_id');
      if (window.location.pathname !== '/login') {
        alert('Your session has expired. Please sign in again.');
        window.location.href = '/login';
      }
    }
    throw new Error(`Stream failed: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('No response body');
  }

  let buffer = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      // Append to buffer to handle incomplete chunks
      buffer += decoder.decode(value, { stream: true });
      
      // Split by double newline (SSE event separator)
      const events = buffer.split('\n\n');
      
      // Keep the last incomplete event in buffer
      buffer = events.pop() || '';
      
      for (const event of events) {
        const lines = event.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6).trim();
              if (jsonStr) {
                const data = JSON.parse(jsonStr);
                if (data.type === 'error') {
                  throw new Error(data.message || 'AI stream failed.');
                }
                yield {
                  ...data,
                  toolCalls: data.toolCalls ?? data.tool_calls,
                  degraded_mode: data.degraded_mode ?? false,
                  degraded_reason: data.degraded_reason ?? null,
                };
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', line, e);
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Call the agentic AI service with LangGraph + MCP + RAG
 * This replaces direct Groq API calls with intelligent agent workflows
 * Conversation context is automatically persisted across sessions
 */
export async function getAgenticResponse(
  messages: Message[],
  context?: Record<string, any>
): Promise<ChatResponse> {
  try {
    const userId = getUserId();
    const conversationId = getConversationId(context);
    
    const response = await aiClient.post<ChatResponse>(
      '/chat',
      {
        messages,
        context,
        stream: false,
        user_id: userId,
        conversation_id: conversationId
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('AI Service Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      throw new Error('Session expired. Please sign in again.');
    }
    
    if (error.response?.status === 500) {
      throw new Error('AI service error. Please try again or contact support.');
    }
    
    throw new Error('Failed to get AI response. Please try again.');
  }
}

/**
 * Semantic search across CRM entities using RAG
 */
export async function semanticSearch(
  query: string,
  entityType: 'lead' | 'deal' | 'contact',
  limit: number = 5
): Promise<Source[]> {
  try {
    const response = await aiClient.post<{ results: Source[] }>(
      '/search/semantic',
      null,
      {
        params: { query, entity_type: entityType, limit }
      }
    );

    return response.data.results;
  } catch (error: any) {
    console.error('Semantic Search Error:', error.response?.data || error.message);
    throw new Error('Failed to perform semantic search.');
  }
}

/**
 * Generate embeddings for a CRM entity
 */
export async function generateEmbeddings(
  entityType: string,
  entityId: string
): Promise<void> {
  try {
    await aiClient.post(
      '/embeddings/generate',
      null,
      {
        params: { entity_type: entityType, entity_id: entityId }
      }
    );
  } catch (error: any) {
    console.error('Generate Embeddings Error:', error.response?.data || error.message);
    throw new Error('Failed to generate embeddings.');
  }
}

/**
 * Get available MCP tools
 */
export async function getAvailableTools(): Promise<any[]> {
  try {
    const response = await aiClient.get('/tools');
    return response.data.tools;
  } catch (error: any) {
    console.error('Get Tools Error:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Health check for AI service
 */
export async function getAIServiceHealth(): Promise<AIHealthResponse> {
  const response = await aiClient.get<AIHealthResponse>('/health');
  return response.data;
}

export async function indexRagKnowledge(payload?: {
  domains?: string[];
  limit?: number;
}): Promise<{
  indexed: Record<string, number>;
  skipped: Record<string, number>;
  errors: Record<string, string>;
  total_indexed: number;
  domains: string[];
}> {
  const response = await aiClient.post('/rag/index', payload || {});
  return response.data;
}

export async function getRagIndexStatus(): Promise<{
  counts: Record<string, number>;
  total: number;
  domains: string[];
}> {
  const response = await aiClient.get('/rag/index/status');
  return response.data;
}

export async function getRagSchedulerStatus(): Promise<{
  enabled: boolean;
  configured: boolean;
  running: boolean;
  last_run_at?: string | null;
  last_success_at?: string | null;
  last_failure_at?: string | null;
  last_result?: {
    indexed?: Record<string, number>;
    skipped?: Record<string, number>;
    errors?: Record<string, string>;
    total_indexed?: number;
    domains?: string[];
  } | null;
  last_error?: string | Record<string, string> | null;
  run_count: number;
  failure_count: number;
  configured_domains: string[];
  configured_limit: number;
  interval_seconds: number;
  token_rotation: {
    status: string;
    auth_mode?: string;
    expires_at?: string | null;
    rotation_required: boolean;
    rotation_warning: boolean;
    warning_days: number;
    warning_at?: string | null;
  };
  counts: Record<string, number>;
  total_indexed: number;
}> {
  const response = await aiClient.get('/rag/scheduler/status');
  return response.data;
}

export async function runRagSchedulerNow(payload?: {
  domains?: string[];
  limit?: number;
}): Promise<{
  result: {
    indexed: Record<string, number>;
    skipped: Record<string, number>;
    errors: Record<string, string>;
    total_indexed: number;
    domains: string[];
  };
  state: {
    enabled: boolean;
    configured: boolean;
    running: boolean;
    last_run_at?: string | null;
    last_success_at?: string | null;
    last_failure_at?: string | null;
    run_count: number;
    failure_count: number;
  };
}> {
  const response = await aiClient.post('/rag/scheduler/run', payload || {});
  return response.data;
}

export async function checkAIServiceHealth(): Promise<boolean> {
  try {
    const response = await getAIServiceHealth();
    return response.status === 'healthy';
  } catch (error) {
    return false;
  }
}

/**
 * Get persisted conversation history from the AI service.
 */
export async function getConversationHistory(
  conversationId: string = 'default',
  limit?: number
): Promise<Message[]> {
  try {
    const userId = getUserId();
    const scopedConversationId = conversationId === 'default'
      ? getConversationId()
      : conversationId;
    const response = await aiClient.get('/conversation/history', {
      params: {
        user_id: userId,
        conversation_id: scopedConversationId,
        limit
      }
    });
    return response.data.messages || [];
  } catch (error: any) {
    console.error('Get Conversation Error:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Clear conversation history
 */
export async function clearConversation(conversationId: string = 'default'): Promise<boolean> {
  try {
    const userId = getUserId();
    const scopedConversationId = conversationId === 'default'
      ? getConversationId()
      : conversationId;
    const response = await aiClient.delete('/conversation/clear', {
      params: {
        user_id: userId,
        conversation_id: scopedConversationId
      }
    });
    return response.data.success;
  } catch (error: any) {
    console.error('Clear Conversation Error:', error.response?.data || error.message);
    return false;
  }
}

/**
 * List all conversations for current user
 */
export async function listConversations(): Promise<string[]> {
  try {
    const userId = getUserId();
    const response = await aiClient.get('/conversation/list', {
      params: { user_id: userId }
    });
    return response.data.conversations || [];
  } catch (error: any) {
    console.error('List Conversations Error:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Get live AI-powered insights for current context
 */
export interface Insight {
  id?: string;
  type: string;
  label?: string;
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error';
  entity_type: string;
  entity_id: string;
  context: string[];
  source?: string;
  confidence?: number;
  reason?: string;
  recommended_action?: string;
  generated_by?: string;
  lifecycle?: {
    status: 'active' | 'dismissed' | 'snoozed' | 'assigned';
    assigned_to?: string | null;
    snoozed_until?: string | null;
    note?: string | null;
    updated_at?: string | null;
  };
  first_seen_at?: string;
  last_seen_at?: string;
  seen_count?: number;
}

export async function getInsights(context: string = 'dashboard', options?: { includeInactive?: boolean }): Promise<{
  insights: Insight[];
  generated_at: string;
  count: number;
}> {
  const token = localStorage.getItem('token');
  const params = new URLSearchParams({ context });
  if (options?.includeInactive) {
    params.set('include_inactive', 'true');
  }
  
  const response = await fetch(`${AI_API_URL}/insights?${params.toString()}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to get insights: ${response.statusText}`);
  }

  return response.json();
}

export async function getInsightInbox(params?: {
  status?: string;
  assigned_to?: string;
  limit?: number;
}): Promise<{
  insights: Insight[];
  count: number;
  summary: {
    total: number;
    active: number;
    assigned: number;
    snoozed: number;
    dismissed: number;
    by_severity: Record<string, number>;
    by_entity_type: Record<string, number>;
  };
}> {
  const response = await aiClient.get('/insights/inbox', { params });
  return response.data;
}

export async function getAIGovernanceCapabilities(): Promise<AIGovernanceCapabilities> {
  const response = await aiClient.get<AIGovernanceCapabilities>('/governance/capabilities');
  return response.data;
}

export async function getAIAuditEvents(params?: {
  limit?: number;
  event_type?: string;
}): Promise<AIAuditEvent[]> {
  const response = await aiClient.get<{ events: AIAuditEvent[] }>('/governance/audit', { params });
  return response.data.events || [];
}

export async function getAIGovernanceSummary(limit: number = 500): Promise<AIGovernanceSummary> {
  const response = await aiClient.get<AIGovernanceSummary>('/governance/summary', {
    params: { limit },
  });
  return response.data;
}

export async function proposeAIAction(payload: {
  intent: string;
  action_type?: string;
  entity_type?: string;
  entity_id?: string;
  payload?: Record<string, any>;
}): Promise<AIActionProposal> {
  const response = await aiClient.post<AIActionProposal>('/actions/propose', payload);
  return response.data;
}

export async function executeAIAction(payload: {
  action_type: string;
  payload: Record<string, any>;
  confirmed: boolean;
  proposal_id?: string;
}): Promise<{ success: boolean; action_type: string; result: Record<string, any> }> {
  const response = await aiClient.post('/actions/execute', payload);
  return response.data;
}

export async function createAIActionApproval(payload: {
  proposal: Record<string, any>;
  reason?: string;
}): Promise<{ approval: AIActionApproval }> {
  const response = await aiClient.post('/actions/approvals', payload);
  return response.data;
}

export async function getAIActionApprovals(params?: {
  status?: string;
  limit?: number;
}): Promise<{ approvals: AIActionApproval[]; count: number }> {
  const response = await aiClient.get('/actions/approvals', { params });
  return response.data;
}

export async function reviewAIActionApproval(
  approvalId: string,
  decision: 'approve' | 'reject',
  payload?: { note?: string }
): Promise<{ approval: AIActionApproval }> {
  const response = await aiClient.post(`/actions/approvals/${approvalId}/${decision}`, payload || {});
  return response.data;
}

export async function updateInsightLifecycle(
  insightId: string,
  payload: {
    status: 'active' | 'dismissed' | 'snoozed' | 'assigned';
    assigned_to?: string;
    snoozed_until?: string;
    note?: string;
  }
): Promise<{ state: Insight['lifecycle'] & { id: string } }> {
  const response = await aiClient.patch(`/insights/${encodeURIComponent(insightId)}/state`, payload);
  return response.data;
}

// Backward compatibility - use agentic service but keep same interface
export async function getAssistantResponse(
  query: string,
  conversationHistory: Message[] = []
): Promise<string> {
  const messages: Message[] = [
    ...conversationHistory,
    { role: 'user', content: query }
  ];

  const response = await getAgenticResponse(messages);
  return response.message;
}
