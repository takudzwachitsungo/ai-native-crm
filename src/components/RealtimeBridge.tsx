import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { type RealtimeEvent, startRealtimeStream } from "../lib/realtime";

function matchesQueryPrefix(queryKey: unknown, prefixes: Set<string>) {
  if (!Array.isArray(queryKey) || queryKey.length === 0) {
    return false;
  }
  const [head] = queryKey;
  return typeof head === "string" && prefixes.has(head);
}

export function RealtimeBridge() {
  const queryClient = useQueryClient();
  const { token, user } = useAuth();

  useEffect(() => {
    if (!token || !user?.id) {
      return;
    }

    const stop = startRealtimeStream({
      token,
      onEvent: (event) => {
        window.dispatchEvent(
          new CustomEvent<RealtimeEvent>("crm:realtime-event", {
            detail: event,
          })
        );

        const invalidate = (prefixes: string[]) => {
          const prefixSet = new Set(prefixes);
          queryClient.invalidateQueries({
            predicate: (query) => matchesQueryPrefix(query.queryKey, prefixSet),
          });
        };

        switch (event.eventType) {
          case "task.changed":
            invalidate([
              "tasks",
              "dashboard-tasks",
              "dashboard-stats",
              "support-case-assignment-queue",
            ]);
            break;
          case "deal.changed":
            invalidate([
              "deals",
              "deal-stats",
              "deal-attention-summary",
              "deal-territory-governance-queue",
              "dashboard-all-deals",
              "dashboard-stats",
              "pipeline-analytics",
              "revenue-ops-summary",
              "quota-risk-alerts",
              "territory-exceptions",
              "territory-escalations",
              "governance-inbox",
              "automation-runs",
            ]);
            break;
          case "case.changed":
            invalidate([
              "support-cases",
              "support-case-stats",
              "support-case-assignment-queue",
              "dashboard-stats",
            ]);
            break;
          case "notification.created":
            invalidate(["tasks", "dashboard-tasks"]);
            break;
          case "dashboard.refresh":
            invalidate([
              "dashboard-stats",
              "dashboard-tasks",
              "dashboard-all-deals",
              "dashboard-events",
              "pipeline-analytics",
              "revenue-ops-summary",
              "quota-risk-alerts",
              "territory-exceptions",
              "territory-escalations",
              "governance-inbox",
              "automation-runs",
            ]);
            break;
          default:
            break;
        }
      },
      onError: (error) => {
        console.error("Realtime stream error:", error);
      },
    });

    return stop;
  }, [queryClient, token, user?.id]);

  return null;
}
