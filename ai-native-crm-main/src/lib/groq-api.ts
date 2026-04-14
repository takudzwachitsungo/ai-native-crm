import axios from 'axios';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: Message;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const systemPrompt = `You are a helpful CRM assistant integrated into a Customer Relationship Management system. You help users manage their leads, deals, contacts, companies, and sales pipeline.

You have access to CRM data and can help with:
- Lead scoring and prioritization
- Deal pipeline analysis
- Contact and company information
- Sales forecasting and reporting
- Task and activity management
- Quote and invoice tracking

When users ask questions:
1. Be concise and actionable
2. Provide specific numbers and data points when relevant
3. Format responses with markdown for better readability
4. Suggest next actions when appropriate
5. If you need more information, ask clarifying questions

Always maintain a professional, helpful tone and focus on helping users be more productive with their CRM.`;

export async function getChatCompletion(
  messages: Message[],
  model: string = 'llama-3.3-70b-versatile'
): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error('Groq API key is not configured. Please add VITE_GROQ_API_KEY to your .env file.');
  }

  try {
    const response = await axios.post<GroqResponse>(
      GROQ_API_URL,
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 1,
        stream: false,
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
  } catch (error: any) {
    console.error('Groq API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      throw new Error('Invalid Groq API key. Please check your VITE_GROQ_API_KEY.');
    }
    
    if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a moment.');
    }
    
    throw new Error('Failed to get AI response. Please try again.');
  }
}

export async function getAssistantResponse(query: string, conversationHistory: Message[] = []): Promise<string> {
  const messages: Message[] = [
    ...conversationHistory,
    { role: 'user', content: query },
  ];

  return getChatCompletion(messages);
}
