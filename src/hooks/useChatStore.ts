import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../lib/types';

export const CHAT_STORAGE_KEY = 'crm-chat-storage';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: Array<Record<string, any>>;
  sources?: Array<Record<string, any>>;
  degradedMode?: boolean;
  degradedReason?: string | null;
}

interface ChatStore {
  scopeKey: string;
  messages: Message[];
  messagesByScope: Record<string, Message[]>;
  setScope: (scopeKey: string) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  clearMessages: () => void;
}

export function getChatScopeKey(user?: Partial<User> | null): string {
  if (!user?.id) {
    return 'anonymous';
  }

  return `${user.tenantId || 'workspace'}:${user.id}`;
}

function getCurrentChatScopeKey(): string {
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    return getChatScopeKey(null);
  }

  try {
    const user = JSON.parse(userStr) as Partial<User>;
    return getChatScopeKey(user);
  } catch (error) {
    console.error('Failed to parse stored user for chat scope:', error);
    return getChatScopeKey(null);
  }
}

function getScopedMessages(
  scopeKey: string,
  messagesByScope: Record<string, Message[]>
): Message[] {
  return messagesByScope[scopeKey] ?? [];
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      scopeKey: getCurrentChatScopeKey(),
      messages: [],
      messagesByScope: {},
      setScope: (scopeKey) =>
        set((state) => {
          if (scopeKey === state.scopeKey) {
            return state;
          }

          return {
            scopeKey,
            messages: getScopedMessages(scopeKey, state.messagesByScope),
          };
        }),
      addMessage: (message) =>
        set((state) => {
          const nextMessages = [...getScopedMessages(state.scopeKey, state.messagesByScope), message];

          return {
            messages: nextMessages,
            messagesByScope: {
              ...state.messagesByScope,
              [state.scopeKey]: nextMessages,
            },
          };
        }),
      setMessages: (messages) =>
        set((state) => ({
          messages,
          messagesByScope: {
            ...state.messagesByScope,
            [state.scopeKey]: messages,
          },
        })),
      clearMessages: () =>
        set((state) => ({
          messages: [],
          messagesByScope: {
            ...state.messagesByScope,
            [state.scopeKey]: [],
          },
        })),
    }),
    {
      name: CHAT_STORAGE_KEY,
      version: 2,
      migrate: (persistedState) => {
        const initialScope = getCurrentChatScopeKey();

        if (!persistedState || typeof persistedState !== 'object') {
          return {
            scopeKey: initialScope,
            messages: [],
            messagesByScope: {},
          };
        }

        const state = persistedState as Partial<ChatStore>;

        // Drop the legacy global transcript entirely so old cross-account chats
        // do not bleed into scoped histories after the migration.
        if (!state.messagesByScope) {
          return {
            scopeKey: initialScope,
            messages: [],
            messagesByScope: {},
          };
        }

        const scopeKey = state.scopeKey ?? initialScope;

        return {
          scopeKey,
          messages: getScopedMessages(scopeKey, state.messagesByScope),
          messagesByScope: state.messagesByScope,
        };
      },
    }
  )
);
