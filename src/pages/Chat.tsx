import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { Plus, Search, Mic, Send, Loader2, Home, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Icons } from '../components/icons';
import { cn } from '../lib/utils';
import { generateId } from '../lib/helpers';
import { streamAgenticResponse, type Message as AIMessage, type ToolCall, type Source } from '../lib/ai-api';
import { useChatStore } from '../hooks/useChatStore';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  toolCalls?: ToolCall[];
  sources?: Source[];
}

export default function Chat() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialMessage = searchParams.get('q');
  const { messages: storedMessages, addMessage, clearMessages } = useChatStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [_error, setError] = useState<string | null>(null);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasInitializedRef = useRef(false);

  // Use stored messages
  const messages = storedMessages;

  // Animate in on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  // Handle initial message from query param
  useEffect(() => {
    if (initialMessage && messages.length === 0 && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: initialMessage,
      };
      addMessage(userMessage);
      
      // Get AI response with context
      setIsLoading(true);
      setError(null);
      setStreamingMessage('');
      setCurrentTool(null);
      
      const conversationHistory: AIMessage[] = [];
      const context = {
        page: window.location.pathname.split('/')[1] || 'chat',
        timestamp: new Date().toISOString()
      };
      
      // Stream the response
      (async () => {
        try {
          for await (const event of streamAgenticResponse(
            [...conversationHistory, { role: 'user', content: initialMessage }],
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
                toolCalls: event.toolCalls,
                sources: event.sources
              };
              addMessage(assistantMessage);
              setStreamingMessage('');
            }
          }
        } catch (err: any) {
          console.error('Error getting AI response:', err);
          setError(err.message || 'Failed to get response from AI assistant.');
          const errorMessage: Message = {
            id: generateId(),
            role: 'assistant',
            content: '❌ ' + (err.message || 'Failed to get response. Please check your connection and try again.'),
          };
          addMessage(errorMessage);
          setStreamingMessage('');
        } finally {
          setIsLoading(false);
          setCurrentTool(null);
        }
      })();
    }
  }, [initialMessage, messages.length]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, streamingMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
    };
    
    addMessage(userMessage);
    const query = input.trim();
    setInput('');
    setError(null);
    setStreamingMessage('');
    setCurrentTool(null);

    // Get AI response with conversation history and context
    setIsLoading(true);
    
    // Build conversation history for context
    const conversationHistory: AIMessage[] = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // Get current page context from URL
    const currentPath = window.location.pathname;
    const context = {
      page: currentPath.split('/')[1] || 'chat',
      timestamp: new Date().toISOString()
    };

    try {
      // Stream the response
      for await (const event of streamAgenticResponse(
        [...conversationHistory, { role: 'user', content: query }],
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
            toolCalls: event.toolCalls,
            sources: event.sources
          };
          addMessage(assistantMessage);
          setStreamingMessage('');
        }
      }
    } catch (err: any) {
      console.error('Error getting AI response:', err);
      setError(err.message || 'Failed to get response from AI assistant.');
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: '❌ ' + (err.message || 'Failed to get response. Please check your connection and try again.'),
      };
      addMessage(errorMessage);
      setStreamingMessage('');
    } finally {
      setIsLoading(false);
      setCurrentTool(null);
    }
  };

  return (
    <div 
      className={cn(
        "flex flex-col h-screen transition-all duration-300 ease-out",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
    >
      {/* Header */}
      <div className="border-b border-border bg-card px-4 md:px-8 py-4">
        <div className="max-w-[770px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
              title="Back to Dashboard"
            >
              <Home size={20} />
            </button>
            <h1 className="text-lg font-semibold">CRM Assistant</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span>Chat synced</span>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        <div className="max-w-[770px] mx-auto">
          {messages.length === 0 ? (
            <div 
              className={cn(
                "flex flex-col items-center justify-center h-full text-center transition-all duration-500 delay-150",
                isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
              )}
            >
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Icons.LogoSmall />
              </div>
              <h2 className="text-xl font-medium mb-2">How can I help you?</h2>
              <p className="text-muted-foreground text-sm max-w-md">
                Ask me anything about your leads, deals, contacts, pipeline, or sales metrics.
              </p>
            </div>
          ) : (
            <>
              {/* Clear conversation button */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => clearMessages()}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear conversation
                </button>
              </div>
              <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {/* Assistant avatar - left side */}
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mr-3">
                      <Icons.LogoSmall />
                    </div>
                  )}
                  
                  {/* Message bubble */}
                  <div className={cn(
                    "max-w-[70%] px-4 py-3 text-sm leading-relaxed",
                    message.role === 'assistant' 
                      ? 'bg-secondary text-foreground rounded-2xl rounded-tl-md'
                      : 'bg-primary text-primary-foreground rounded-2xl rounded-tr-md'
                  )}>
                    {message.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        <ReactMarkdown
                          components={{
                            // Customize heading styles
                            h1: ({ children }) => <h1 className="text-lg font-semibold mb-2">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-base font-semibold mb-2">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
                            // Customize list styles
                            ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-2">{children}</ol>,
                            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                            // Customize paragraph spacing
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            // Customize strong/bold
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            // Customize code
                            code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    )}
                  </div>

                  {/* User avatar - right side */}
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 ml-3">
                      <span className="text-xs font-medium text-primary-foreground">Y</span>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Streaming message */}
              {streamingMessage && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <Icons.LogoSmall />
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">CRM Assistant</span>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => <h1 className="text-lg font-semibold mb-2">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-semibold mb-2">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
                          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-2">{children}</ol>,
                          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>,
                        }}
                      >
                        {streamingMessage}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Tool indicator */}
              {currentTool && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <Icons.LogoSmall />
                  </div>
                  <div className="flex items-center gap-3 text-sm bg-secondary/30 rounded-lg px-4 py-2.5 animate-pulse">
                    <Loader2 className="size-4 animate-spin text-primary" />
                    <span className="font-medium">{currentTool}...</span>
                  </div>
                </div>
              )}
              
              {/* Loading indicator */}
              {isLoading && !streamingMessage && !currentTool && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <Icons.LogoSmall />
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">CRM Assistant</span>
                    </div>
                    <div className="flex gap-1 py-2">
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            </>
          )}
        </div>
      </div>

      {/* Chat input - fixed at bottom */}
      <div className="px-4 md:px-8 py-4">
        <div className="max-w-[770px] mx-auto">
          <form
            onSubmit={handleSubmit}
            className={cn(
              "w-full overflow-hidden rounded-xl",
              "bg-secondary",
              "border border-border",
              "transition-all duration-300 ease-in-out"
            )}
          >
            <div className="flex flex-col">
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask your CRM assistant anything..."
                  className={cn(
                    "w-full resize-none border-none p-3 pt-4 shadow-none outline-none ring-0 text-sm",
                    "bg-transparent placeholder:text-muted-foreground/50",
                    "min-h-[55px] max-h-[120px]",
                    "focus-visible:ring-0"
                  )}
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
              </div>

              <div className="flex items-center justify-between px-3 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="size-6 flex items-center justify-center hover:bg-muted rounded transition-colors text-muted-foreground"
                    aria-label="Add attachment"
                  >
                    <Plus size={16} />
                  </button>

                  <button
                    type="button"
                    className="size-6 flex items-center justify-center hover:bg-muted rounded transition-colors text-muted-foreground"
                    aria-label="Web search"
                  >
                    <Search size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="size-6 flex items-center justify-center hover:bg-muted rounded transition-colors text-muted-foreground"
                    aria-label="Voice input"
                  >
                    <Mic size={16} />
                  </button>

                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className={cn(
                      "size-6 flex items-center justify-center rounded transition-colors",
                      input.trim() && !isLoading
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "text-muted-foreground cursor-not-allowed"
                    )}
                    title="Send message"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
