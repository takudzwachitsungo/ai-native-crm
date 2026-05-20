from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.services.crm_client import CRMClient


class AIActionService:
    """Safe confirmed-action layer for CRM copilot writeback."""

    def __init__(self, crm_client: CRMClient):
        self.crm_client = crm_client

    def capabilities(self) -> Dict[str, Any]:
        executable_actions = [
            {
                "type": "create_task",
                "label": "Create follow-up task",
                "risk_level": "low",
                "executes": True,
                "description": "Creates a CRM task after explicit user confirmation.",
            },
            {
                "type": "create_followup_sequence",
                "label": "Create follow-up sequence",
                "risk_level": "medium",
                "executes": True,
                "description": "Creates a short sequence of CRM tasks after explicit user confirmation.",
            },
            {
                "type": "draft_email",
                "label": "Draft email",
                "risk_level": "medium",
                "executes": True,
                "description": "Creates a draft CRM email only; it does not send externally.",
            },
            {
                "type": "draft_proposal_email",
                "label": "Draft proposal email",
                "risk_level": "medium",
                "executes": True,
                "description": "Creates a proposal-style CRM email draft only; it does not send externally.",
            },
            {
                "type": "update_deal_stage",
                "label": "Update deal stage",
                "risk_level": "medium",
                "executes": True,
                "description": "Moves a deal to a selected pipeline stage after explicit confirmation.",
            },
            {
                "type": "create_case_followup_task",
                "label": "Create case follow-up task",
                "risk_level": "low",
                "executes": True,
                "description": "Creates a support-case follow-up task after explicit user confirmation.",
            },
            {
                "type": "draft_case_response_email",
                "label": "Draft case response email",
                "risk_level": "medium",
                "executes": True,
                "description": "Creates a support response email draft only; it does not send externally.",
            },
            {
                "type": "create_campaign_followup_sequence",
                "label": "Create campaign follow-up sequence",
                "risk_level": "medium",
                "executes": True,
                "description": "Creates a short campaign follow-up task sequence after explicit confirmation.",
            },
            {
                "type": "draft_contract_renewal_email",
                "label": "Draft contract renewal email",
                "risk_level": "medium",
                "executes": True,
                "description": "Creates a contract renewal email draft only; it does not send externally.",
            },
            {
                "type": "create_work_order_followup_task",
                "label": "Create work-order follow-up task",
                "risk_level": "low",
                "executes": True,
                "description": "Creates a field-service work-order follow-up task after explicit confirmation.",
            },
            {
                "type": "create_revenue_ops_review_task",
                "label": "Create revenue-ops review task",
                "risk_level": "low",
                "executes": True,
                "description": "Creates a revenue-ops review task after explicit confirmation.",
            },
            {
                "type": "bulk_update_records",
                "label": "Bulk update records",
                "risk_level": "high",
                "executes": False,
                "description": "Requires admin approval workflow before any future bulk writeback is enabled.",
            },
        ]
        return {
            "mode": "confirmed_actions",
            "requires_confirmation": True,
            "approval_policy": {
                "low": "User confirmation is required before execution.",
                "medium": "User confirmation is required and every execution is audit logged.",
                "high": "Not executable until an admin approval workflow is enabled.",
                "destructive": "Blocked by policy.",
            },
            "supported_actions": executable_actions + [
                    {
                        "type": "recommend_update",
                        "label": "Recommend CRM update",
                        "risk_level": "medium",
                        "executes": False,
                        "description": "Returns a structured recommendation for review when direct writeback is not yet enabled.",
                    },
                ],
            "guardrails": [
                "No destructive actions",
                "No external sends without a separate user action",
                "Deal stage changes require an explicit target stage",
                "Follow-up sequences are capped to five tasks",
                "Domain actions create only tasks or drafts unless explicitly expanded later",
                "All proposals and executions are audit logged",
                "Java backend permissions still enforce record access",
            ],
        }

    def propose(
        self,
        *,
        intent: str,
        action_type: Optional[str],
        entity_type: Optional[str],
        entity_id: Optional[str],
        payload: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        requested_type = action_type or self._infer_action_type(intent)
        normalized_payload = self._build_payload(
            requested_type,
            intent=intent,
            entity_type=entity_type,
            entity_id=entity_id,
            payload=payload or {},
        )

        return {
            "proposal_id": str(uuid.uuid4()),
            "action_type": requested_type,
            "requires_confirmation": True,
            "risk_level": self._risk_level(requested_type),
            "approval_status": self._approval_status(requested_type),
            "can_execute": requested_type in {
                "create_task",
                "create_followup_sequence",
                "draft_email",
                "draft_proposal_email",
                "update_deal_stage",
                "create_case_followup_task",
                "draft_case_response_email",
                "create_campaign_followup_sequence",
                "draft_contract_renewal_email",
                "create_work_order_followup_task",
                "create_revenue_ops_review_task",
            },
            "preview": self._preview(requested_type, normalized_payload),
            "payload": normalized_payload,
            "created_at": datetime.utcnow().isoformat(),
        }

    async def execute(
        self,
        *,
        action_type: str,
        payload: Dict[str, Any],
        confirmed: bool,
    ) -> Dict[str, Any]:
        if not confirmed:
            raise ValueError("AI actions require explicit confirmation")

        if action_type in {
            "create_task",
            "create_case_followup_task",
            "create_work_order_followup_task",
            "create_revenue_ops_review_task",
        }:
            result = await self.crm_client._request("POST", "/api/v1/tasks", json=self._task_payload(payload))
            return {"success": True, "action_type": action_type, "result": result}

        if action_type in {
            "draft_email",
            "draft_proposal_email",
            "draft_case_response_email",
            "draft_contract_renewal_email",
        }:
            result = await self.crm_client._request("POST", "/api/v1/emails", json=self._email_payload(payload))
            return {"success": True, "action_type": action_type, "result": result}

        if action_type == "update_deal_stage":
            deal_id = payload.get("dealId") or payload.get("deal_id") or payload.get("entityId") or payload.get("relatedEntityId")
            stage = payload.get("stage")
            if not deal_id:
                raise ValueError("update_deal_stage requires dealId")
            if not stage:
                raise ValueError("update_deal_stage requires stage")
            result = await self.crm_client._request(
                "PATCH",
                f"/api/v1/deals/{deal_id}/stage",
                params={"stage": self._normalize_stage(stage)},
            )
            return {"success": True, "action_type": action_type, "result": result}

        if action_type in {"create_followup_sequence", "create_campaign_followup_sequence"}:
            tasks = []
            for task_payload in self._sequence_task_payloads(payload):
                tasks.append(await self.crm_client._request("POST", "/api/v1/tasks", json=task_payload))
            return {
                "success": True,
                "action_type": action_type,
                "result": {
                    "createdCount": len(tasks),
                    "tasks": tasks,
                },
            }

        raise ValueError(f"Action type '{action_type}' is not executable yet")

    def _infer_action_type(self, intent: str) -> str:
        intent_lower = intent.lower()
        if "stage" in intent_lower and "deal" in intent_lower:
            return "update_deal_stage"
        if ("case" in intent_lower or "ticket" in intent_lower or "support" in intent_lower) and ("email" in intent_lower or "reply" in intent_lower or "response" in intent_lower):
            return "draft_case_response_email"
        if ("contract" in intent_lower or "renewal" in intent_lower) and ("email" in intent_lower or "draft" in intent_lower):
            return "draft_contract_renewal_email"
        if "campaign" in intent_lower and ("sequence" in intent_lower or "cadence" in intent_lower):
            return "create_campaign_followup_sequence"
        if "case" in intent_lower or "ticket" in intent_lower or "support" in intent_lower:
            return "create_case_followup_task"
        if "work order" in intent_lower or "field service" in intent_lower:
            return "create_work_order_followup_task"
        if "revenue ops" in intent_lower or "quota" in intent_lower or "territory" in intent_lower:
            return "create_revenue_ops_review_task"
        if "sequence" in intent_lower or "cadence" in intent_lower or "multi-step" in intent_lower:
            return "create_followup_sequence"
        if "proposal" in intent_lower and ("email" in intent_lower or "draft" in intent_lower):
            return "draft_proposal_email"
        if "email" in intent_lower or "reply" in intent_lower or "outreach" in intent_lower:
            return "draft_email"
        if "task" in intent_lower or "follow up" in intent_lower or "remind" in intent_lower:
            return "create_task"
        return "recommend_update"

    def _approval_status(self, action_type: str) -> str:
        risk_level = self._risk_level(action_type)
        if risk_level == "low":
            return "user_confirmation_required"
        if risk_level == "medium":
            return "user_confirmation_and_audit_required"
        return "admin_approval_required"

    def _build_payload(
        self,
        action_type: str,
        *,
        intent: str,
        entity_type: Optional[str],
        entity_id: Optional[str],
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        base = dict(payload)
        if action_type in {
            "create_task",
            "create_case_followup_task",
            "create_work_order_followup_task",
            "create_revenue_ops_review_task",
        }:
            related_type = {
                "create_case_followup_task": "case",
                "create_work_order_followup_task": "work_order",
                "create_revenue_ops_review_task": "revenue_ops",
            }.get(action_type, entity_type)
            due_date = base.get("dueDate") or (datetime.utcnow() + timedelta(days=1)).replace(microsecond=0).isoformat()
            return {
                "title": base.get("title") or self._title_from_intent(intent),
                "description": base.get("description") or f"AI-suggested follow-up from request: {intent}",
                "dueDate": due_date,
                "priority": (base.get("priority") or "MEDIUM").upper(),
                "status": (base.get("status") or "PENDING").upper(),
                "relatedEntityType": base.get("relatedEntityType") or related_type,
                "relatedEntityId": base.get("relatedEntityId") or entity_id,
                "assignedToId": base.get("assignedToId"),
            }

        if action_type in {"create_followup_sequence", "create_campaign_followup_sequence"}:
            steps = base.get("steps")
            if not isinstance(steps, list) or not steps:
                steps = [
                    {"title": self._title_from_intent(intent), "daysFromNow": 1, "priority": "MEDIUM"},
                    {"title": "Second follow-up", "daysFromNow": 3, "priority": "MEDIUM"},
                    {"title": "Final follow-up before escalation", "daysFromNow": 7, "priority": "HIGH"},
                ]
            return {
                "description": base.get("description") or f"AI-suggested follow-up sequence from request: {intent}",
                "steps": steps[:5],
                "relatedEntityType": base.get("relatedEntityType") or ("campaign" if action_type == "create_campaign_followup_sequence" else entity_type),
                "relatedEntityId": base.get("relatedEntityId") or entity_id,
                "assignedToId": base.get("assignedToId"),
            }

        if action_type == "draft_email":
            return {
                "subject": base.get("subject") or self._title_from_intent(intent),
                "body": base.get("body") or f"Hi,\n\nFollowing up on: {intent}\n\nBest,",
                "fromEmail": base.get("fromEmail") or "noreply@example.com",
                "toEmail": base.get("toEmail") or "",
                "ccEmail": base.get("ccEmail"),
                "bccEmail": base.get("bccEmail"),
                "folder": "DRAFT",
                "isDraft": True,
                "isSent": False,
                "isRead": True,
                "relatedEntityType": base.get("relatedEntityType") or entity_type,
                "relatedEntityId": base.get("relatedEntityId") or entity_id,
            }

        if action_type in {"draft_proposal_email", "draft_case_response_email", "draft_contract_renewal_email"}:
            body_builder = {
                "draft_proposal_email": self._proposal_body,
                "draft_case_response_email": self._case_response_body,
                "draft_contract_renewal_email": self._contract_renewal_body,
            }[action_type]
            subject_prefix = {
                "draft_proposal_email": "Proposal",
                "draft_case_response_email": "Support update",
                "draft_contract_renewal_email": "Contract renewal",
            }[action_type]
            return {
                "subject": (base.get("subject") or f"{subject_prefix}: {self._title_from_intent(intent)}")[:180],
                "body": base.get("body") or body_builder(intent, base),
                "fromEmail": base.get("fromEmail") or "noreply@example.com",
                "toEmail": base.get("toEmail") or "",
                "ccEmail": base.get("ccEmail"),
                "bccEmail": base.get("bccEmail"),
                "folder": "DRAFT",
                "isDraft": True,
                "isSent": False,
                "isRead": True,
                "relatedEntityType": base.get("relatedEntityType") or entity_type,
                "relatedEntityId": base.get("relatedEntityId") or entity_id,
            }

        if action_type == "update_deal_stage":
            return {
                "dealId": base.get("dealId") or base.get("deal_id") or base.get("entityId") or entity_id,
                "stage": self._normalize_stage(base.get("stage") or "PROPOSAL"),
                "reason": base.get("reason") or f"AI-suggested stage update from request: {intent}",
            }

        if action_type == "bulk_update_records":
            return {
                "intent": intent,
                "entityType": base.get("entityType") or entity_type,
                "recordIds": base.get("recordIds") or [],
                "changes": base.get("changes") or {},
                "reason": base.get("reason") or "Bulk updates require admin approval before execution.",
            }

        return {
            "intent": intent,
            "entityType": entity_type,
            "entityId": entity_id,
            "recommendation": base.get("recommendation") or "Review this request and choose a supported CRM action.",
        }

    def _task_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        return {key: value for key, value in payload.items() if value is not None}

    def _email_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not payload.get("toEmail"):
            raise ValueError("Draft email requires toEmail")
        if not payload.get("fromEmail"):
            raise ValueError("Draft email requires fromEmail")
        return {key: value for key, value in payload.items() if value is not None}

    def _sequence_task_payloads(self, payload: Dict[str, Any]) -> List[Dict[str, Any]]:
        steps = payload.get("steps") or []
        if not isinstance(steps, list) or not steps:
            raise ValueError("create_followup_sequence requires at least one step")

        task_payloads: List[Dict[str, Any]] = []
        for index, step in enumerate(steps[:5], start=1):
            if not isinstance(step, dict):
                continue
            days_from_now = int(step.get("daysFromNow") or step.get("days_from_now") or index)
            due_date = step.get("dueDate") or (
                datetime.utcnow() + timedelta(days=max(days_from_now, 0))
            ).replace(microsecond=0).isoformat()
            task_payloads.append(self._task_payload({
                "title": step.get("title") or f"Follow-up step {index}",
                "description": step.get("description") or payload.get("description"),
                "dueDate": due_date,
                "priority": (step.get("priority") or payload.get("priority") or "MEDIUM").upper(),
                "status": (step.get("status") or "PENDING").upper(),
                "relatedEntityType": step.get("relatedEntityType") or payload.get("relatedEntityType"),
                "relatedEntityId": step.get("relatedEntityId") or payload.get("relatedEntityId"),
                "assignedToId": step.get("assignedToId") or payload.get("assignedToId"),
            }))

        if not task_payloads:
            raise ValueError("create_followup_sequence did not contain valid task steps")
        return task_payloads

    def _normalize_stage(self, stage: Any) -> str:
        normalized = str(stage or "").strip().upper().replace(" ", "_").replace("-", "_")
        allowed = {
            "PROSPECTING",
            "QUALIFICATION",
            "PROPOSAL",
            "NEGOTIATION",
            "CLOSED_WON",
            "CLOSED_LOST",
        }
        if normalized not in allowed:
            raise ValueError(f"Unsupported deal stage '{stage}'")
        return normalized

    def _risk_level(self, action_type: str) -> str:
        if action_type in {
            "create_task",
            "create_case_followup_task",
            "create_work_order_followup_task",
            "create_revenue_ops_review_task",
        }:
            return "low"
        if action_type in {
            "draft_email",
            "draft_proposal_email",
            "draft_case_response_email",
            "draft_contract_renewal_email",
            "create_followup_sequence",
            "create_campaign_followup_sequence",
            "update_deal_stage",
        }:
            return "medium"
        if action_type in {"bulk_update_records"}:
            return "high"
        return "medium"

    def _preview(self, action_type: str, payload: Dict[str, Any]) -> str:
        if action_type in {
            "create_task",
            "create_case_followup_task",
            "create_work_order_followup_task",
            "create_revenue_ops_review_task",
        }:
            return f"Create task '{payload.get('title')}' due {payload.get('dueDate')}."
        if action_type in {"create_followup_sequence", "create_campaign_followup_sequence"}:
            steps = payload.get("steps") or []
            return f"Create {len(steps)} follow-up tasks for this CRM workflow."
        if action_type == "draft_email":
            recipient = payload.get("toEmail") or "a selected recipient"
            return f"Create draft email '{payload.get('subject')}' to {recipient}. It will not be sent."
        if action_type in {"draft_proposal_email", "draft_case_response_email", "draft_contract_renewal_email"}:
            recipient = payload.get("toEmail") or "a selected recipient"
            return f"Create email draft '{payload.get('subject')}' to {recipient}. It will not be sent."
        if action_type == "update_deal_stage":
            return f"Move deal {payload.get('dealId') or 'selected deal'} to {payload.get('stage')}."
        if action_type == "bulk_update_records":
            record_count = len(payload.get("recordIds") or [])
            return f"Request approval to bulk update {record_count} {payload.get('entityType') or 'CRM'} record(s)."
        return payload.get("recommendation") or "Review recommended CRM update."

    def _title_from_intent(self, intent: str) -> str:
        clean = " ".join(intent.strip().split())
        if not clean:
            return "AI suggested follow-up"
        return clean[:120]

    def _proposal_body(self, intent: str, payload: Dict[str, Any]) -> str:
        company = payload.get("companyName") or payload.get("company") or "your team"
        value = payload.get("value") or payload.get("amount")
        value_line = f"\n\nEstimated investment: {value}" if value else ""
        return (
            f"Hi,\n\nFollowing up with a proposal for {company}.\n\n"
            f"Summary:\n{intent}{value_line}\n\n"
            "Suggested next step: review the proposal details and schedule a decision call.\n\n"
            "Best,"
        )

    def _case_response_body(self, intent: str, payload: Dict[str, Any]) -> str:
        case_number = payload.get("caseNumber") or payload.get("case_number") or "your case"
        return (
            f"Hi,\n\nThanks for your patience while we review {case_number}.\n\n"
            f"Update:\n{intent}\n\n"
            "Next step: we will confirm the resolution path and timing before making any changes.\n\n"
            "Best,"
        )

    def _contract_renewal_body(self, intent: str, payload: Dict[str, Any]) -> str:
        contract_number = payload.get("contractNumber") or payload.get("contract_number") or "your contract"
        renewal_date = payload.get("renewalDate") or payload.get("renewal_date")
        renewal_line = f"\n\nRenewal date: {renewal_date}" if renewal_date else ""
        return (
            f"Hi,\n\nFollowing up on {contract_number}.\n\n"
            f"Renewal discussion:\n{intent}{renewal_line}\n\n"
            "Suggested next step: review renewal terms and confirm whether we should prepare updated paperwork.\n\n"
            "Best,"
        )
