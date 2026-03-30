"""
Forecasting Agent - AI-powered sales forecasting and pipeline analysis

This agent:
1. Analyzes current pipeline and historical deal data
2. Calculates weighted forecasts using AI-powered probability scoring
3. Generates monthly projections (6 months ahead)
4. Provides actionable insights and recommendations
5. Identifies risks and opportunities
6. Supports team-level and individual forecasting
"""

from typing import Dict, Any, List, Optional, Tuple
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, SystemMessage
from typing_extensions import TypedDict
import logging
import httpx
from datetime import datetime, timedelta
from collections import defaultdict

from app.config import settings

logger = logging.getLogger(__name__)


class ForecastingState(TypedDict, total=False):
    """State for forecasting workflow"""
    # Input
    user_token: str
    forecast_months: int
    
    # Data collection
    deals: List[Dict[str, Any]]
    leads: List[Dict[str, Any]]
    historical_deals: List[Dict[str, Any]]
    
    # Analysis
    stage_conversion_rates: Dict[str, float]
    average_deal_cycle: int
    deal_probabilities: Dict[str, float]  # deal_id -> probability
    
    # Forecast results
    monthly_forecasts: List[Dict[str, Any]]
    team_forecasts: List[Dict[str, Any]]
    weighted_pipeline: float
    total_quota: float
    forecast_vs_quota: float
    
    # Insights
    insights: List[str]
    risks: List[Dict[str, Any]]
    opportunities: List[Dict[str, Any]]
    recommendations: List[str]
    
    # Error handling
    error: Optional[str]
    degraded_mode: bool
    degraded_reasons: List[str]


class ForecastingAgent:
    """Autonomous agent for sales forecasting and pipeline analysis"""
    
    # Default stage probabilities (can be overridden by historical data)
    DEFAULT_STAGE_PROBABILITIES = {
        "PROSPECTING": 0.10,
        "QUALIFICATION": 0.20,
        "NEEDS_ANALYSIS": 0.30,
        "PROPOSAL": 0.60,
        "NEGOTIATION": 0.80,
        "CLOSED_WON": 1.00,
        "CLOSED_LOST": 0.00
    }
    
    def __init__(self, backend_url: str = "http://localhost:8080", api_token: Optional[str] = None):
        """
        Initialize Forecasting Agent
        
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
            temperature=0.4,  # Balanced for analysis
            max_tokens=3000
        )
        
        # Build workflow
        self.workflow = self._build_workflow()
        
        logger.info("Forecasting Agent initialized")
    
    def _build_workflow(self) -> StateGraph:
        """Build LangGraph workflow for forecasting"""
        workflow = StateGraph(ForecastingState)
        
        # Add nodes
        workflow.add_node("collect_data", self._collect_data)
        workflow.add_node("analyze_historical", self._analyze_historical)
        workflow.add_node("score_deals", self._score_deals)
        workflow.add_node("calculate_forecast", self._calculate_forecast)
        workflow.add_node("generate_insights", self._generate_insights)
        
        # Define flow
        workflow.set_entry_point("collect_data")
        workflow.add_edge("collect_data", "analyze_historical")
        workflow.add_edge("analyze_historical", "score_deals")
        workflow.add_edge("score_deals", "calculate_forecast")
        workflow.add_edge("calculate_forecast", "generate_insights")
        workflow.add_edge("generate_insights", END)
        
        return workflow.compile()
    
    async def generate_forecast(
        self, 
        user_token: str, 
        forecast_months: int = 6
    ) -> Dict[str, Any]:
        """
        Generate sales forecast
        
        Args:
            user_token: JWT token for API authentication
            forecast_months: Number of months to forecast (default: 6)
            
        Returns:
            Dict with forecast data and insights
        """
        initial_state = ForecastingState(
            user_token=user_token,
            forecast_months=forecast_months,
            degraded_mode=False,
            degraded_reasons=[],
        )
        
        try:
            result = await self.workflow.ainvoke(initial_state)
            
            return {
                "success": True,
                "monthly_forecasts": result.get("monthly_forecasts", []),
                "team_forecasts": result.get("team_forecasts", []),
                "weighted_pipeline": result.get("weighted_pipeline", 0),
                "total_quota": result.get("total_quota", 0),
                "forecast_vs_quota": result.get("forecast_vs_quota", 0),
                "insights": result.get("insights", []),
                "risks": result.get("risks", []),
                "opportunities": result.get("opportunities", []),
                "recommendations": result.get("recommendations", []),
                "stage_conversion_rates": result.get("stage_conversion_rates", {}),
                "error": result.get("error"),
                "degraded_mode": result.get("degraded_mode", False),
                "degraded_reason": "; ".join(result.get("degraded_reasons", [])) if result.get("degraded_reasons") else None,
            }
        except Exception as e:
            logger.error(f"Error generating forecast: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _collect_data(self, state: ForecastingState) -> ForecastingState:
        """Collect all necessary data from CRM"""
        user_token = state["user_token"]
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {"Authorization": f"Bearer {user_token}"}
                
                # Fetch active deals (not CLOSED_LOST)
                deals_response = await client.get(
                    f"{self.backend_url}/api/v1/deals",
                    headers=headers,
                    params={"size": 1000}
                )
                deals_response.raise_for_status()
                deals_data = deals_response.json()
                
                # Handle paginated response
                all_deals = deals_data.get("content", deals_data) if isinstance(deals_data, dict) else deals_data
                
                # Filter active deals
                active_deals = [
                    d for d in all_deals 
                    if d.get("stage") != "CLOSED_LOST"
                ]
                
                # Separate historical closed deals for analysis
                historical_deals = [
                    d for d in all_deals
                    if d.get("stage") in ["CLOSED_WON", "CLOSED_LOST"]
                    and d.get("actualCloseDate")
                ]
                
                state["deals"] = active_deals
                state["historical_deals"] = historical_deals
                
                logger.info(f"Collected {len(active_deals)} active deals, {len(historical_deals)} historical deals")
                
                # Fetch leads for opportunity analysis
                try:
                    leads_response = await client.get(
                        f"{self.backend_url}/api/v1/leads",
                        headers=headers,
                        params={"status": "QUALIFIED", "size": 100}
                    )
                    leads_response.raise_for_status()
                    leads_data = leads_response.json()
                    # Handle paginated response
                    state["leads"] = leads_data.get("content", leads_data) if isinstance(leads_data, dict) else leads_data
                    logger.info(f"Collected {len(state['leads'])} qualified leads")
                except Exception as e:
                    logger.warning(f"Could not fetch leads: {str(e)}")
                    state["leads"] = []
                
        except Exception as e:
            logger.error(f"Error collecting data: {str(e)}")
            state["error"] = f"Data collection failed: {str(e)}"
            state["deals"] = []
            state["leads"] = []
            state["historical_deals"] = []
        
        return state
    
    async def _analyze_historical(self, state: ForecastingState) -> ForecastingState:
        """Analyze historical deals to calculate conversion rates"""
        historical_deals = state.get("historical_deals", [])
        
        if not historical_deals:
            logger.warning("No historical deals available, using default conversion rates")
            state["stage_conversion_rates"] = self.DEFAULT_STAGE_PROBABILITIES.copy()
            state["average_deal_cycle"] = 60  # Default 60 days
            return state
        
        # Calculate stage conversion rates
        stage_counts = defaultdict(int)
        stage_won = defaultdict(int)
        
        for deal in historical_deals:
            stage = deal.get("stage")
            if stage:
                stage_counts[stage] += 1
                if stage == "CLOSED_WON":
                    stage_won[stage] += 1
        
        # Calculate conversion rates (fallback to defaults if insufficient data)
        conversion_rates = {}
        for stage, default_rate in self.DEFAULT_STAGE_PROBABILITIES.items():
            if stage_counts.get(stage, 0) >= 3:  # Need at least 3 deals
                conversion_rates[stage] = stage_won.get(stage, 0) / stage_counts[stage]
            else:
                conversion_rates[stage] = default_rate
        
        state["stage_conversion_rates"] = conversion_rates
        
        # Calculate average deal cycle (days from creation to close)
        deal_cycles = []
        for deal in historical_deals:
            if deal.get("createdAt") and deal.get("actualCloseDate"):
                try:
                    created = datetime.fromisoformat(deal["createdAt"].replace("Z", "+00:00"))
                    closed = datetime.fromisoformat(deal["actualCloseDate"].replace("Z", "+00:00"))
                    days = (closed - created).days
                    if days > 0:
                        deal_cycles.append(days)
                except:
                    pass
        
        avg_cycle = int(sum(deal_cycles) / len(deal_cycles)) if deal_cycles else 60
        state["average_deal_cycle"] = avg_cycle
        
        logger.info(f"Calculated conversion rates: {conversion_rates}")
        logger.info(f"Average deal cycle: {avg_cycle} days")
        
        return state
    
    async def _score_deals(self, state: ForecastingState) -> ForecastingState:
        """Score each deal with AI-powered close probability"""
        deals = state.get("deals", [])
        stage_rates = state.get("stage_conversion_rates", self.DEFAULT_STAGE_PROBABILITIES)
        avg_cycle = state.get("average_deal_cycle", 60)
        
        if not deals:
            state["deal_probabilities"] = {}
            return state
        
        # Prepare deals for AI scoring
        system_prompt = """You are a sales forecasting expert. Analyze each deal and adjust its close probability based on:

1. Pipeline Stage: Use the historical conversion rate as a baseline
2. Deal Age: Deals older than average cycle are less likely to close
3. Deal Value: Unusually high/low values may indicate risk
4. Lead Score: Higher lead scores indicate better fit
5. Activity: Recent updates indicate active deals

Provide probability adjustments as multipliers (0.5 = reduce by 50%, 1.5 = increase by 50%, 1.0 = no change).
Return JSON with deal_id as key and adjustment multiplier as value."""
        
        # Build deal summaries for AI
        deal_summaries = []
        for deal in deals[:20]:  # Limit to 20 deals per request for token limits
            age_days = 0
            if deal.get("createdAt"):
                try:
                    created = datetime.fromisoformat(deal["createdAt"].replace("Z", "+00:00"))
                    age_days = (datetime.now() - created.replace(tzinfo=None)).days
                except:
                    pass
            
            summary = {
                "id": deal["id"],
                "stage": deal.get("stage", "PROSPECTING"),
                "value": deal.get("value", 0),
                "age_days": age_days,
                "expected_close_days": deal.get("expectedCloseDate", "unknown")
            }
            deal_summaries.append(summary)
        
        user_prompt = f"""Historical stage conversion rates:
{stage_rates}

Average deal cycle: {avg_cycle} days

Deals to score:
{deal_summaries}

Provide probability adjustment multipliers for each deal."""
        
        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]
            
            response = await self.llm.ainvoke(messages)
            
            # Parse AI adjustments
            import json
            adjustments = json.loads(response.content)
            
            # Calculate final probabilities
            probabilities = {}
            for deal in deals:
                deal_id = deal["id"]
                stage = deal.get("stage", "PROSPECTING")
                base_prob = stage_rates.get(stage, 0.5)
                
                # Apply AI adjustment if available
                adjustment = adjustments.get(deal_id, 1.0)
                final_prob = min(max(base_prob * adjustment, 0.0), 1.0)
                
                probabilities[deal_id] = final_prob
            
            state["deal_probabilities"] = probabilities
            logger.info(f"Scored {len(probabilities)} deals with AI-powered probabilities")
            
        except Exception as e:
            logger.error(f"Error in AI scoring, using stage-based probabilities: {str(e)}")
            state["degraded_mode"] = True
            reasons = state.get("degraded_reasons", [])
            reasons.append("AI probability scoring unavailable; using stage-based probabilities.")
            state["degraded_reasons"] = reasons
            # Fallback to stage-based probabilities
            probabilities = {}
            for deal in deals:
                stage = deal.get("stage", "PROSPECTING")
                probabilities[deal["id"]] = stage_rates.get(stage, 0.5)
            
            state["deal_probabilities"] = probabilities
        
        return state
    
    async def _calculate_forecast(self, state: ForecastingState) -> ForecastingState:
        """Calculate weighted forecast and monthly projections"""
        deals = state.get("deals", [])
        probabilities = state.get("deal_probabilities", {})
        forecast_months = state.get("forecast_months", 6)
        avg_cycle = state.get("average_deal_cycle", 60)
        
        if not deals:
            state["monthly_forecasts"] = []
            state["team_forecasts"] = []
            state["weighted_pipeline"] = 0
            state["total_quota"] = 0
            state["forecast_vs_quota"] = 0
            return state
        
        # Calculate weighted pipeline
        weighted_pipeline = sum(
            deal.get("value", 0) * probabilities.get(deal["id"], 0.5)
            for deal in deals
            if deal.get("stage") != "CLOSED_WON"
        )
        
        # Calculate closed deals (already won)
        closed_value = sum(
            deal.get("value", 0)
            for deal in deals
            if deal.get("stage") == "CLOSED_WON"
        )
        
        state["weighted_pipeline"] = weighted_pipeline
        
        # Generate monthly forecasts
        monthly_forecasts = []
        current_date = datetime.now()
        
        for month_offset in range(forecast_months):
            month_start = current_date + timedelta(days=30 * month_offset)
            month_end = month_start + timedelta(days=30)
            
            # Calculate expected closes in this month
            month_pipeline = 0
            month_forecast = 0
            month_actual = closed_value if month_offset == 0 else 0
            
            for deal in deals:
                if deal.get("stage") == "CLOSED_WON":
                    continue
                
                deal_value = deal.get("value", 0)
                probability = probabilities.get(deal["id"], 0.5)
                
                # Check if deal expected to close in this month
                expected_close = deal.get("expectedCloseDate")
                in_month = False
                
                if expected_close:
                    try:
                        close_date = datetime.fromisoformat(expected_close.replace("Z", "+00:00"))
                        in_month = month_start <= close_date < month_end
                    except:
                        pass
                
                # Add to pipeline
                month_pipeline += deal_value
                
                # Add to forecast if expected to close or high probability
                if in_month or probability > 0.6:
                    month_forecast += deal_value * probability
            
            # Estimate quota (can be configured per org)
            month_quota = weighted_pipeline / forecast_months * 1.2  # 20% above weighted avg
            
            monthly_forecasts.append({
                "month": month_start.strftime("%b"),
                "month_date": month_start.isoformat(),
                "pipeline": round(month_pipeline),
                "forecast": round(month_forecast),
                "actual": round(month_actual),
                "quota": round(month_quota)
            })
        
        state["monthly_forecasts"] = monthly_forecasts
        
        # Calculate team-level forecasts (grouped by owner if available)
        team_data = defaultdict(lambda: {
            "quota": 0,
            "forecast": 0,
            "closed": 0,
            "pipeline": 0
        })
        
        # Default quota per person (can be customized)
        default_quota = weighted_pipeline * 0.3  # 30% of total pipeline
        team_forecasts = []
        
        for deal in deals:
            owner = deal.get("ownerId") or "unassigned"
            deal_value = deal.get("value", 0)
            probability = probabilities.get(deal["id"], 0.5)
            
            if deal.get("stage") == "CLOSED_WON":
                team_data[owner]["closed"] += deal_value
            else:
                team_data[owner]["pipeline"] += deal_value
                team_data[owner]["forecast"] += deal_value * probability
            
            team_data[owner]["quota"] = default_quota

        for owner_id, data in team_data.items():
            attainment = 0
            if data["quota"] > 0:
                attainment = int((data["closed"] / data["quota"]) * 100)

            owner_name = next(
                (
                    deal.get("ownerName")
                    for deal in deals
                    if deal.get("ownerId") == owner_id and deal.get("ownerName")
                ),
                None,
            )
            owner_label = "Unassigned"
            if owner_id != "unassigned":
                owner_label = f"Rep {str(owner_id)[:8]}"
            
            team_forecasts.append({
                "name": owner_name or owner_label,
                "quota": round(data["quota"]),
                "forecast": round(data["forecast"]),
                "closed": round(data["closed"]),
                "pipeline": round(data["pipeline"]),
                "attainment": attainment
            })
        
        state["team_forecasts"] = team_forecasts
        
        # Calculate totals
        total_quota = sum(t["quota"] for t in team_forecasts)
        total_forecast = weighted_pipeline + closed_value
        
        state["total_quota"] = total_quota
        state["forecast_vs_quota"] = (total_forecast / total_quota * 100) if total_quota > 0 else 0
        
        logger.info(f"Calculated forecast: ${weighted_pipeline:,.0f} weighted pipeline")
        logger.info(f"Total forecast vs quota: {state['forecast_vs_quota']:.1f}%")
        
        return state
    
    async def _generate_insights(self, state: ForecastingState) -> ForecastingState:
        """Generate AI-powered insights and recommendations"""
        deals = state.get("deals", [])
        probabilities = state.get("deal_probabilities", {})
        weighted_pipeline = state.get("weighted_pipeline", 0)
        total_quota = state.get("total_quota", 0)
        forecast_vs_quota = state.get("forecast_vs_quota", 0)
        avg_cycle = state.get("average_deal_cycle", 60)
        leads = state.get("leads", [])
        
        # Identify risks (stalled deals)
        risks = []
        for deal in deals:
            if deal.get("stage") in ["CLOSED_WON", "CLOSED_LOST"]:
                continue
            
            age_days = 0
            if deal.get("createdAt"):
                try:
                    created = datetime.fromisoformat(deal["createdAt"].replace("Z", "+00:00"))
                    age_days = (datetime.now() - created.replace(tzinfo=None)).days
                except:
                    pass
            
            # Flag deals older than 2x average cycle
            if age_days > avg_cycle * 2:
                risks.append({
                    "deal_id": deal["id"],
                    "title": deal.get("name", "Untitled Deal"),
                    "value": deal.get("value", 0),
                    "stage": deal.get("stage"),
                    "age_days": age_days,
                    "reason": f"Stalled {age_days - avg_cycle} days beyond average cycle"
                })
        
        state["risks"] = risks[:5]  # Top 5 risks
        
        # Identify opportunities (high-value, high-probability deals)
        opportunities = []
        for deal in deals:
            if deal.get("stage") in ["CLOSED_WON", "CLOSED_LOST"]:
                continue
            
            probability = probabilities.get(deal["id"], 0.5)
            value = deal.get("value", 0)
            weighted_value = value * probability
            
            # Flag high-value, high-probability deals
            if probability > 0.7 and value > weighted_pipeline / 20:  # Top 5% of pipeline
                opportunities.append({
                    "deal_id": deal["id"],
                    "title": deal.get("name", "Untitled Deal"),
                    "value": value,
                    "probability": probability,
                    "weighted_value": weighted_value,
                    "stage": deal.get("stage"),
                    "reason": f"High-value deal ({probability*100:.0f}% probability)"
                })
        
        # Sort by weighted value
        opportunities.sort(key=lambda x: x["weighted_value"], reverse=True)
        state["opportunities"] = opportunities[:5]  # Top 5 opportunities
        
        # Generate AI insights
        system_prompt = """You are a sales forecasting expert. Analyze the forecast data and provide:
1. 2-3 key insights about the pipeline health
2. 3-5 specific, actionable recommendations to improve forecast attainment

Be concise and specific. Focus on data-driven insights."""
        
        user_prompt = f"""Forecast Analysis:
- Weighted Pipeline: ${weighted_pipeline:,.0f}
- Total Quota: ${total_quota:,.0f}
- Forecast vs Quota: {forecast_vs_quota:.1f}%
- Average Deal Cycle: {avg_cycle} days
- Active Deals: {len(deals)}
- Qualified Leads: {len(leads)}

Top Risks:
{[f"${r['value']:,} deal stalled for {r['age_days']} days" for r in risks[:3]]}

Top Opportunities:
{[f"${o['value']:,} deal at {o['probability']*100:.0f}% probability" for o in opportunities[:3]]}

Provide insights and recommendations."""
        
        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]
            
            response = await self.llm.ainvoke(messages)
            
            # Parse insights and recommendations
            content = response.content
            
            # Simple parsing (look for numbered lists)
            insights = []
            recommendations = []
            
            lines = content.split('\n')
            current_section = None
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                if 'insight' in line.lower():
                    current_section = 'insights'
                elif 'recommendation' in line.lower():
                    current_section = 'recommendations'
                elif line[0].isdigit() or line.startswith('-'):
                    text = line.lstrip('0123456789.-) ')
                    if current_section == 'insights':
                        insights.append(text)
                    elif current_section == 'recommendations':
                        recommendations.append(text)
            
            state["insights"] = insights if insights else [
                f"Pipeline at {forecast_vs_quota:.0f}% of quota",
                f"{len(risks)} deals at risk of stalling",
                f"{len(opportunities)} high-value opportunities to prioritize"
            ]
            
            state["recommendations"] = recommendations if recommendations else [
                "Focus on closing high-probability deals",
                "Re-engage stalled deals",
                "Convert qualified leads to increase pipeline coverage"
            ]
            
            logger.info(f"Generated {len(insights)} insights and {len(recommendations)} recommendations")
            
        except Exception as e:
            logger.error(f"Error generating AI insights: {str(e)}")
            state["degraded_mode"] = True
            reasons = state.get("degraded_reasons", [])
            reasons.append("AI narrative insights unavailable; using rule-based forecast insights.")
            state["degraded_reasons"] = reasons
            # Fallback insights
            state["insights"] = [
                f"Pipeline forecast at {forecast_vs_quota:.0f}% of quota",
                f"{len(risks)} deals need attention (stalled beyond average cycle)",
                f"{len(opportunities)} high-value deals in late stages"
            ]
            state["recommendations"] = [
                "Prioritize closing deals with >70% probability",
                "Schedule check-ins on stalled deals",
                "Fast-track qualified leads to deals to increase pipeline"
            ]
        
        return state


# Global instance (will be initialized on first use)
forecasting_agent: Optional[ForecastingAgent] = None


def get_forecasting_agent(backend_url: str, api_token: str) -> ForecastingAgent:
    """Get or create forecasting agent instance"""
    global forecasting_agent
    
    if not forecasting_agent:
        forecasting_agent = ForecastingAgent(backend_url, api_token)
    else:
        # Update token
        forecasting_agent.api_token = api_token
    
    return forecasting_agent
