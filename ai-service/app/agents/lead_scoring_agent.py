"""
Lead Scoring Agent - Autonomous AI for lead qualification and opportunity management

This agent:
1. Scores leads based on profile, company data, and engagement
2. Qualifies leads (hot, warm, cold) and suggests next actions
3. Drafts personalized outreach emails
4. Creates follow-up tasks
5. Updates lead status automatically
"""

from typing import Dict, Any, List, Optional
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, SystemMessage
from typing_extensions import TypedDict
import logging
import httpx
from datetime import datetime

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
        
        # Initialize LLM
        self.llm = ChatGroq(
            groq_api_key=settings.GROQ_API_KEY,
            model_name=settings.CHAT_MODEL,
            temperature=0.3,  # Lower temperature for more consistent scoring
            max_tokens=2000
        )
        
        # Build workflow
        self.workflow = self._build_workflow()
        
        logger.info("Lead Scoring Agent initialized")
    
    def _build_workflow(self) -> StateGraph:
        """Build LangGraph workflow for lead scoring"""
        workflow = StateGraph(LeadScoringState)
        
        # Add nodes
        workflow.add_node("fetch_lead_data", self._fetch_lead_data)
        workflow.add_node("enrich_with_company", self._enrich_with_company)
        workflow.add_node("find_similar_deals", self._find_similar_deals)
        workflow.add_node("calculate_score", self._calculate_score)
        workflow.add_node("qualify_lead", self._qualify_lead)
        workflow.add_node("recommend_actions", self._recommend_actions)
        workflow.add_node("draft_email", self._draft_email)
        workflow.add_node("create_task", self._create_task)
        workflow.add_node("update_lead", self._update_lead)
        
        # Define flow
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
                "skip": "create_task"
            }
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
            task_created=False
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
                "error": result.get("error")
            }
        except Exception as e:
            logger.error(f"Error scoring lead {lead_id}: {str(e)}")
            return {
                "success": False,
                "lead_id": lead_id,
                "error": str(e)
            }
    
    async def _fetch_lead_data(self, state: LeadScoringState) -> LeadScoringState:
        """Fetch lead data from CRM"""
        lead_id = state["lead_id"]
        
        try:
            async with httpx.AsyncClient() as client:
                headers = {}
                if self.api_token:
                    headers["Authorization"] = f"Bearer {self.api_token}"
                
                response = await client.get(
                    f"{self.backend_url}/api/leads/{lead_id}",
                    headers=headers,
                    timeout=10.0
                )
                response.raise_for_status()
                
                lead_data = response.json()
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
            async with httpx.AsyncClient() as client:
                headers = {}
                if self.api_token:
                    headers["Authorization"] = f"Bearer {self.api_token}"
                
                # Search for company by name
                response = await client.get(
                    f"{self.backend_url}/api/companies",
                    headers=headers,
                    params={"search": company_name, "limit": 1},
                    timeout=10.0
                )
                response.raise_for_status()
                
                companies = response.json()
                if companies and len(companies) > 0:
                    state["company_data"] = companies[0]
                    logger.info(f"Found company data for: {company_name}")
                
        except Exception as e:
            logger.warning(f"Could not fetch company data: {str(e)}")
        
        return state
    
    async def _find_similar_deals(self, state: LeadScoringState) -> LeadScoringState:
        """Find similar successful deals for context"""
        lead_data = state.get("lead_data", {})
        
        try:
            async with httpx.AsyncClient() as client:
                headers = {}
                if self.api_token:
                    headers["Authorization"] = f"Bearer {self.api_token}"
                
                # Get recent closed/won deals
                response = await client.get(
                    f"{self.backend_url}/api/deals",
                    headers=headers,
                    params={"stage": "CLOSED_WON", "limit": 5},
                    timeout=10.0
                )
                response.raise_for_status()
                
                deals = response.json()
                state["similar_deals"] = deals[:5] if deals else []
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
        
        # Build scoring prompt
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
                HumanMessage(content=user_prompt)
            ]
            
            response = await self.llm.ainvoke(messages)
            
            # Parse JSON response
            import json
            result = json.loads(response.content)
            
            state["score"] = result["total_score"]
            state["score_breakdown"] = result["breakdown"]
            
            logger.info(f"Calculated score for lead {state['lead_id']}: {result['total_score']}/100")
            logger.info(f"Reasoning: {result['reasoning']}")
            
        except Exception as e:
            logger.error(f"Error calculating score: {str(e)}")
            # Fallback to simple scoring
            state["score"] = lead_data.get("score", 50)
            state["score_breakdown"] = {"error": "Failed to calculate detailed score"}
        
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
        lead_data = state.get("lead_data", {})
        
        actions = []
        
        if qualification == "HOT":
            actions = [
                "Schedule immediate discovery call",
                "Send personalized investment proposal",
                "Fast-track to qualified status",
                "Assign to senior sales rep",
                "Create high-priority follow-up task"
            ]
        elif qualification == "WARM":
            actions = [
                "Send introductory email with case studies",
                "Schedule exploratory call within 1 week",
                "Share relevant market insights",
                "Move to CONTACTED status",
                "Create medium-priority follow-up task"
            ]
        else:  # COLD
            actions = [
                "Add to nurture email campaign",
                "Monitor for engagement signals",
                "Research company further before outreach",
                "Update lead status to CONTACTED if not already",
                "Create low-priority follow-up task (2 weeks)"
            ]
        
        state["recommended_actions"] = actions
        logger.info(f"Recommended {len(actions)} actions for {qualification} lead")
        
        return state
    
    def _should_draft_email(self, state: LeadScoringState) -> str:
        """Decide if we should draft an email"""
        qualification = state.get("qualification", "COLD")
        lead_status = state.get("lead_data", {}).get("status", "NEW")
        
        # Draft email for HOT and WARM leads that haven't been contacted yet
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
                HumanMessage(content=user_prompt)
            ]
            
            response = await self.llm.ainvoke(messages)
            state["draft_email"] = response.content
            
            logger.info(f"Drafted email for lead {state['lead_id']}")
            
        except Exception as e:
            logger.error(f"Error drafting email: {str(e)}")
        
        return state
    
    async def _create_task(self, state: LeadScoringState) -> LeadScoringState:
        """Create follow-up task"""
        lead_data = state.get("lead_data", {})
        qualification = state.get("qualification", "WARM")
        lead_id = state["lead_id"]
        
        # Determine task priority and due date
        if qualification == "HOT":
            priority = "HIGH"
            days_until_due = 1
            title = f"🔥 HOT Lead: Follow up with {lead_data.get('firstName', '')} {lead_data.get('lastName', '')}"
        elif qualification == "WARM":
            priority = "MEDIUM"
            days_until_due = 3
            title = f"Follow up with {lead_data.get('firstName', '')} {lead_data.get('lastName', '')}"
        else:
            priority = "LOW"
            days_until_due = 7
            title = f"Nurture lead: {lead_data.get('firstName', '')} {lead_data.get('lastName', '')}"
        
        from datetime import datetime, timedelta
        due_date = (datetime.now() + timedelta(days=days_until_due)).strftime('%Y-%m-%d')
        
        task_data = {
            "title": title,
            "dueDate": due_date,
            "priority": priority,
            "status": "TODO",
            "relatedEntityType": "Lead",
            "relatedEntityId": lead_id
        }
        
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Content-Type": "application/json"}
                if self.api_token:
                    headers["Authorization"] = f"Bearer {self.api_token}"
                
                response = await client.post(
                    f"{self.backend_url}/api/tasks",
                    headers=headers,
                    json=task_data,
                    timeout=10.0
                )
                response.raise_for_status()
                
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
        
        if not score:
            return state
        
        update_data = {
            "score": score
        }
        
        # If we drafted an email, save it as a draft
        if draft_email:
            try:
                async with httpx.AsyncClient() as client:
                    headers = {"Content-Type": "application/json"}
                    if self.api_token:
                        headers["Authorization"] = f"Bearer {self.api_token}"
                    
                    lead_data = state.get("lead_data", {})
                    email_data = {
                        "toAddresses": lead_data.get("email"),
                        "subject": f"Introduction - Investment Management Services",
                        "body": draft_email,
                        "folder": "DRAFTS",
                        "isDraft": True
                    }
                    
                    response = await client.post(
                        f"{self.backend_url}/api/emails",
                        headers=headers,
                        json=email_data,
                        timeout=10.0
                    )
                    response.raise_for_status()
                    
                    logger.info(f"Saved draft email for lead {lead_id}")
                    
            except Exception as e:
                logger.error(f"Error saving draft email: {str(e)}")
        
        # Update lead score
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Content-Type": "application/json"}
                if self.api_token:
                    headers["Authorization"] = f"Bearer {self.api_token}"
                
                response = await client.put(
                    f"{self.backend_url}/api/leads/{lead_id}",
                    headers=headers,
                    json={**state.get("lead_data", {}), **update_data},
                    timeout=10.0
                )
                response.raise_for_status()
                
                logger.info(f"Updated lead {lead_id} with new score: {score}")
                
        except Exception as e:
            logger.error(f"Error updating lead: {str(e)}")
            state["error"] = f"Failed to update lead: {str(e)}"
        
        return state
