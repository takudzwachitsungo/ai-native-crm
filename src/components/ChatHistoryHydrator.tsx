import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getConversationHistory, type Message as AIMessage } from '../lib/ai-api';
import { generateId } from '../lib/helpers';
import { getChatScopeKey, useChatStore } from '../hooks/useChatStore';

type PersistedChatMessage = AIMessage & {
  tool_calls?: Array<Record<string, any>>;
  sources?: Array<Record<string, any>>;
  degraded_mode?: boolean;
  degraded_reason?: string | null;
};

export function ChatHistoryHydrator() {
  const { isAuthenticated, user } = useAuth();
  const { messages, scopeKey, setMessages, setScope } = useChatStore();
  const hydratedScopeRef = useRef<string | null>(null);

  useEffect(() => {
    setScope(getChatScopeKey(user));
  }, [setScope, user]);

  useEffect(() => {
    const expectedScopeKey = getChatScopeKey(user);
    if (!isAuthenticated || !user?.id || scopeKey !== expectedScopeKey) {
      return;
    }

    if (messages.length > 0 || hydratedScopeRef.current === scopeKey) {
      return;
    }

    let cancelled = false;
    hydratedScopeRef.current = scopeKey;

    (async () => {
      const history = (await getConversationHistory('default', 100)) as PersistedChatMessage[];
      if (cancelled || history.length === 0) {
        return;
      }

      if (useChatStore.getState().messages.length > 0) {
        return;
      }

      setMessages(
        history
          .filter((message) => message.role === 'user' || message.role === 'assistant')
          .map((message) => ({
            id: generateId(),
            role: message.role as 'user' | 'assistant',
            content: message.content,
            toolCalls: message.tool_calls,
            sources: message.sources,
            degradedMode: message.degraded_mode,
            degradedReason: message.degraded_reason ?? null,
          }))
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, messages.length, scopeKey, setMessages, user]);

  return null;
}
