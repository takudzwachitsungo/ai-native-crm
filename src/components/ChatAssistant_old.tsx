import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, LayoutDashboard, Search, Clock, Mic, Send, Bot, X, Maximize2, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { streamAgenticResponse, getConversationHistory, clearConversation } from '../lib/ai-api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export function ChatAssistant() {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on the chat page itself
  const isOnChatPage = location.pathname === '/chat';
  const isOnDashboard = location.pathname === '/';

  // Listen for chat suggestion events from dashboard
  useEffect(() => {
    const handleSuggestion = (event: any) => {
      const { prompt, autoSend } = event.detail;
      if (autoSend) {
        // Immediately navigate to chat with the prompt
        navigate(`/chat?q=${encodeURIComponent(prompt)}`);
      } else {
        // Just set the input
        setInput(prompt);
        textareaRef.current?.focus();
      }
    };

    window.addEventListener('chat-suggestion', handleSuggestion);
    return () => window.removeEventListener('chat-suggestion', handleSuggestion);
  }, [navigate]);

  const handleDashboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    // Add a brief fade out before navigating
    const wrapper = document.querySelector('[data-chat-wrapper]');
    if (wrapper) {
      wrapper.classList.add('opacity-0', 'translate-y-2');
    }
    
    setTimeout(() => {
      navigate(`/chat?q=${encodeURIComponent(input.trim())}`);
      setInput('');
    }, 150);
  };

  const handleBubbleClick = () => {
    navigate('/chat');
  };

  // Don't render on chat page
  if (isOnChatPage) return null;

  // Show bubble and slide-in panel on non-dashboard pages
  if (!isOnDashboard) {
    return (
      <>
        {/* Floating bubble */}
        <button
          onClick={handleBubbleClick}
          className="fixed bottom-6 right-6 z-[100] size-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center group"
          title="Open CRM Assistant"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>

        {/* Slide-in panel */}
        {isPanelOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/20 z-[110] transition-opacity"
              onClick={handleClosePanel}
            />

            {/* Panel */}
            <div className="fixed bottom-0 right-0 w-full sm:w-[440px] h-[50vh] bg-background z-[120] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 rounded-tl-xl">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">CRM Assistant</h2>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleGoToFullChat}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Open in full screen"
                  >
                    <Maximize2 size={18} />
                  </button>
                  <button
                    onClick={handleClosePanel}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <p className="text-sm">Ask me anything about your CRM</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex gap-3",
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-lg p-3 text-sm",
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
                {/* Streaming message */}
                {streamingMessage && (
                  <div className="flex gap-3 justify-start">
                    <div className="bg-muted rounded-lg p-3 max-w-[80%]">
                      <p className="whitespace-pre-wrap">{streamingMessage}</p>
                    </div>
                  </div>
                )}
                {/* Tool indicator */}
                {currentTool && (
                  <div className="flex gap-2 items-center text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 animate-pulse">
                    <Loader2 className="size-3 animate-spin" />
                    <span className="font-medium">{currentTool}...</span>
                  </div>
                )}
                {isLoading && !streamingMessage && !currentTool && (
                  <div className="flex gap-3 justify-start">
                    <div className="bg-muted rounded-lg p-3">
                      <Loader2 className="size-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t p-4">
                <form onSubmit={handlePanelSubmit} className="flex gap-2">
                  <input
                    ref={textareaRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className={cn(
                      "px-4 py-2 rounded-lg transition-colors flex items-center gap-2",
                      input.trim() && !isLoading
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    {isLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </>
    );
  }


  // Show full floating bar on dashboard
  return (
    <div 
      data-chat-wrapper
      className="fixed bottom-6 left-0 right-0 z-[100] transition-all duration-300 ease-in-out md:left-[70px] px-4 md:px-6"
    >
      <div className="mx-auto w-full max-w-full md:max-w-[770px]">
        <form
          onSubmit={handleDashboardSubmit}
          className={cn(
            "w-full overflow-hidden rounded-xl",
            "!bg-[rgba(247,247,247,0.85)] dark:!bg-[rgba(19,19,19,0.7)] backdrop-blur-lg",
            "border border-[#e6e6e6] dark:border-[#1d1d1d]",
            "transition-all duration-300 ease-in-out"
          )}
        >
          <div className="flex flex-col">
            {/* Main input area */}
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask your CRM assistant anything..."
                className={cn(
                  "w-full resize-none border-none p-3 pt-4 shadow-none outline-none ring-0 text-sm",
                  "field-sizing-content bg-transparent dark:bg-transparent placeholder:text-[rgba(102,102,102,0.5)]",
                  "min-h-[55px] max-h-[55px]",
                  "focus-visible:ring-0"
                )}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleDashboardSubmit(e);
                  }
                }}
              />
            </div>

            {/* Bottom toolbar */}
            <div className="flex items-center justify-between px-3 pb-2">
              {/* Left side tools */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="size-6 flex items-center justify-center hover:bg-[#f7f7f7] dark:hover:bg-[#1d1d1d] rounded transition-colors text-muted-foreground"
                  title="Add attachment"
                  aria-label="Add attachment"
                >
                  <Plus size={16} />
                </button>

                <button
                  type="button"
                  className="size-6 flex items-center justify-center hover:bg-[#f7f7f7] dark:hover:bg-[#1d1d1d] rounded transition-colors text-muted-foreground"
                  title="Suggested actions"
                  aria-label="Suggested actions"
                >
                  <LayoutDashboard size={16} />
                </button>

                <button
                  type="button"
                  className="size-6 flex items-center justify-center hover:bg-[#f7f7f7] dark:hover:bg-[#1d1d1d] rounded transition-colors text-muted-foreground"
                  title="Web search"
                  aria-label="Web search"
                >
                  <Search size={16} />
                </button>

                <button
                  type="button"
                  className="size-6 flex items-center justify-center hover:bg-[#f7f7f7] dark:hover:bg-[#1d1d1d] rounded transition-colors text-muted-foreground"
                  title="History"
                  aria-label="View history"
                >
                  <Clock size={16} />
                </button>
              </div>

              {/* Right side tools */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="size-6 flex items-center justify-center hover:bg-[#f7f7f7] dark:hover:bg-[#1d1d1d] rounded transition-colors text-muted-foreground"
                  title="Voice input"
                  aria-label="Voice input"
                >
                  <Mic size={16} />
                </button>

                <button
                  type="submit"
                  disabled={!input.trim()}
                  className={cn(
                    "size-6 flex items-center justify-center rounded transition-colors",
                    input.trim()
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
  );
}
