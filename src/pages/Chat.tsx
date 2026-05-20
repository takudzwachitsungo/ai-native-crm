import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { Plus, Search, Mic, Send, Loader2, Home } from 'lucide-react';
import { Icons } from '../components/icons';
import { AIDegradedNotice } from '../components/AIDegradedNotice';
import { ChatMarkdown } from '../components/chat/ChatMarkdown';
import { cn } from '../lib/utils';
import { generateId } from '../lib/helpers';
import {
  clearConversation,
  executeAIAction,
  getAIGovernanceCapabilities,
  proposeAIAction,
  streamAgenticResponse,
  type AIActionProposal,
  type AIGovernanceCapabilities,
  type Message as AIMessage,
  type ToolCall,
  type Source
} from '../lib/ai-api';
import { getChatScopeKey, useChatStore } from '../hooks/useChatStore';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  toolCalls?: ToolCall[];
  sources?: Source[];
  degradedMode?: boolean;
  degradedReason?: string | null;
}

export default function Chat() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialMessage = searchParams.get('q');
  const { user } = useAuth();
  const { showToast } = useToast();
  const { messages: storedMessages, addMessage, clearMessages, setScope } = useChatStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [_error, setError] = useState<string | null>(null);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const [governance, setGovernance] = useState<AIGovernanceCapabilities | null>(null);
  const [actionProposal, setActionProposal] = useState<{
    messageId: string;
    proposal: AIActionProposal;
  } | null>(null);
  const [proposalLoadingId, setProposalLoadingId] = useState<string | null>(null);
  const [executingProposalId, setExecutingProposalId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasInitializedRef = useRef(false);

  const messages = storedMessages;
  const latestDegradedMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant' && message.degradedMode);

  useEffect(() => {
    setScope(getChatScopeKey(user));
    hasInitializedRef.current = false;
  }, [setScope, user]);

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    getAIGovernanceCapabilities()
      .then((capabilities) => {
        if (isMounted) {
          setGovernance(capabilities);
        }
      })
      .catch((error) => {
        console.warn('Failed to load AI governance capabilities:', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (initialMessage && messages.length === 0 && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: initialMessage,
      };
      addMessage(userMessage);

      setIsLoading(true);
      setError(null);
      setStreamingMessage('');
      setCurrentTool(null);

      const conversationHistory: AIMessage[] = [];
      const context = {
        page: window.location.pathname.split('/')[1] || 'chat',
        timestamp: new Date().toISOString(),
      };

      (async () => {
        let fullResponse = '';

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
              fullResponse += event.content || '';
              setStreamingMessage(fullResponse);
            } else if (event.type === 'done') {
              const assistantMessage: Message = {
                id: generateId(),
                role: 'assistant',
                content: event.message || fullResponse,
                toolCalls: event.toolCalls,
                sources: event.sources,
                degradedMode: event.degraded_mode,
                degradedReason: event.degraded_reason ?? null,
              };
              addMessage(assistantMessage);
              setStreamingMessage('');
            }
          }
        } catch (err: any) {
          console.error('Error getting AI response:', err);
          setError(err.message || 'Failed to get response from AI assistant.');
          addMessage({
            id: generateId(),
            role: 'assistant',
            content: `Error: ${err.message || 'Failed to get response. Please check your connection and try again.'}`,
          });
          setStreamingMessage('');
        } finally {
          setIsLoading(false);
          setCurrentTool(null);
        }
      })();
    }
  }, [addMessage, initialMessage, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, streamingMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const query = input.trim();
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: query,
    };

    addMessage(userMessage);
    setInput('');
    setError(null);
    setStreamingMessage('');
    setCurrentTool(null);
    setIsLoading(true);

    const conversationHistory: AIMessage[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const currentPath = window.location.pathname;
    const context = {
      page: currentPath.split('/')[1] || 'chat',
      timestamp: new Date().toISOString(),
    };

    try {
      let fullResponse = '';

      for await (const event of streamAgenticResponse(
        [...conversationHistory, { role: 'user', content: query }],
        context
      )) {
        if (event.type === 'tool_start') {
          setCurrentTool(event.display_name || event.tool || null);
        } else if (event.type === 'tool_end') {
          setCurrentTool(null);
        } else if (event.type === 'token') {
          fullResponse += event.content || '';
          setStreamingMessage(fullResponse);
        } else if (event.type === 'done') {
          const assistantMessage: Message = {
            id: generateId(),
            role: 'assistant',
            content: event.message || fullResponse,
            toolCalls: event.toolCalls,
            sources: event.sources,
            degradedMode: event.degraded_mode,
            degradedReason: event.degraded_reason ?? null,
          };
          addMessage(assistantMessage);
          setStreamingMessage('');
        }
      }
    } catch (err: any) {
      console.error('Error getting AI response:', err);
      setError(err.message || 'Failed to get response from AI assistant.');
      addMessage({
        id: generateId(),
        role: 'assistant',
        content: `Error: ${err.message || 'Failed to get response. Please check your connection and try again.'}`,
      });
      setStreamingMessage('');
    } finally {
      setIsLoading(false);
      setCurrentTool(null);
    }
  };

  const handleClearConversation = async () => {
    const clearedRemotely = await clearConversation();
    clearMessages();

    if (!clearedRemotely) {
      console.warn('Failed to clear remote conversation history for current user.');
    }
  };

  const handleProposeTask = async (message: Pick<Message, 'id' | 'content'>) => {
    setProposalLoadingId(message.id);
    try {
      const proposal = await proposeAIAction({
        intent: message.content,
        action_type: 'create_task',
        payload: {
          title: 'Follow up from AI assistant',
          description: `Created from assistant recommendation:\n\n${message.content.slice(0, 1200)}`,
          priority: 'MEDIUM',
          status: 'PENDING',
        },
      });
      setActionProposal({ messageId: message.id, proposal });
    } catch (error: any) {
      console.error('Failed to propose AI action:', error);
      showToast(error.message || 'Failed to propose AI action', 'error');
    } finally {
      setProposalLoadingId(null);
    }
  };

  const handleExecuteProposal = async (proposal: AIActionProposal) => {
    setExecutingProposalId(proposal.proposal_id);
    try {
      await executeAIAction({
        proposal_id: proposal.proposal_id,
        action_type: proposal.action_type,
        payload: proposal.payload,
        confirmed: true,
      });
      showToast('AI action completed and audit logged', 'success');
      setActionProposal(null);
    } catch (error: any) {
      console.error('Failed to execute AI action:', error);
      showToast(error.message || 'Failed to execute AI action', 'error');
    } finally {
      setExecutingProposalId(null);
    }
  };

  return (
    <div
      className={cn(
        'flex h-app flex-col transition-all duration-300 ease-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      )}
    >
      <div className="border-b border-border bg-card px-4 py-4 pl-16 md:px-8">
        <div className="mx-auto flex max-w-[860px] items-center justify-between">
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
            {governance?.audit_logging && (
              <>
                <span className="text-border">|</span>
                <span title="AI requests, tool calls, insight changes, and confirmed actions are audit logged.">
                  Governed
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        <div className="mx-auto max-w-[860px]">
          {latestDegradedMessage && (
            <AIDegradedNotice
              className="mb-4"
              reason={latestDegradedMessage.degradedReason}
            />
          )}
          {messages.length === 0 ? (
            <div
              className={cn(
                'flex flex-col items-center justify-center h-full text-center transition-all duration-500 delay-150',
                isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              )}
            >
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Icons.LogoSmall />
              </div>
              <h2 className="text-xl font-medium mb-2">How can I help you?</h2>
              <p className="text-muted-foreground text-sm max-w-md">
                Ask me anything about your leads, deals, contacts, pipeline, or sales metrics.
              </p>
              {governance && (
                <div className="mt-4 max-w-lg rounded-xl border border-border bg-card px-4 py-3 text-left text-xs text-muted-foreground shadow-sm">
                  <p className="font-medium text-foreground">AI guardrails are active</p>
                  <p className="mt-1">
                    Confirmed actions are enabled for tasks and draft emails. The assistant will not send emails or make destructive changes without a separate user action.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleClearConversation}
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
                      'flex',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mr-3">
                        <Icons.LogoSmall />
                      </div>
                    )}

                    {message.role === 'assistant' ? (
                      <div className="max-w-[82%] md:max-w-[760px]">
                        <div className="w-fit rounded-2xl rounded-tl-md bg-secondary px-4 py-3 text-sm leading-relaxed text-foreground">
                          <ChatMarkdown content={message.content} />
                        </div>

                        {governance?.actions?.requires_confirmation && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void handleProposeTask(message)}
                              disabled={proposalLoadingId === message.id}
                              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary disabled:opacity-60"
                            >
                              {proposalLoadingId === message.id ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <Icons.CheckSquare size={13} />
                              )}
                              Propose task
                            </button>
                            <span className="text-xs text-muted-foreground">
                              Requires confirmation
                            </span>
                          </div>
                        )}

                        {actionProposal?.messageId === message.id && (
                          <div className="mt-3 rounded-xl border border-border bg-card p-3 text-sm shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium">Confirm AI action</p>
                                <p className="mt-1 text-muted-foreground">{actionProposal.proposal.preview}</p>
                              </div>
                              <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                                {actionProposal.proposal.risk_level}
                              </span>
                            </div>
                            <div className="mt-3 rounded-lg bg-muted/40 p-2 text-xs text-muted-foreground">
                              <p>Action: {actionProposal.proposal.action_type.replaceAll('_', ' ')}</p>
                              {actionProposal.proposal.payload?.title && (
                                <p>Title: {actionProposal.proposal.payload.title}</p>
                              )}
                              {actionProposal.proposal.payload?.dueDate && (
                                <p>Due: {new Date(actionProposal.proposal.payload.dueDate).toLocaleString()}</p>
                              )}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void handleExecuteProposal(actionProposal.proposal)}
                                disabled={executingProposalId === actionProposal.proposal.proposal_id}
                                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                              >
                                {executingProposalId === actionProposal.proposal.proposal_id && (
                                  <Loader2 className="size-3 animate-spin" />
                                )}
                                Confirm and create
                              </button>
                              <button
                                type="button"
                                onClick={() => setActionProposal(null)}
                                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="max-w-[70%] rounded-2xl rounded-tr-md bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground">
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      </div>
                      )}

                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 ml-3">
                        <span className="text-xs font-medium text-primary-foreground">Y</span>
                      </div>
                    )}
                  </div>
                ))}

                {streamingMessage && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <Icons.LogoSmall />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">CRM Assistant</span>
                      </div>
                      <div className="w-fit max-w-[82%] rounded-2xl rounded-tl-md bg-secondary px-4 py-3 md:max-w-[760px]">
                        <ChatMarkdown content={streamingMessage} />
                      </div>
                    </div>
                  </div>
                )}

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

      <div className="px-4 md:px-8 py-4">
        <div className="mx-auto max-w-[860px]">
          <form
            onSubmit={handleSubmit}
            className={cn(
              'w-full overflow-hidden rounded-xl',
              'bg-secondary',
              'border border-border',
              'transition-all duration-300 ease-in-out'
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
                    'w-full resize-none border-none p-3 pt-4 shadow-none outline-none ring-0 text-sm',
                    'bg-transparent placeholder:text-muted-foreground/50',
                    'min-h-[55px] max-h-[120px]',
                    'focus-visible:ring-0'
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
                      'size-6 flex items-center justify-center rounded transition-colors',
                      input.trim() && !isLoading
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'text-muted-foreground cursor-not-allowed'
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
