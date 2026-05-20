import { useEffect } from "react";
import { CHAT_STORAGE_KEY, useChatStore } from "../hooks/useChatStore";

interface ChatSyncMessage {
  originId: string;
  scopeKey: string;
  messages: ReturnType<typeof useChatStore.getState>["messages"];
}

function getOriginId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `chat-sync-${Date.now()}`;
}

export function ChatRealtimeBridge() {
  useEffect(() => {
    const originId = getOriginId();
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("crm-chat-sync")
        : null;
    const suppressBroadcast = { current: false };

    const unsubscribe = useChatStore.subscribe((state) => {
      if (suppressBroadcast.current) {
        return;
      }

      const message: ChatSyncMessage = {
        originId,
        scopeKey: state.scopeKey,
        messages: state.messages,
      };

      channel?.postMessage(message);
      window.dispatchEvent(new CustomEvent("crm:chat-updated", { detail: message }));
    });

    const applyRemoteMessages = (scopeKey: string, messages: ChatSyncMessage["messages"]) => {
      const store = useChatStore.getState();
      if (store.scopeKey !== scopeKey) {
        return;
      }
      suppressBroadcast.current = true;
      store.setMessages(messages);
      suppressBroadcast.current = false;
    };

    const handleChannelMessage = (event: MessageEvent<ChatSyncMessage>) => {
      const detail = event.data;
      if (!detail || detail.originId === originId) {
        return;
      }
      applyRemoteMessages(detail.scopeKey, detail.messages);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== CHAT_STORAGE_KEY || !event.newValue) {
        return;
      }
      try {
        const persisted = JSON.parse(event.newValue) as {
          state?: {
            scopeKey?: string;
            messagesByScope?: Record<string, ChatSyncMessage["messages"]>;
          };
        };
        const scopeKey = useChatStore.getState().scopeKey;
        const nextMessages = persisted.state?.messagesByScope?.[scopeKey];
        if (nextMessages !== undefined) {
          applyRemoteMessages(scopeKey, nextMessages);
        }
      } catch (error) {
        console.error("Failed to sync chat state from storage:", error);
      }
    };

    channel?.addEventListener("message", handleChannelMessage);
    window.addEventListener("storage", handleStorage);

    return () => {
      unsubscribe();
      channel?.removeEventListener("message", handleChannelMessage);
      channel?.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return null;
}
