import { API_BASE_URL } from "./api-client";

export interface RealtimeEvent {
  eventType: string;
  entityType?: string | null;
  entityId?: string | null;
  scope?: string | null;
  payload?: Record<string, unknown> | null;
  occurredAt?: string | null;
}

interface RealtimeStreamOptions {
  token: string;
  onEvent: (event: RealtimeEvent) => void;
  onOpen?: () => void;
  onError?: (error: unknown) => void;
}

class RealtimeAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RealtimeAuthorizationError";
  }
}

function parseSseChunk(chunk: string): string | null {
  const lines = chunk.split(/\r?\n/);
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  return dataLines.join("\n");
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function startRealtimeStream(options: RealtimeStreamOptions) {
  let stopped = false;
  let controller: AbortController | null = null;

  const run = async () => {
    while (!stopped) {
      controller = new AbortController();

      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/realtime/stream`, {
          method: "GET",
          headers: {
            Accept: "text/event-stream",
            Authorization: `Bearer ${options.token}`,
          },
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          if (response.status === 401 || response.status === 403) {
            throw new RealtimeAuthorizationError(`Realtime stream failed with status ${response.status}`);
          }
          throw new Error(`Realtime stream failed with status ${response.status}`);
        }

        options.onOpen?.();

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!stopped) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          while (buffer.includes("\n\n")) {
            const boundaryIndex = buffer.indexOf("\n\n");
            const rawChunk = buffer.slice(0, boundaryIndex);
            buffer = buffer.slice(boundaryIndex + 2);

            const data = parseSseChunk(rawChunk);
            if (!data) {
              continue;
            }

            try {
              options.onEvent(JSON.parse(data) as RealtimeEvent);
            } catch (error) {
              console.error("Failed to parse realtime event payload:", error, data);
            }
          }
        }
      } catch (error) {
        if (stopped) {
          break;
        }
        options.onError?.(error);
        if (error instanceof RealtimeAuthorizationError) {
          break;
        }
      }

      if (!stopped) {
        await delay(3000);
      }
    }
  };

  void run();

  return () => {
    stopped = true;
    controller?.abort();
  };
}
