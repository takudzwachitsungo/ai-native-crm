import axios from 'axios';

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
      
      if (window.location.pathname !== '/login') {
        alert('Your session has expired. Please sign in again.');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Generate or retrieve user ID for conversation tracking
// Use authenticated user's email if available, otherwise fallback to localStorage
function getUserId(): string {
  // Try to get the authenticated user first
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.email) {
        return user.email; // Use email as stable user identifier
      }
    } catch (e) {
      console.error('Failed to parse user from localStorage');
    }
  }
  
  // Fallback to generated ID (for unauthenticated users)
  let userId = localStorage.getItem('ai_user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('ai_user_id', userId);
  }
  return userId;
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
      conversation_id: 'default'
    })
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
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
    
    const response = await aiClient.post<ChatResponse>(
      '/chat',
      {
        messages,
        context,
        stream: false,
        user_id: userId,
        conversation_id: 'default'  // Can be made dynamic for multiple conversations
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

export async function checkAIServiceHealth(): Promise<boolean> {
  try {
    const response = await getAIServiceHealth();
    return response.status === 'healthy';
  } catch (error) {
    return false;
  }
}

/**
 * Get conversation history from Redis
 */
export async function getConversationHistory(
  conversationId: string = 'default',
  limit?: number
): Promise<Message[]> {
  try {
    const userId = getUserId();
    const response = await aiClient.get('/conversation/history', {
      params: {
        user_id: userId,
        conversation_id: conversationId,
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
    const response = await aiClient.delete('/conversation/clear', {
      params: {
        user_id: userId,
        conversation_id: conversationId
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
  type: string;
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error';
  entity_type: string;
  entity_id: string;
  context: string[];
}

export async function getInsights(context: string = 'dashboard'): Promise<{
  insights: Insight[];
  generated_at: string;
  count: number;
}> {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${AI_API_URL}/insights?context=${context}`, {
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
