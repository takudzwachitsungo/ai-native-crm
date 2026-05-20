"""
Unified CRM insight engine.

The service emits normalized insight objects for UI pills, notifications, and
dashboard counters. It deliberately keeps the first pass deterministic so pills
are explainable and repeatable; LLM enrichment can be layered on top later.
"""
from datetime import date, datetime
from typing import Any, Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class InsightsService:
    """Generate normalized, tenant-scoped CRM insights from live backend data."""

    def __init__(self, crm_client, llm_client):
        self.crm_client = crm_client
        self.llm_client = llm_client

    async def generate_insights(self, user_token: str, context: str = "dashboard") -> List[Dict[str, Any]]:
        token_handle = self.crm_client.set_user_token(user_token)
        insights: List[Dict[str, Any]] = []

        try:
            insights.extend(await self._get_leads_insights())
            insights.extend(await self._get_deals_insights())
            insights.extend(await self._get_contacts_insights())
            insights.extend(await self._get_tasks_insights())
        except Exception as exc:
            logger.error("Error generating insights: %s", exc)
        finally:
            self.crm_client.reset_user_token(token_handle)

        return self._dedupe(self._filter_context(insights, context))

    @staticmethod
    def _field(record: Dict[str, Any], *names: str, default: Any = None) -> Any:
        for name in names:
            value = record.get(name)
            if value is not None:
                return value
        return default

    @staticmethod
    def _number(value: Any, default: float = 0) -> float:
        try:
            return float(value or default)
        except (TypeError, ValueError):
            return default

    @staticmethod
    def _parse_date(value: Any) -> Optional[date]:
        if not value:
            return None
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, date):
            return value

        raw = str(value)
        try:
            return datetime.fromisoformat(raw.replace("Z", "+00:00")).date()
        except ValueError:
            try:
                return date.fromisoformat(raw[:10])
            except ValueError:
                return None

    @staticmethod
    def _normalize_status(value: Any) -> str:
        return str(value or "").strip().upper()

    @staticmethod
    def _insight(
        insight_type: str,
        message: str,
        severity: str,
        entity_type: str,
        entity_id: Any,
        contexts: List[str],
        label: Optional[str] = None,
        reason: Optional[str] = None,
        recommended_action: Optional[str] = None,
        confidence: float = 0.88,
        source: str = "ai_service_rules",
    ) -> Dict[str, Any]:
        entity_id_str = str(entity_id)
        return {
            "id": f"{source}:{entity_type}:{entity_id_str}:{insight_type}",
            "type": insight_type,
            "label": label or insight_type.replace("_", " ").title(),
            "message": message,
            "severity": severity,
            "entity_type": entity_type,
            "entity_id": entity_id_str,
            "context": contexts,
            "source": source,
            "confidence": confidence,
            "reason": reason or message,
            "recommended_action": recommended_action,
            "generated_by": "ai-insight-engine",
        }

    @staticmethod
    def _matches_context(insight: Dict[str, Any], context: str) -> bool:
        if context in {"all", "dashboard"}:
            return True
        return context in insight.get("context", [])

    def _filter_context(self, insights: List[Dict[str, Any]], context: str) -> List[Dict[str, Any]]:
        return [insight for insight in insights if self._matches_context(insight, context)]

    @staticmethod
    def _dedupe(insights: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        seen = set()
        result = []
        for insight in insights:
            key = insight.get("id")
            if key in seen:
                continue
            seen.add(key)
            result.append(insight)
        severity_rank = {"error": 0, "warning": 1, "success": 2, "info": 3}
        return sorted(result, key=lambda item: (severity_rank.get(item.get("severity"), 4), item.get("entity_type", "")))

    async def _get_leads_insights(self) -> List[Dict[str, Any]]:
        insights: List[Dict[str, Any]] = []

        try:
            leads = await self.crm_client.search_leads(size=100)
            today = datetime.utcnow().date()

            for lead in leads:
                lead_id = self._field(lead, "id")
                if not lead_id:
                    continue

                score = self._number(self._field(lead, "score"))
                estimated_value = self._number(self._field(lead, "estimatedValue", "estimated_value"))
                status = self._normalize_status(self._field(lead, "status"))
                last_contact = self._parse_date(self._field(lead, "lastContactDate", "last_contact_date"))

                if score >= 80 or estimated_value >= 50000:
                    insights.append(self._insight(
                        "hot",
                        f"High-priority lead: score {int(score)}" if score else f"High-value lead: ${estimated_value:,.0f}",
                        "success",
                        "lead",
                        lead_id,
                        ["leads", "dashboard"],
                        label="Hot",
                        reason="Lead score or estimated value is above the priority threshold.",
                        recommended_action="Prioritize outreach and route to the owner for fast follow-up.",
                        confidence=0.9,
                    ))

                if status in {"NEW", "OPEN"} and last_contact is None:
                    insights.append(self._insight(
                        "inactive",
                        "New lead has not been contacted",
                        "warning",
                        "lead",
                        lead_id,
                        ["leads", "dashboard"],
                        label="Needs touch",
                        reason="Lead is new/open and has no last-contact date.",
                        recommended_action="Create a first-touch task or send an introductory email.",
                    ))
                elif last_contact and (today - last_contact).days >= 14 and status not in {"CONVERTED", "CLOSED"}:
                    days_inactive = (today - last_contact).days
                    insights.append(self._insight(
                        "inactive",
                        f"No lead contact for {days_inactive} days",
                        "warning" if days_inactive < 30 else "error",
                        "lead",
                        lead_id,
                        ["leads", "dashboard"],
                        label="Stale",
                        reason="Lead follow-up has aged beyond the configured freshness threshold.",
                        recommended_action="Re-engage or disqualify so the queue stays clean.",
                    ))
        except Exception as exc:
            logger.error("Error analyzing leads: %s", exc)

        return insights

    async def _get_deals_insights(self) -> List[Dict[str, Any]]:
        insights: List[Dict[str, Any]] = []

        try:
            deals = await self.crm_client.search_deals(size=100)
            today = datetime.utcnow().date()

            for deal in deals:
                deal_id = self._field(deal, "id")
                if not deal_id:
                    continue

                stage = self._normalize_status(self._field(deal, "stage"))
                is_open = stage not in {"CLOSED_WON", "CLOSED_LOST"}
                value = self._number(self._field(deal, "value", "amount"))
                probability = self._number(self._field(deal, "probability"))
                risk_level = self._normalize_status(self._field(deal, "riskLevel", "risk_level"))

                close_date = self._parse_date(self._field(deal, "expectedCloseDate", "expected_close_date", "closeDate"))
                if close_date and is_open:
                    days_until_close = (close_date - today).days
                    if 0 <= days_until_close <= 7:
                        insights.append(self._insight(
                            "closing_soon",
                            f"Closes in {days_until_close} days",
                            "warning" if days_until_close <= 3 else "info",
                            "deal",
                            deal_id,
                            ["deals", "dashboard", "pipeline"],
                            label=f"{days_until_close}d close",
                            reason="Expected close date is within the next 7 days.",
                            recommended_action="Confirm next step, decision owner, and close blockers.",
                            confidence=0.92,
                        ))

                updated = self._parse_date(self._field(deal, "stageChangedAt", "stage_updated_at", "updatedAt", "updated_at"))
                if updated and is_open:
                    days_stuck = (today - updated).days
                    if days_stuck >= 14:
                        insights.append(self._insight(
                            "stuck",
                            f"No stage movement for {days_stuck} days",
                            "error" if days_stuck >= 30 else "warning",
                            "deal",
                            deal_id,
                            ["deals", "dashboard", "pipeline"],
                            label="Stuck",
                            reason="Deal has not moved stages within the freshness threshold.",
                            recommended_action="Requalify the opportunity or schedule a recovery action.",
                        ))

                if value >= 50000 and probability >= 70 and is_open:
                    insights.append(self._insight(
                        "hot",
                        f"High-value, high-probability deal: ${value:,.0f}",
                        "success",
                        "deal",
                        deal_id,
                        ["deals", "dashboard", "pipeline"],
                        label="Hot",
                        reason="Deal value and probability are both above priority thresholds.",
                        recommended_action="Protect momentum and confirm mutual close plan.",
                        confidence=0.9,
                    ))

                if risk_level == "HIGH" and is_open:
                    insights.append(self._insight(
                        "at_risk",
                        "High-risk deal needs attention",
                        "error",
                        "deal",
                        deal_id,
                        ["deals", "dashboard", "pipeline"],
                        label="At risk",
                        reason="Deal risk level is marked HIGH.",
                        recommended_action="Review risk reason, next step, and executive sponsor coverage.",
                        confidence=0.9,
                    ))
        except Exception as exc:
            logger.error("Error analyzing deals: %s", exc)

        return insights

    async def _get_contacts_insights(self) -> List[Dict[str, Any]]:
        insights: List[Dict[str, Any]] = []

        try:
            contacts = await self.crm_client.search_contacts(size=100)
            today = datetime.utcnow().date()

            for contact in contacts:
                contact_id = self._field(contact, "id")
                if not contact_id:
                    continue

                status = self._normalize_status(self._field(contact, "status"))
                last_contact = self._parse_date(self._field(contact, "lastContactDate", "last_contact_date"))
                is_decision_maker = bool(self._field(contact, "isDecisionMaker", "is_decision_maker"))
                is_decision_maker = is_decision_maker or self._normalize_status(self._field(contact, "stakeholderRole")) == "DECISION_MAKER"

                if last_contact:
                    days_inactive = (today - last_contact).days
                    if days_inactive >= 30:
                        insights.append(self._insight(
                            "inactive",
                            f"No contact for {days_inactive} days",
                            "warning" if days_inactive < 60 else "error",
                            "contact",
                            contact_id,
                            ["contacts", "dashboard"],
                            label="Inactive",
                            reason="Last contact date is older than the engagement threshold.",
                            recommended_action="Schedule a relationship touch or confirm the contact is still active.",
                        ))
                    elif days_inactive <= 7:
                        insights.append(self._insight(
                            "hot",
                            f"Recently engaged {days_inactive}d ago",
                            "success",
                            "contact",
                            contact_id,
                            ["contacts", "dashboard"],
                            label="Engaged",
                            confidence=0.82,
                        ))
                elif status == "INACTIVE":
                    insights.append(self._insight(
                        "inactive",
                        "Contact is marked inactive",
                        "info",
                        "contact",
                        contact_id,
                        ["contacts", "dashboard"],
                        label="Inactive",
                    ))

                if is_decision_maker:
                    insights.append(self._insight(
                        "hot",
                        "Decision maker contact",
                        "success",
                        "contact",
                        contact_id,
                        ["contacts", "dashboard"],
                        label="Decision maker",
                        reason="Contact is identified as a decision maker.",
                        recommended_action="Keep this contact involved in late-stage deal communication.",
                    ))
        except Exception as exc:
            logger.error("Error analyzing contacts: %s", exc)

        return insights

    async def _get_tasks_insights(self) -> List[Dict[str, Any]]:
        insights: List[Dict[str, Any]] = []

        try:
            tasks = await self.crm_client.search_tasks(size=100)
            today = datetime.utcnow().date()

            for task in tasks:
                task_id = self._field(task, "id")
                if not task_id:
                    continue

                status = self._normalize_status(self._field(task, "status"))
                due_date = self._parse_date(self._field(task, "dueDate", "due_date"))

                if due_date and status != "COMPLETED":
                    days_until_due = (due_date - today).days
                    if days_until_due < 0:
                        days_overdue = abs(days_until_due)
                        insights.append(self._insight(
                            "overdue",
                            f"Overdue {days_overdue} days",
                            "error",
                            "task",
                            task_id,
                            ["tasks", "dashboard"],
                            label=f"{days_overdue}d",
                            reason="Task due date has passed and the task is not complete.",
                            recommended_action="Complete, reschedule, or reassign the task.",
                        ))
                    elif days_until_due <= 2:
                        insights.append(self._insight(
                            "closing_soon",
                            "Due today" if days_until_due == 0 else f"Due in {days_until_due}d",
                            "warning",
                            "task",
                            task_id,
                            ["tasks", "dashboard"],
                            label="Due today" if days_until_due == 0 else "Due soon",
                            reason="Task due date is within the next two days.",
                            recommended_action="Prioritize this task before it becomes overdue.",
                            confidence=0.86,
                        ))
        except Exception as exc:
            logger.error("Error analyzing tasks: %s", exc)

        return insights
