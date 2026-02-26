import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Send, Bot, Loader2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { generateId } from '../lib/helpers';
import { streamAgenticResponse, type Message as AIMessage } from '../lib/ai-api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function ChatAssistant() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isOnChatPage = location.pathname === '/chat';
  const isOnDashboard = location.pathname === '/';

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (isOnDashboard) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingMessage, isOnDashboard]);

  const handleDashboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setStreamingMessage('');
    setCurrentTool(null);

    const conversationHistory: AIMessage[] = messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    const context = {
      page: 'dashboard',
      timestamp: new Date().toISOString()
    };

    try {
      for await (const event of streamAgenticResponse(
        [...conversationHistory, { role: 'user', content: userMessage.content }],
        context
      )) {
        if (event.type === 'tool_start') {
          setCurrentTool(event.display_name || event.tool || null);
        } else if (event.type === 'tool_end') {
          setCurrentTool(null);
        } else if (event.type === 'token') {
          setStreamingMessage(prev => prev + (event.content || ''));
        } else if (event.type === 'done') {
          const assistantMessage: Message = {
            id: generateId(),
            role: 'assistant',
            content: event.message || streamingMessage,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, assistantMessage]);
          setStreamingMessage('');
        }
      }
    } catch (err: any) {
      console.error('Error getting AI response:', err);
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: '❌ ' + (err.message || 'Failed to get response. Please try again.'),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      setStreamingMessage('');
    } finally {
      setIsLoading(false);
      setCurrentTool(null);
    }
  };

  const handleClearConversation = () => {
    setMessages([]);
  };

  const handleBubbleClick = () => {
    navigate('/chat');
  };

  // Don't render on chat page or dashboard
  if (isOnChatPage || isOnDashboard) return null;

  // Show floating bubble on non-dashboard, non-chat pages
  return (
    <button
      onClick={handleBubbleClick}
      className="fixed bottom-6 right-6 z-[100] size-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center group"
      title="Open CRM Assistant"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    </button>
  );
}
