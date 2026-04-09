from __future__ import annotations

import json
import threading
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


class ReportDefinitionStore:
    def __init__(self, path: str):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        if not self.path.exists():
            self._write({"definitions": {}})

    def list(self, scope_key: str) -> List[Dict[str, Any]]:
        data = self._read()
        return list(data.get("definitions", {}).get(scope_key, []))

    def get(self, scope_key: str, definition_id: str) -> Optional[Dict[str, Any]]:
        return next((item for item in self.list(scope_key) if item["id"] == definition_id), None)

    def save(self, scope_key: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            data = self._read()
            definitions = data.setdefault("definitions", {}).setdefault(scope_key, [])
            now = datetime.utcnow().isoformat()
            definition = {
                "id": str(uuid.uuid4()),
                "name": payload["name"],
                "report_type": payload["report_type"],
                "report_mode": payload.get("report_mode") or "SUMMARY",
                "custom_query": payload.get("custom_query"),
                "date_range": payload.get("date_range"),
                "filters": payload.get("filters") or {},
                "delivery_refresh_token": payload.get("delivery_refresh_token"),
                "schedule": self._normalize_schedule(payload.get("schedule"), now, None),
                "created_at": now,
                "updated_at": now,
            }
            definitions.append(definition)
            self._write(data)
            return definition

    def delete(self, scope_key: str, definition_id: str) -> bool:
        with self._lock:
            data = self._read()
            definitions = data.setdefault("definitions", {}).get(scope_key, [])
            remaining = [item for item in definitions if item["id"] != definition_id]
            data["definitions"][scope_key] = remaining
            self._write(data)
            return len(remaining) != len(definitions)

    def update_schedule_run(
        self,
        scope_key: str,
        definition_id: str,
        *,
        success: bool,
        message: Optional[str],
    ) -> Optional[Dict[str, Any]]:
        with self._lock:
            data = self._read()
            definitions = data.setdefault("definitions", {}).get(scope_key, [])
            now = datetime.utcnow().isoformat()
            for item in definitions:
                if item["id"] != definition_id:
                    continue
                schedule = item.get("schedule") or {}
                schedule["last_run_at"] = now
                schedule["last_delivery_status"] = "SUCCESS" if success else "FAILED"
                schedule["last_delivery_error"] = None if success else message
                schedule["next_run_at"] = self._compute_next_run(schedule, datetime.utcnow())
                item["schedule"] = schedule
                item["updated_at"] = now
                self._write(data)
                return item
            return None

    def scheduled_due_definitions(self, now: Optional[datetime] = None) -> List[Tuple[str, Dict[str, Any]]]:
        current = now or datetime.utcnow()
        due: List[Tuple[str, Dict[str, Any]]] = []
        data = self._read()
        for scope_key, definitions in data.get("definitions", {}).items():
            for definition in definitions:
                schedule = definition.get("schedule") or {}
                if not schedule.get("enabled"):
                    continue
                next_run_at = schedule.get("next_run_at")
                delivery_email = (schedule.get("delivery_email") or "").strip()
                if not next_run_at or not delivery_email:
                    continue
                try:
                    next_run = datetime.fromisoformat(next_run_at)
                except ValueError:
                    continue
                if next_run <= current:
                    due.append((scope_key, definition))
        return due

    def _normalize_schedule(
        self,
        schedule: Optional[Dict[str, Any]],
        now_iso: str,
        existing: Optional[Dict[str, Any]],
    ) -> Optional[Dict[str, Any]]:
        if not schedule:
            return None

        enabled = bool(schedule.get("enabled"))
        normalized = {
            "enabled": enabled,
            "cadence": (schedule.get("cadence") or "DAILY").upper(),
            "hour": int(schedule.get("hour", 8)),
            "minute": int(schedule.get("minute", 0)),
            "weekday": (schedule.get("weekday") or "MONDAY").upper(),
            "delivery_email": (schedule.get("delivery_email") or "").strip(),
            "last_run_at": existing.get("last_run_at") if existing else None,
            "last_delivery_status": existing.get("last_delivery_status") if existing else None,
            "last_delivery_error": existing.get("last_delivery_error") if existing else None,
        }
        normalized["next_run_at"] = self._compute_next_run(normalized, datetime.fromisoformat(now_iso)) if enabled else None
        return normalized

    def _compute_next_run(self, schedule: Dict[str, Any], from_time: datetime) -> str:
        cadence = (schedule.get("cadence") or "DAILY").upper()
        hour = max(0, min(23, int(schedule.get("hour", 8))))
        minute = max(0, min(59, int(schedule.get("minute", 0))))
        candidate = from_time.replace(hour=hour, minute=minute, second=0, microsecond=0)

        if cadence == "WEEKLY":
            weekdays = {
                "MONDAY": 0,
                "TUESDAY": 1,
                "WEDNESDAY": 2,
                "THURSDAY": 3,
                "FRIDAY": 4,
                "SATURDAY": 5,
                "SUNDAY": 6,
            }
            target = weekdays.get((schedule.get("weekday") or "MONDAY").upper(), 0)
            days_ahead = (target - candidate.weekday()) % 7
            candidate = candidate + timedelta(days=days_ahead)
            if candidate <= from_time:
                candidate += timedelta(days=7)
        else:
            if candidate <= from_time:
                candidate += timedelta(days=1)

        return candidate.isoformat()

    def _read(self) -> Dict[str, Any]:
        with self._lock:
            if not self.path.exists():
                return {"definitions": {}}
            return json.loads(self.path.read_text(encoding="utf-8"))

    def _write(self, payload: Dict[str, Any]) -> None:
        with self._lock:
            self.path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
