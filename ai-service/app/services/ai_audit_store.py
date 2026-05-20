from __future__ import annotations

import json
import logging
import math
import threading
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)


class AIAuditStore:
    """Durable AI governance events with Postgres-first, JSONL fallback storage."""

    def __init__(self, database_url: str, fallback_path: str):
        self.database_url = database_url
        self.fallback_path = Path(fallback_path)
        self.fallback_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._postgres_ready = False

    def initialize(self) -> None:
        try:
            with psycopg2.connect(self.database_url) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS ai_audit_events (
                            id UUID PRIMARY KEY,
                            tenant_id TEXT,
                            user_id TEXT NOT NULL,
                            event_type TEXT NOT NULL,
                            action TEXT,
                            outcome TEXT NOT NULL,
                            conversation_id TEXT,
                            request_id TEXT,
                            prompt TEXT,
                            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                        )
                        """
                    )
                    cur.execute(
                        """
                        CREATE INDEX IF NOT EXISTS idx_ai_audit_events_scope_created
                        ON ai_audit_events (tenant_id, user_id, created_at DESC)
                        """
                    )
                conn.commit()
            self._postgres_ready = True
            logger.info("AI audit store initialized in Postgres")
        except Exception as exc:
            self._postgres_ready = False
            logger.warning("AI audit store using JSONL fallback: %s", exc)

    def record(
        self,
        *,
        event_type: str,
        user_id: str,
        tenant_id: Optional[str],
        outcome: str,
        action: Optional[str] = None,
        conversation_id: Optional[str] = None,
        request_id: Optional[str] = None,
        prompt: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        event = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id or "",
            "user_id": user_id,
            "event_type": event_type,
            "action": action,
            "outcome": outcome,
            "conversation_id": conversation_id,
            "request_id": request_id,
            "prompt": self._trim_prompt(prompt),
            "metadata": metadata or {},
            "created_at": datetime.utcnow().isoformat(),
        }

        if self._postgres_ready and self._record_postgres(event):
            return event

        self._record_jsonl(event)
        return event

    def list(
        self,
        *,
        user_id: str,
        tenant_id: Optional[str],
        limit: int = 100,
        event_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        limit = max(1, min(limit, 500))
        if self._postgres_ready:
            try:
                return self._list_postgres(user_id, tenant_id or "", limit, event_type)
            except Exception as exc:
                logger.warning("Failed to list AI audit events from Postgres: %s", exc)

        return self._list_jsonl(user_id, tenant_id or "", limit, event_type)

    def list_recent(self, *, limit: int = 1000) -> List[Dict[str, Any]]:
        limit = max(1, min(limit, 5000))
        if self._postgres_ready:
            try:
                with psycopg2.connect(self.database_url) as conn:
                    with conn.cursor(cursor_factory=RealDictCursor) as cur:
                        cur.execute(
                            """
                            SELECT id::text, tenant_id, user_id, event_type, action, outcome,
                                   conversation_id, request_id, prompt, metadata, created_at
                            FROM ai_audit_events
                            ORDER BY created_at DESC
                            LIMIT %s
                            """,
                            (limit,),
                        )
                        return [self._normalize_event(dict(row)) for row in cur.fetchall()]
            except Exception as exc:
                logger.warning("Failed to list recent AI audit events from Postgres: %s", exc)
        return self._list_jsonl_any(limit)

    def summary(
        self,
        *,
        user_id: str,
        tenant_id: Optional[str],
        limit: int = 500,
        failure_rate_threshold: float = 20.0,
        fallback_rate_threshold: float = 20.0,
        latency_p95_threshold_ms: float = 15000.0,
        provider_error_threshold: int = 1,
    ) -> Dict[str, Any]:
        """Return a compact operational summary from recent audit events."""
        events = self.list(user_id=user_id, tenant_id=tenant_id, limit=limit)
        by_type: Dict[str, int] = {}
        by_outcome: Dict[str, int] = {}
        action_counts: Dict[str, int] = {}
        tool_counts: Dict[str, int] = {}
        events_by_day: Dict[str, int] = {}
        latency_values: List[float] = []
        token_usage = {
            "llm_calls": 0,
            "input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0,
        }
        usage_by_model: Dict[str, Dict[str, int]] = {}
        provider_error_counts: Dict[str, int] = {}
        provider_error_count = 0
        estimated_cost_usd = 0.0
        cost_pricing_configured = False
        degraded_count = 0
        tool_call_count = 0
        recent_failures: List[Dict[str, Any]] = []
        latest_degraded_event_at: Optional[str] = None

        for event in events:
            event_type = event.get("event_type") or "unknown"
            outcome = event.get("outcome") or "unknown"
            action = event.get("action")
            metadata = event.get("metadata") or {}
            created_at = str(event.get("created_at") or "")
            day_key = created_at[:10] if len(created_at) >= 10 else "unknown"

            by_type[event_type] = by_type.get(event_type, 0) + 1
            by_outcome[outcome] = by_outcome.get(outcome, 0) + 1
            events_by_day[day_key] = events_by_day.get(day_key, 0) + 1
            if action:
                action_counts[action] = action_counts.get(action, 0) + 1
            if metadata.get("degraded_mode") is True:
                degraded_count += 1
                if not latest_degraded_event_at:
                    latest_degraded_event_at = event.get("created_at")
            tool_calls = metadata.get("tool_calls") or []
            if isinstance(tool_calls, list):
                tool_call_count += len(tool_calls)
                for tool_call in tool_calls:
                    if not isinstance(tool_call, dict):
                        continue
                    tool_name = tool_call.get("tool") or tool_call.get("name") or tool_call.get("display_name")
                    if tool_name:
                        tool_counts[str(tool_name)] = tool_counts.get(str(tool_name), 0) + 1
            latency_ms = metadata.get("latency_ms")
            if isinstance(latency_ms, (int, float)) and math.isfinite(latency_ms) and latency_ms >= 0:
                latency_values.append(float(latency_ms))
            usage = metadata.get("usage") or {}
            if isinstance(usage, dict):
                calls = self._safe_int(usage.get("calls"))
                input_tokens = self._safe_int(usage.get("input_tokens"))
                output_tokens = self._safe_int(usage.get("output_tokens"))
                total_tokens = self._safe_int(usage.get("total_tokens"))
                token_usage["llm_calls"] += calls
                token_usage["input_tokens"] += input_tokens
                token_usage["output_tokens"] += output_tokens
                token_usage["total_tokens"] += total_tokens
                model = str(usage.get("model") or metadata.get("runtime_model") or "unknown")
                model_usage = usage_by_model.get(model) or {
                    "llm_calls": 0,
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "total_tokens": 0,
                }
                model_usage["llm_calls"] += calls
                model_usage["input_tokens"] += input_tokens
                model_usage["output_tokens"] += output_tokens
                model_usage["total_tokens"] += total_tokens
                usage_by_model[model] = model_usage
            cost = metadata.get("cost") or {}
            if isinstance(cost, dict):
                if cost.get("pricing_configured") is True:
                    cost_pricing_configured = True
                cost_value = cost.get("estimated_usd")
                if isinstance(cost_value, (int, float)) and math.isfinite(cost_value):
                    estimated_cost_usd += float(cost_value)
            provider_errors = metadata.get("provider_errors") or []
            if isinstance(provider_errors, list):
                provider_error_count += len(provider_errors)
                for provider_error in provider_errors:
                    if not isinstance(provider_error, dict):
                        continue
                    provider = str(provider_error.get("provider") or metadata.get("runtime_provider") or "unknown")
                    provider_error_counts[provider] = provider_error_counts.get(provider, 0) + 1
            if outcome == "failed" and len(recent_failures) < 10:
                recent_failures.append({
                    "id": event.get("id"),
                    "event_type": event_type,
                    "action": action,
                    "created_at": event.get("created_at"),
                    "error": metadata.get("error"),
                })

        action_executions = by_type.get("action_executed", 0)
        action_failures = len([
            event for event in events
            if event.get("event_type") == "action_executed" and event.get("outcome") == "failed"
        ])
        action_success_rate = None
        if action_executions:
            action_success_rate = round(((action_executions - action_failures) / action_executions) * 100, 1)

        total_events = len(events)
        failed_events = by_outcome.get("failed", 0)
        failure_rate = round((failed_events / total_events) * 100, 1) if total_events else 0
        fallback_rate = round((degraded_count / total_events) * 100, 1) if total_events else 0
        sorted_latency = sorted(latency_values)
        latency_count = len(sorted_latency)
        latency_p95 = None
        if latency_count:
            p95_index = min(latency_count - 1, math.ceil(latency_count * 0.95) - 1)
            latency_p95 = round(sorted_latency[p95_index], 1)
        latency = {
            "count": latency_count,
            "average_ms": round(sum(sorted_latency) / latency_count, 1) if latency_count else None,
            "p95_ms": latency_p95,
            "max_ms": round(max(sorted_latency), 1) if latency_count else None,
        }

        health_reasons: List[str] = []
        if failure_rate >= failure_rate_threshold:
            health_reasons.append(f"Failed AI event rate is above {failure_rate_threshold}%")
        if fallback_rate >= fallback_rate_threshold:
            health_reasons.append(f"Degraded response rate is above {fallback_rate_threshold}%")
        if latency_p95 is not None and latency_p95 >= latency_p95_threshold_ms:
            health_reasons.append(f"P95 latency is above {latency_p95_threshold_ms}ms")
        if provider_error_count >= provider_error_threshold:
            health_reasons.append(f"Provider errors reached threshold of {provider_error_threshold}")
        if action_success_rate is not None and action_success_rate < 90:
            health_reasons.append("Safe action success rate below target")
        health_status = "warning" if health_reasons else "healthy"

        return {
            "window_event_limit": max(1, min(limit, 500)),
            "total_events": total_events,
            "by_type": by_type,
            "by_outcome": by_outcome,
            "action_counts": action_counts,
            "tool_counts": dict(sorted(tool_counts.items(), key=lambda item: item[1], reverse=True)),
            "events_by_day": dict(sorted(events_by_day.items())),
            "degraded_count": degraded_count,
            "tool_call_count": tool_call_count,
            "failure_rate": failure_rate,
            "fallback_rate": fallback_rate,
            "latency": latency,
            "token_usage": token_usage,
            "usage_by_model": usage_by_model,
            "cost": {
                "currency": "USD",
                "estimated_usd": round(estimated_cost_usd, 6) if cost_pricing_configured else None,
                "pricing_configured": cost_pricing_configured,
            },
            "provider_errors": {
                "total": provider_error_count,
                "by_provider": provider_error_counts,
            },
            "action_executions": action_executions,
            "action_failures": action_failures,
            "action_success_rate": action_success_rate,
            "recent_failures": recent_failures,
            "latest_degraded_event_at": latest_degraded_event_at,
            "health": {
                "status": health_status,
                "reasons": health_reasons,
                "thresholds": {
                    "failure_rate_percent": failure_rate_threshold,
                    "fallback_rate_percent": fallback_rate_threshold,
                    "latency_p95_ms": latency_p95_threshold_ms,
                    "provider_errors": provider_error_threshold,
                    "action_success_rate_percent": 90,
                },
            },
            "last_event_at": events[0].get("created_at") if events else None,
            "storage": "postgres" if self._postgres_ready else "jsonl_fallback",
        }

    @staticmethod
    def _safe_int(value: Any) -> int:
        try:
            return max(0, int(value or 0))
        except (TypeError, ValueError):
            return 0

    def _record_postgres(self, event: Dict[str, Any]) -> bool:
        try:
            with psycopg2.connect(self.database_url) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO ai_audit_events (
                            id, tenant_id, user_id, event_type, action, outcome,
                            conversation_id, request_id, prompt, metadata, created_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s)
                        """,
                        (
                            event["id"],
                            event["tenant_id"],
                            event["user_id"],
                            event["event_type"],
                            event.get("action"),
                            event["outcome"],
                            event.get("conversation_id"),
                            event.get("request_id"),
                            event.get("prompt"),
                            json.dumps(event.get("metadata") or {}),
                            event["created_at"],
                        ),
                    )
                conn.commit()
            return True
        except Exception as exc:
            logger.warning("Falling back to JSONL for AI audit event: %s", exc)
            self._postgres_ready = False
            return False

    def _list_jsonl_any(self, limit: int) -> List[Dict[str, Any]]:
        if not self.fallback_path.exists():
            return []
        events: List[Dict[str, Any]] = []
        with self.fallback_path.open("r", encoding="utf-8") as handle:
            for line in handle:
                try:
                    events.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
        events.sort(key=lambda event: event.get("created_at", ""), reverse=True)
        return events[:limit]

    def _list_postgres(
        self,
        user_id: str,
        tenant_id: str,
        limit: int,
        event_type: Optional[str],
    ) -> List[Dict[str, Any]]:
        conditions = ["user_id = %s", "tenant_id = %s"]
        params: List[Any] = [user_id, tenant_id]
        if event_type:
            conditions.append("event_type = %s")
            params.append(event_type)
        params.append(limit)

        with psycopg2.connect(self.database_url, cursor_factory=RealDictCursor) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT id::text, tenant_id, user_id, event_type, action, outcome,
                           conversation_id, request_id, prompt, metadata,
                           created_at::text
                    FROM ai_audit_events
                    WHERE {' AND '.join(conditions)}
                    ORDER BY created_at DESC
                    LIMIT %s
                    """,
                    params,
                )
                return [dict(row) for row in cur.fetchall()]

    def _record_jsonl(self, event: Dict[str, Any]) -> None:
        with self._lock:
            with self.fallback_path.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(event, sort_keys=True) + "\n")

    def _list_jsonl(
        self,
        user_id: str,
        tenant_id: str,
        limit: int,
        event_type: Optional[str],
    ) -> List[Dict[str, Any]]:
        if not self.fallback_path.exists():
            return []

        matches: List[Dict[str, Any]] = []
        with self._lock:
            lines = self.fallback_path.read_text(encoding="utf-8").splitlines()
        for line in reversed(lines):
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue
            if event.get("user_id") != user_id or event.get("tenant_id") != tenant_id:
                continue
            if event_type and event.get("event_type") != event_type:
                continue
            matches.append(event)
            if len(matches) >= limit:
                break
        return matches

    @staticmethod
    def _normalize_event(event: Dict[str, Any]) -> Dict[str, Any]:
        created_at = event.get("created_at")
        if hasattr(created_at, "isoformat"):
            event["created_at"] = created_at.isoformat()
        return event

    @staticmethod
    def _trim_prompt(prompt: Optional[str]) -> Optional[str]:
        if not prompt:
            return None
        prompt = prompt.strip()
        return prompt[:2000]
