from __future__ import annotations

import json
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


class InsightStateStore:
    """User-scoped lifecycle state for generated AI insights."""

    def __init__(self, path: str):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        if not self.path.exists():
            self._write({"states": {}})

    def apply_to_insights(
        self,
        scope_key: str,
        insights: List[Dict[str, Any]],
        *,
        include_inactive: bool = False,
    ) -> List[Dict[str, Any]]:
        states = self._read().get("states", {}).get(scope_key, {})
        now = datetime.utcnow()
        visible: List[Dict[str, Any]] = []

        for insight in insights:
            insight_id = insight.get("id")
            state = states.get(insight_id, {}) if insight_id else {}
            lifecycle = state.get("status") or "active"

            if lifecycle == "snoozed":
                snoozed_until = state.get("snoozed_until")
                if snoozed_until:
                    try:
                        if datetime.fromisoformat(snoozed_until) <= now:
                            lifecycle = "active"
                        elif not include_inactive:
                            continue
                    except ValueError:
                        lifecycle = "active"

            if lifecycle == "dismissed" and not include_inactive:
                continue

            enriched = dict(insight)
            enriched["lifecycle"] = {
                "status": lifecycle,
                "assigned_to": state.get("assigned_to"),
                "snoozed_until": state.get("snoozed_until"),
                "note": state.get("note"),
                "updated_at": state.get("updated_at"),
            }
            visible.append(enriched)

        return visible

    def upsert_insights(self, scope_key: str, insights: List[Dict[str, Any]]) -> None:
        """Persist the latest generated insight records for team inbox review."""
        now = datetime.utcnow().isoformat()
        with self._lock:
            data = self._read()
            inbox = data.setdefault("inbox", {}).setdefault(scope_key, {})
            for insight in insights:
                insight_id = insight.get("id")
                if not insight_id:
                    continue
                existing = inbox.get(insight_id, {})
                inbox[insight_id] = {
                    **existing,
                    **insight,
                    "first_seen_at": existing.get("first_seen_at") or now,
                    "last_seen_at": now,
                    "seen_count": int(existing.get("seen_count") or 0) + 1,
                }
            self._write(data)

    def list_inbox(
        self,
        scope_key: str,
        *,
        status: Optional[str] = None,
        assigned_to: Optional[str] = None,
        limit: int = 100,
    ) -> Dict[str, Any]:
        data = self._read()
        states = data.get("states", {}).get(scope_key, {})
        records = data.get("inbox", {}).get(scope_key, {})
        normalized_status = (status or "").strip().lower()
        normalized_assignee = (assigned_to or "").strip().lower()
        insights: List[Dict[str, Any]] = []
        summary = {
            "total": 0,
            "active": 0,
            "assigned": 0,
            "snoozed": 0,
            "dismissed": 0,
            "by_severity": {},
            "by_entity_type": {},
        }

        for insight_id, record in records.items():
            state = states.get(insight_id, {})
            lifecycle = state.get("status") or "active"
            enriched = dict(record)
            enriched["lifecycle"] = {
                "status": lifecycle,
                "assigned_to": state.get("assigned_to"),
                "snoozed_until": state.get("snoozed_until"),
                "note": state.get("note"),
                "updated_at": state.get("updated_at"),
            }

            summary["total"] += 1
            if lifecycle in {"active", "assigned", "snoozed", "dismissed"}:
                summary[lifecycle] += 1
            severity = str(enriched.get("severity") or "unknown")
            entity_type = str(enriched.get("entity_type") or "unknown")
            summary["by_severity"][severity] = summary["by_severity"].get(severity, 0) + 1
            summary["by_entity_type"][entity_type] = summary["by_entity_type"].get(entity_type, 0) + 1

            if normalized_status and lifecycle != normalized_status:
                continue
            if normalized_assignee and str(state.get("assigned_to") or "").strip().lower() != normalized_assignee:
                continue
            insights.append(enriched)

        insights.sort(key=lambda item: item.get("last_seen_at") or item.get("first_seen_at") or "", reverse=True)
        bounded_limit = max(1, min(limit, 500))
        return {
            "insights": insights[:bounded_limit],
            "count": min(len(insights), bounded_limit),
            "summary": summary,
        }

    def update(
        self,
        scope_key: str,
        insight_id: str,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        status = (payload.get("status") or "active").lower()
        if status not in {"active", "dismissed", "snoozed", "assigned"}:
            raise ValueError("Unsupported insight lifecycle status")

        now = datetime.utcnow().isoformat()
        state = {
            "status": status,
            "assigned_to": payload.get("assigned_to"),
            "snoozed_until": payload.get("snoozed_until"),
            "note": payload.get("note"),
            "updated_at": now,
        }

        with self._lock:
            data = self._read()
            scope = data.setdefault("states", {}).setdefault(scope_key, {})
            scope[insight_id] = state
            self._write(data)
        return {"id": insight_id, **state}

    def list(self, scope_key: str) -> Dict[str, Any]:
        return self._read().get("states", {}).get(scope_key, {})

    def _read(self) -> Dict[str, Any]:
        with self._lock:
            if not self.path.exists():
                return {"states": {}}
            return json.loads(self.path.read_text(encoding="utf-8"))

    def _write(self, payload: Dict[str, Any]) -> None:
        with self._lock:
            self.path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
