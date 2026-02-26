import { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, Loader2 } from 'lucide-react';
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

interface DashboardChatProps {
  onExpand: (expanded: boolean) => void;
}

export function DashboardChat({ onExpand }: DashboardChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
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
    
    // Expand chat on first message
    if (messages.length === 0) {
      onExpand(true);
    }

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

  const handleClear = () => {
    setMessages([]);
    onExpand(false);
  };

  return (
    <div className="mb-6">
      {/* Chat Input - Always visible */}
      <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
        <div className="absolute left-3 text-muted-foreground z-10">
          <Bot size={18} />
        </div>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as any);
            }
          }}
          placeholder="Ask your AI assistant anything..."
          disabled={isLoading}
          className="flex-1 min-h-[44px] max-h-[120px] resize-none rounded-xl border bg-background pl-10 pr-12 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus-visible:ring-offset-2 placeholder:text-muted-foreground/60 disabled:opacity-50"
          rows={1}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={cn(
            "absolute right-2 p-2 rounded-lg transition-colors",
            input.trim() && !isLoading
              ? "text-primary hover:bg-primary/10"
              : "text-muted-foreground/40 cursor-not-allowed"
          )}
          title="Send message"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>

      {/* Conversation Area - Expands when there are messages */}
      {(messages.length > 0 || isLoading) && (
        <div className="mt-4 border rounded-xl bg-card shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Bot size={16} className="text-primary" />
              <h3 className="text-sm font-semibold">AI Assistant</h3>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={handleClear}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                  title="Clear conversation"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="max-h-[500px] overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 size-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot size={16} className="text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-4 py-2.5 text-sm",
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 size-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-xs">
                    You
                  </div>
                )}
              </div>
            ))}

            {/* Streaming message */}
            {streamingMessage && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 size-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot size={16} className="text-primary" />
                </div>
                <div className="max-w-[80%] rounded-lg px-4 py-2.5 bg-muted text-sm">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>
                      {streamingMessage}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {/* Tool indicator */}
            {currentTool && (
              <div className="flex gap-2 items-center text-xs text-muted-foreground">
                <Loader2 size={14} className="animate-spin" />
                <span>Using {currentTool}...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
