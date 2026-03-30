"""
Lead Scoring Agent - Autonomous AI for lead qualification and opportunity management

This agent:
1. Scores leads based on profile, company data, and engagement
2. Qualifies leads (hot, warm, cold) and suggests next actions
3. Drafts personalized outreach emails
4. Creates follow-up tasks
5. Updates lead status automatically
"""

import base64
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from langgraph.graph import END, StateGraph
from typing_extensions import TypedDict

from app.config import settings

logger = logging.getLogger(__name__)


class LeadScoringState(TypedDict, total=False):
    """State for lead scoring workflow"""

    lead_id: str
    lead_data: Dict[str, Any]
    company_data: Optional[Dict[str, Any]]
    similar_deals: List[Dict[str, Any]]
    score: int
    score_breakdown: Dict[str, Any]
    qualification: str  # HOT, WARM, COLD
    recommended_actions: List[str]
    draft_email: Optional[str]
    task_created: bool
    error: Optional[str]
    degraded_mode: bool
    degraded_reasons: List[str]


class LeadScoringAgent:
    """Autonomous agent for lead scoring and qualification"""

    def __init__(self, backend_url: str = "http://localhost:8080", api_token: Optional[str] = None):
        """
        Initialize Lead Scoring Agent

        Args:
            backend_url: CRM backend base URL
            api_token: JWT token for authenticated requests
        """
        self.backend_url = backend_url
        self.api_token = api_token

        self.llm = ChatGroq(
            groq_api_key=settings.GROQ_API_KEY,
            model_name=settings.CHAT_MODEL,
            temperature=0.3,
            max_tokens=2000,
        )

        self.workflow = self._build_workflow()

        logger.info("Lead Scoring Agent initialized")

    @staticmethod
    def _is_llm_unavailable_error(error: Exception) -> bool:
        message = str(error).lower()
        return any(
            marker in message
            for marker in ["access denied", "permissiondenied", "403", "network settings"]
        )

    def _build_headers(self, include_json: bool = False) -> Dict[str, str]:
        headers: Dict[str, str] = {}
        if include_json:
            headers["Content-Type"] = "application/json"
        if self.api_token:
            headers["Authorization"] = f"Bearer {self.api_token}"
        return headers

    async def _backend_request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        json_body: Optional[Dict[str, Any]] = None,
        timeout: float = 10.0,
    ) -> Any:
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method=method,
                url=f"{self.backend_url}{path}",
                headers=self._build_headers(include_json=json_body is not None),
                params=params,
                json=json_body,
                timeout=timeout,
            )
            response.raise_for_status()
            if not response.content:
                return None
            return response.json()

    @staticmethod
    def _extract_content(payload: Any) -> List[Dict[str, Any]]:
        if isinstance(payload, dict):
            content = payload.get("content")
            if isinstance(content, list):
                return content
        if isinstance(payload, list):
            return payload
        return []

    @staticmethod
    def _normalize_status(value: Optional[str]) -> Optional[str]:
        return value.upper() if isinstance(value, str) else value

    @staticmethod
    def _parse_llm_json(content: str) -> Dict[str, Any]:
        cleaned = content.strip()
        if cleaned.startswith("```"):
            lines = cleaned.splitlines()
            if lines and lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            cleaned = "\n".join(lines).strip()
            if cleaned.lower().startswith("json"):
                cleaned = cleaned[4:].strip()
        return json.loads(cleaned)

    def _extract_sender_email(self) -> Optional[str]:
        if not self.api_token:
            return None

        try:
            parts = self.api_token.split(".")
            if len(parts) != 3:
                return None
            payload_part = parts[1]
            padded = payload_part + "=" * (-len(payload_part) % 4)
            claims = json.loads(base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8"))
            subject = claims.get("sub")
            return subject if isinstance(subject, str) else None
        except Exception:
            logger.warning("Could not extract sender email from JWT token")
            return None

    def _build_lead_update_payload(
        self,
        lead_data: Dict[str, Any],
        score: int,
        qualification: Optional[str],
    ) -> Dict[str, Any]:
        current_status = self._normalize_status(lead_data.get("status")) or "NEW"
        if qualification == "HOT" and current_status not in {"CONVERTED", "LOST", "UNQUALIFIED"}:
            current_status = "QUALIFIED"

        return {
            "firstName": lead_data.get("firstName") or "",
            "lastName": lead_data.get("lastName") or "",
            "email": lead_data.get("email") or "",
            "phone": lead_data.get("phone"),
            "company": lead_data.get("company"),
            "title": lead_data.get("title"),
            "source": lead_data.get("source"),
            "status": current_status,
            "score": score,
            "estimatedValue": lead_data.get("estimatedValue"),
            "notes": lead_data.get("notes"),
            "tags": lead_data.get("tags") or [],
            "lastContactDate": lead_data.get("lastContactDate"),
            "ownerId": lead_data.get("ownerId"),
        }

    def _calculate_rule_based_score(
        self,
        lead_data: Dict[str, Any],
        company_data: Optional[Dict[str, Any]],
        similar_deals: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Calculate a deterministic score when the LLM is unavailable."""
        title = (lead_data.get("title") or "").lower()
        industry = ((company_data or {}).get("industry") or "").lower()
        estimated_value = float(lead_data.get("estimatedValue") or 0)
        similar_average = (
            sum(float(deal.get("value", 0) or 0) for deal in similar_deals) / len(similar_deals)
            if similar_deals
            else 0
        )

        profile_quality = 0
        if lead_data.get("email"):
            profile_quality += 10
        if lead_data.get("phone"):
            profile_quality += 5
        if lead_data.get("title"):
            profile_quality += 5
        if any(keyword in title for keyword in ["chief", "ceo", "cfo", "coo", "vp", "vice president", "director", "head", "founder"]):
            profile_quality += 10
        profile_quality = min(profile_quality, 30)

        company_profile = 0
        if lead_data.get("company"):
            company_profile += 5
        if company_data:
            company_profile += 10
            if industry:
                company_profile += 5
            if any(keyword in industry for keyword in ["finance", "financial", "investment", "bank", "insurance", "fintech"]):
                company_profile += 10
            if company_data.get("employeeCount") or company_data.get("revenue"):
                company_profile += 5
        company_profile = min(company_profile, 30)

        if estimated_value >= 100000:
            estimated_value_score = 25
        elif estimated_value >= 50000:
            estimated_value_score = 20
        elif estimated_value >= 10000:
            estimated_value_score = 14
        elif estimated_value > 0:
            estimated_value_score = 8
        else:
            estimated_value_score = 0

        if similar_average and estimated_value >= similar_average:
            estimated_value_score = min(25, estimated_value_score + 5)

        engagement = 0
        status = self._normalize_status(lead_data.get("status")) or "NEW"
        status_scores = {
            "NEW": 5,
            "CONTACTED": 8,
            "QUALIFIED": 12,
            "CONVERTED": 15,
            "UNQUALIFIED": 2,
            "LOST": 0,
        }
        engagement += status_scores.get(status, 5)

        created_at = lead_data.get("createdAt")
        if created_at:
            try:
                created = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                age_days = (datetime.now(created.tzinfo) - created).days
                if age_days <= 30:
                    engagement += 3
                elif age_days <= 90:
                    engagement += 1
            except Exception:
                pass
        engagement = min(engagement, 15)

        total_score = min(profile_quality + company_profile + estimated_value_score + engagement, 100)

        reasoning_parts = [
            "rule-based fallback used because the AI provider was unavailable",
            f"profile quality contributed {profile_quality}/30",
            f"company profile contributed {company_profile}/30",
            f"estimated value contributed {estimated_value_score}/25",
            f"engagement contributed {engagement}/15",
        ]

        return {
            "total_score": total_score,
            "breakdown": {
                "profile_quality": profile_quality,
                "company_profile": company_profile,
                "estimated_value": estimated_value_score,
                "engagement": engagement,
                "fallback": True,
            },
            "reasoning": "; ".join(reasoning_parts),
        }

    def _build_fallback_email(self, lead_data: Dict[str, Any], qualification: str) -> str:
        first_name = lead_data.get("firstName") or "there"
        title = lead_data.get("title") or "your team"
        company = lead_data.get("company") or "your organization"
        urgency_sentence = (
            "I would love to prioritize a short conversation this week to understand your current goals."
            if qualification == "HOT"
            else "If this is relevant, I would be happy to schedule a short introductory conversation."
        )

        return (
            f"<p>Hi {first_name},</p>"
            f"<p>I’m reaching out because leaders in roles like {title} at {company} are often looking for better visibility into pipeline, client relationships, and follow-up execution.</p>"
            f"<p>{urgency_sentence}</p>"
            f"<p>Would you be open to a quick chat to explore whether our approach could support your team?</p>"
        )

    def _build_workflow(self) -> StateGraph:
        """Build LangGraph workflow for lead scoring"""
        workflow = StateGraph(LeadScoringState)

        workflow.add_node("fetch_lead_data", self._fetch_lead_data)
        workflow.add_node("enrich_with_company", self._enrich_with_company)
        workflow.add_node("find_similar_deals", self._find_similar_deals)
        workflow.add_node("calculate_score", self._calculate_score)
        workflow.add_node("qualify_lead", self._qualify_lead)
        workflow.add_node("recommend_actions", self._recommend_actions)
        workflow.add_node("draft_email", self._draft_email)
        workflow.add_node("create_task", self._create_task)
        workflow.add_node("update_lead", self._update_lead)

        workflow.set_entry_point("fetch_lead_data")
        workflow.add_edge("fetch_lead_data", "enrich_with_company")
        workflow.add_edge("enrich_with_company", "find_similar_deals")
        workflow.add_edge("find_similar_deals", "calculate_score")
        workflow.add_edge("calculate_score", "qualify_lead")
        workflow.add_edge("qualify_lead", "recommend_actions")
        workflow.add_conditional_edges(
            "recommend_actions",
            self._should_draft_email,
            {
                "draft": "draft_email",
                "skip": "create_task",
            },
        )
        workflow.add_edge("draft_email", "create_task")
        workflow.add_edge("create_task", "update_lead")
        workflow.add_edge("update_lead", END)

        return workflow.compile()

    async def score_lead(self, lead_id: str) -> Dict[str, Any]:
        """
        Score and qualify a lead

        Args:
            lead_id: UUID of the lead to score

        Returns:
            Dict with scoring results
        """
        initial_state = LeadScoringState(
            lead_id=lead_id,
            task_created=False,
            degraded_mode=False,
            degraded_reasons=[],
        )

        try:
            result = await self.workflow.ainvoke(initial_state)
            return {
                "success": True,
                "lead_id": lead_id,
                "score": result.get("score"),
                "score_breakdown": result.get("score_breakdown"),
                "qualification": result.get("qualification"),
                "recommended_actions": result.get("recommended_actions"),
                "draft_email": result.get("draft_email"),
                "task_created": result.get("task_created"),
                "error": result.get("error"),
                "degraded_mode": result.get("degraded_mode", False),
                "degraded_reason": "; ".join(result.get("degraded_reasons", [])) if result.get("degraded_reasons") else None,
            }
        except Exception as e:
            logger.error(f"Error scoring lead {lead_id}: {str(e)}")
            return {
                "success": False,
                "lead_id": lead_id,
                "error": str(e),
            }

    async def _fetch_lead_data(self, state: LeadScoringState) -> LeadScoringState:
        """Fetch lead data from CRM"""
        lead_id = state["lead_id"]

        try:
            lead_data = await self._backend_request("GET", f"/api/v1/leads/{lead_id}")
            state["lead_data"] = lead_data
            logger.info(f"Fetched lead data for {lead_id}: {lead_data.get('email')}")
        except Exception as e:
            logger.error(f"Error fetching lead {lead_id}: {str(e)}")
            state["error"] = f"Failed to fetch lead data: {str(e)}"

        return state

    async def _enrich_with_company(self, state: LeadScoringState) -> LeadScoringState:
        """Enrich lead with company data if available"""
        lead_data = state.get("lead_data", {})
        company_name = lead_data.get("company")

        if not company_name:
            return state

        try:
            companies = await self._backend_request(
                "GET",
                "/api/v1/companies/search",
                params={"name": company_name},
            )
            if isinstance(companies, list) and companies:
                state["company_data"] = companies[0]
                logger.info(f"Found company data for: {company_name}")
        except Exception as e:
            logger.warning(f"Could not fetch company data: {str(e)}")

        return state

    async def _find_similar_deals(self, state: LeadScoringState) -> LeadScoringState:
        """Find similar successful deals for context"""
        try:
            deals_payload = await self._backend_request(
                "GET",
                "/api/v1/deals",
                params={"stage": "CLOSED_WON", "size": 5},
            )
            deals = self._extract_content(deals_payload)
            state["similar_deals"] = deals[:5]
            logger.info(f"Found {len(state['similar_deals'])} similar successful deals")
        except Exception as e:
            logger.warning(f"Could not fetch similar deals: {str(e)}")
            state["similar_deals"] = []

        return state

    async def _calculate_score(self, state: LeadScoringState) -> LeadScoringState:
        """Calculate lead score using AI"""
        lead_data = state.get("lead_data", {})
        company_data = state.get("company_data")
        similar_deals = state.get("similar_deals", [])

        system_prompt = """You are a lead scoring expert for a fintech CRM system.
Analyze the lead profile and provide a score from 0-100 based on:

1. PROFILE QUALITY (30 points):
   - Complete contact information (email, phone, title)
   - Senior title (VP, Director, C-level = higher score)
   - Finance/investment industry = higher score

2. COMPANY PROFILE (30 points):
   - Company size (revenue, employees)
   - Industry fit (financial services = higher score)
   - Active status

3. ESTIMATED VALUE (25 points):
   - Higher estimated value = higher score
   - Compare to similar successful deals

4. ENGAGEMENT INDICATORS (15 points):
   - Current lead status (NEW, CONTACTED, QUALIFIED)
   - Time since creation (newer = higher score)

Provide a JSON response with:
{
  "total_score": <0-100>,
  "breakdown": {
    "profile_quality": <0-30>,
    "company_profile": <0-30>,
    "estimated_value": <0-25>,
    "engagement": <0-15>
  },
  "reasoning": "<brief explanation>"
}"""

        user_prompt = f"""Lead Profile:
- Name: {lead_data.get('firstName', '')} {lead_data.get('lastName', '')}
- Email: {lead_data.get('email', 'N/A')}
- Title: {lead_data.get('title', 'N/A')}
- Company: {lead_data.get('company', 'N/A')}
- Phone: {lead_data.get('phone', 'N/A')}
- Status: {lead_data.get('status', 'NEW')}
- Estimated Value: ${lead_data.get('estimatedValue', 0):,}
- Current Score: {lead_data.get('score', 0)}

{f'''Company Data:
- Name: {company_data.get('name')}
- Industry: {company_data.get('industry')}
- Revenue: ${company_data.get('revenue', 0):,}
- Employees: {company_data.get('employeeCount', 'N/A')}
- Status: {company_data.get('status')}
''' if company_data else 'Company data not available'}

Similar Successful Deals: {len(similar_deals)} deals averaging ${sum(d.get('value', 0) for d in similar_deals) / len(similar_deals) if similar_deals else 0:,.0f}

Calculate the lead score and provide detailed reasoning."""

        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt),
            ]
            response = await self.llm.ainvoke(messages)
            result = self._parse_llm_json(response.content)

            state["score"] = result["total_score"]
            state["score_breakdown"] = result["breakdown"]

            logger.info(f"Calculated score for lead {state['lead_id']}: {result['total_score']}/100")
            logger.info(f"Reasoning: {result['reasoning']}")
        except Exception as e:
            logger.error(f"Error calculating score: {str(e)}")
            fallback = self._calculate_rule_based_score(lead_data, company_data, similar_deals)
            state["score"] = fallback["total_score"]
            state["score_breakdown"] = fallback["breakdown"]
            state["degraded_mode"] = True
            reasons = state.get("degraded_reasons", [])
            reasons.append("AI lead scoring unavailable; using rule-based score calculation.")
            state["degraded_reasons"] = reasons
            logger.info(f"Fallback score for lead {state['lead_id']}: {fallback['total_score']}/100")

        return state

    async def _qualify_lead(self, state: LeadScoringState) -> LeadScoringState:
        """Qualify lead as HOT, WARM, or COLD"""
        score = state.get("score", 0)

        if score >= 75:
            qualification = "HOT"
        elif score >= 50:
            qualification = "WARM"
        else:
            qualification = "COLD"

        state["qualification"] = qualification
        logger.info(f"Lead qualified as: {qualification} (score: {score})")

        return state

    async def _recommend_actions(self, state: LeadScoringState) -> LeadScoringState:
        """Recommend next actions based on qualification"""
        qualification = state.get("qualification", "COLD")

        if qualification == "HOT":
            actions = [
                "Schedule immediate discovery call",
                "Send personalized investment proposal",
                "Fast-track to qualified status",
                "Assign to senior sales rep",
                "Create high-priority follow-up task",
            ]
        elif qualification == "WARM":
            actions = [
                "Send introductory email with case studies",
                "Schedule exploratory call within 1 week",
                "Share relevant market insights",
                "Move to CONTACTED status",
                "Create medium-priority follow-up task",
            ]
        else:
            actions = [
                "Add to nurture email campaign",
                "Monitor for engagement signals",
                "Research company further before outreach",
                "Update lead status to CONTACTED if not already",
                "Create low-priority follow-up task (2 weeks)",
            ]

        state["recommended_actions"] = actions
        logger.info(f"Recommended {len(actions)} actions for {qualification} lead")

        return state

    def _should_draft_email(self, state: LeadScoringState) -> str:
        """Decide if we should draft an email"""
        qualification = state.get("qualification", "COLD")
        lead_status = self._normalize_status(state.get("lead_data", {}).get("status")) or "NEW"

        if qualification in ["HOT", "WARM"] and lead_status == "NEW":
            return "draft"
        return "skip"

    async def _draft_email(self, state: LeadScoringState) -> LeadScoringState:
        """Draft personalized outreach email"""
        lead_data = state.get("lead_data", {})
        company_data = state.get("company_data")
        qualification = state.get("qualification", "WARM")

        system_prompt = """You are a senior financial services sales professional.
Draft a personalized, professional outreach email for this lead.

Guidelines:
- Keep it concise (3-4 short paragraphs)
- Personalize based on their title and company
- Focus on value proposition for financial professionals
- Include a clear call-to-action
- Professional but warm tone
- Use HTML formatting (<p>, <strong>, <ul>)"""

        user_prompt = f"""Draft an email for:
- Name: {lead_data.get('firstName', '')} {lead_data.get('lastName', '')}
- Title: {lead_data.get('title', 'Financial Professional')}
- Company: {lead_data.get('company', 'their organization')}
- Qualification: {qualification}
{f"- Company Industry: {company_data.get('industry')}" if company_data else ""}

{f"This is a {qualification} lead - prioritize urgency and value." if qualification == "HOT" else "This is a WARM lead - focus on building interest and trust."}"""

        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt),
            ]
            response = await self.llm.ainvoke(messages)
            state["draft_email"] = response.content

            logger.info(f"Drafted email for lead {state['lead_id']}")
        except Exception as e:
            logger.error(f"Error drafting email: {str(e)}")
            if self._is_llm_unavailable_error(e):
                state["draft_email"] = self._build_fallback_email(lead_data, qualification)
                state["degraded_mode"] = True
                reasons = state.get("degraded_reasons", [])
                reasons.append("AI email drafting unavailable; using template-based outreach copy.")
                state["degraded_reasons"] = reasons

        return state

    async def _create_task(self, state: LeadScoringState) -> LeadScoringState:
        """Create follow-up task"""
        lead_data = state.get("lead_data", {})
        qualification = state.get("qualification", "WARM")
        lead_id = state["lead_id"]

        if qualification == "HOT":
            priority = "HIGH"
            days_until_due = 1
            title = f"HOT Lead: Follow up with {lead_data.get('firstName', '')} {lead_data.get('lastName', '')}".strip()
        elif qualification == "WARM":
            priority = "MEDIUM"
            days_until_due = 3
            title = f"Follow up with {lead_data.get('firstName', '')} {lead_data.get('lastName', '')}".strip()
        else:
            priority = "LOW"
            days_until_due = 7
            title = f"Nurture lead: {lead_data.get('firstName', '')} {lead_data.get('lastName', '')}".strip()

        task_data = {
            "title": title,
            "description": "AI-generated follow-up task based on the latest lead qualification run.",
            "dueDate": (datetime.now() + timedelta(days=days_until_due)).replace(microsecond=0).isoformat(),
            "priority": priority,
            "status": "TODO",
            "assignedToId": lead_data.get("ownerId"),
            "relatedEntityType": "Lead",
            "relatedEntityId": lead_id,
        }

        try:
            await self._backend_request("POST", "/api/v1/tasks", json_body=task_data)
            state["task_created"] = True
            logger.info(f"Created {priority} priority task for lead {lead_id}")
        except Exception as e:
            logger.error(f"Error creating task: {str(e)}")
            state["task_created"] = False

        return state

    async def _update_lead(self, state: LeadScoringState) -> LeadScoringState:
        """Update lead with new score and status"""
        lead_id = state["lead_id"]
        score = state.get("score")
        draft_email = state.get("draft_email")

        if score is None:
            return state

        if draft_email:
            try:
                lead_data = state.get("lead_data", {})
                to_email = lead_data.get("email")
                from_email = self._extract_sender_email()

                if to_email and from_email:
                    email_data = {
                        "toEmail": to_email,
                        "fromEmail": from_email,
                        "subject": "Introduction - Investment Management Services",
                        "body": draft_email,
                        "folder": "DRAFTS",
                        "isDraft": True,
                        "isSent": False,
                        "isRead": False,
                        "relatedEntityType": "Lead",
                        "relatedEntityId": lead_id,
                    }
                    await self._backend_request("POST", "/api/v1/emails", json_body=email_data)
                    logger.info(f"Saved draft email for lead {lead_id}")
                else:
                    logger.warning(
                        f"Skipping draft email save for lead {lead_id}: missing sender or recipient email"
                    )
            except Exception as e:
                logger.error(f"Error saving draft email: {str(e)}")

        try:
            lead_payload = self._build_lead_update_payload(
                state.get("lead_data", {}),
                score,
                state.get("qualification"),
            )
            await self._backend_request(
                "PUT",
                f"/api/v1/leads/{lead_id}",
                json_body=lead_payload,
            )
            logger.info(f"Updated lead {lead_id} with new score: {score}")
        except Exception as e:
            logger.error(f"Error updating lead: {str(e)}")
            state["error"] = f"Failed to update lead: {str(e)}"

        return state
