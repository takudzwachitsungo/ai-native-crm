from __future__ import annotations

import json
import threading
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


class ForecastSubmissionStore:
    def __init__(self, path: str):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        if not self.path.exists():
            self._write({"submissions": {}})

    def list(self, scope_key: str) -> List[Dict[str, Any]]:
        data = self._read()
        submissions = data.get("submissions", {}).get(scope_key, [])
        return sorted(submissions, key=lambda item: item.get("submitted_at", ""), reverse=True)

    def get(self, scope_key: str, submission_id: str) -> Optional[Dict[str, Any]]:
        return next((item for item in self.list(scope_key) if item["id"] == submission_id), None)

    def save(self, scope_key: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            data = self._read()
            submissions = data.setdefault("submissions", {}).setdefault(scope_key, [])
            now = datetime.utcnow().isoformat()
            submission = {
                "id": str(uuid.uuid4()),
                "title": payload["title"],
                "forecast_category": payload["forecast_category"],
                "manager_adjustment_percent": payload.get("manager_adjustment_percent", 0.0),
                "snapshot_label": payload.get("snapshot_label"),
                "notes": payload.get("notes"),
                "status": "SUBMITTED",
                "submitted_at": now,
                "submitted_by_user_id": payload["submitted_by_user_id"],
                "reviewed_at": None,
                "reviewed_by_user_id": None,
                "review_notes": None,
                "forecast_snapshot": payload["forecast_snapshot"],
            }
            submissions.append(submission)
            self._write(data)
            return submission

    def review(
        self,
        scope_key: str,
        submission_id: str,
        *,
        reviewer_user_id: str,
        status: str,
        review_notes: Optional[str],
    ) -> Optional[Dict[str, Any]]:
        with self._lock:
            data = self._read()
            submissions = data.setdefault("submissions", {}).get(scope_key, [])
            for item in submissions:
                if item["id"] != submission_id:
                    continue
                item["status"] = status
                item["reviewed_at"] = datetime.utcnow().isoformat()
                item["reviewed_by_user_id"] = reviewer_user_id
                item["review_notes"] = review_notes
                self._write(data)
                return item
            return None

    def _read(self) -> Dict[str, Any]:
        with self._lock:
            if not self.path.exists():
                return {"submissions": {}}
            return json.loads(self.path.read_text(encoding="utf-8"))

    def _write(self, payload: Dict[str, Any]) -> None:
        with self._lock:
            self.path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
