from __future__ import annotations

import json
import threading
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


class AIApprovalStore:
    """Small durable approval queue for higher-risk AI action workflows."""

    def __init__(self, path: str):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()

    def create(
        self,
        *,
        tenant_id: Optional[str],
        requested_by: str,
        proposal: Dict[str, Any],
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        now = datetime.utcnow().isoformat()
        approval = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id or "",
            "requested_by": requested_by,
            "reviewed_by": None,
            "status": "pending",
            "reason": reason,
            "proposal": proposal,
            "created_at": now,
            "updated_at": now,
            "review_note": None,
        }
        approvals = self._read_all()
        approvals.insert(0, approval)
        self._write_all(approvals)
        return approval

    def list(
        self,
        *,
        tenant_id: Optional[str],
        status: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        tenant = tenant_id or ""
        approvals = [
            approval for approval in self._read_all()
            if approval.get("tenant_id") == tenant and (not status or approval.get("status") == status)
        ]
        return approvals[: max(1, min(limit, 500))]

    def review(
        self,
        *,
        approval_id: str,
        tenant_id: Optional[str],
        reviewed_by: str,
        status: str,
        note: Optional[str] = None,
    ) -> Dict[str, Any]:
        if status not in {"approved", "rejected"}:
            raise ValueError("Approval status must be approved or rejected")
        tenant = tenant_id or ""
        approvals = self._read_all()
        for approval in approvals:
            if approval.get("id") == approval_id and approval.get("tenant_id") == tenant:
                approval["status"] = status
                approval["reviewed_by"] = reviewed_by
                approval["review_note"] = note
                approval["updated_at"] = datetime.utcnow().isoformat()
                self._write_all(approvals)
                return approval
        raise KeyError("Approval request not found")

    def _read_all(self) -> List[Dict[str, Any]]:
        with self._lock:
            if not self.path.exists():
                return []
            try:
                data = json.loads(self.path.read_text(encoding="utf-8"))
                return data if isinstance(data, list) else []
            except Exception:
                return []

    def _write_all(self, approvals: List[Dict[str, Any]]) -> None:
        with self._lock:
            self.path.write_text(json.dumps(approvals, indent=2), encoding="utf-8")
