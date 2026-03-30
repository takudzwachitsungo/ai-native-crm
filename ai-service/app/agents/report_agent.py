"""
AI-Powered Report Generation Agent

This agent uses LangGraph to generate dynamic reports with AI insights.
Supports both standard templates and custom natural language queries.
"""

import logging
from typing import List, Dict, Any, Optional, TypedDict, Literal
from datetime import datetime, timedelta
from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
import httpx
from app.config import settings

logger = logging.getLogger(__name__)


class ReportState(TypedDict):
    """State for report generation workflow"""
    # Input
    user_token: str
    report_type: str  # "sales_pipeline", "lead_conversion", "activity_summary", "custom", etc.
    custom_query: Optional[str]  # Natural language query for custom reports
    date_range: Dict[str, str]  # {"start": "2026-01-01", "end": "2026-01-31"}
    filters: Optional[Dict[str, Any]]  # Additional filters
    
    # Data
    deals: List[Dict[str, Any]]
    leads: List[Dict[str, Any]]
    contacts: List[Dict[str, Any]]
    activities: List[Dict[str, Any]]
    
    # Analysis results
    metrics: Dict[str, Any]
    charts: List[Dict[str, Any]]
    insights: List[str]
    recommendations: List[str]
    
    # Output
    report_title: str
    report_summary: str
    sections: List[Dict[str, Any]]
    
    # Error handling
    error: Optional[str]
    degraded_mode: bool
    degraded_reasons: List[str]


class ReportAgent:
    """Autonomous agent for generating comprehensive CRM reports"""
    
    # Standard report templates
    REPORT_TEMPLATES = {
        "sales_pipeline": {
            "title": "Sales Pipeline Report",
            "description": "Comprehensive analysis of deals by stage, value, and timeline",
            "data_requirements": ["deals"],
            "metrics": ["pipeline_value", "deal_count_by_stage", "avg_deal_size", "win_rate"]
        },
        "lead_conversion": {
            "title": "Lead Conversion Report",
            "description": "Lead-to-customer conversion analysis with bottleneck identification",
            "data_requirements": ["leads", "deals"],
            "metrics": ["conversion_rate", "lead_sources", "qualification_rate", "avg_conversion_time"]
        },
        "activity_summary": {
            "title": "Activity Summary Report",
            "description": "Sales team activities including calls, meetings, emails, and tasks",
            "data_requirements": ["activities", "contacts"],
            "metrics": ["total_activities", "activities_by_type", "response_times", "engagement_rate"]
        },
        "revenue_forecast": {
            "title": "Revenue Forecast Report",
            "description": "Revenue projections based on pipeline and historical performance",
            "data_requirements": ["deals"],
            "metrics": ["forecasted_revenue", "closed_revenue", "pipeline_value", "quota_attainment"]
        },
        "team_performance": {
            "title": "Team Performance Report",
            "description": "Individual and team performance metrics with rankings",
            "data_requirements": ["deals", "activities"],
            "metrics": ["deals_closed", "revenue_per_rep", "activity_volume", "conversion_rates"]
        }
    }
    
    def __init__(self, backend_url: str = "http://localhost:8080"):
        """Initialize Report Agent"""
        self.backend_url = backend_url
        
        # Initialize LLM
        self.llm = ChatGroq(
            groq_api_key=settings.GROQ_API_KEY,
            model_name=settings.CHAT_MODEL,
            temperature=0.3,  # Lower temperature for factual reporting
            max_tokens=4000
        )
        
        # Build workflow
        self.workflow = self._build_workflow()
        
        logger.info("Report Agent initialized")

    @staticmethod
    def _format_currency(value: Any) -> str:
        try:
            return f"${float(value or 0):,.0f}"
        except (TypeError, ValueError):
            return "$0"

    def _build_fallback_insights(self, report_type: str, metrics: Dict[str, Any]) -> List[str]:
        if report_type == "sales_pipeline":
            active_deals = metrics.get("active_deal_count", 0)
            pipeline_value = metrics.get("pipeline_value", 0)
            win_rate = metrics.get("win_rate", 0)
            deals_by_stage = metrics.get("deals_by_stage", {}) or {}
            value_by_stage = metrics.get("value_by_stage", {}) or {}
            top_stage = max(value_by_stage.items(), key=lambda item: item[1])[0] if value_by_stage else None

            insights = [
                f"Active pipeline stands at {self._format_currency(pipeline_value)} across {active_deals} open deals.",
                f"Current win rate is {win_rate:.1f}% based on closed outcomes in the CRM.",
            ]
            if top_stage:
                insights.append(
                    f"The largest concentration of pipeline value is in {top_stage}, which makes that stage the biggest lever for near-term movement."
                )
            elif deals_by_stage:
                insights.append("Pipeline is spread across multiple stages, so conversion discipline will matter more than top-of-funnel volume alone.")
            return insights

        if report_type == "lead_conversion":
            return [
                f"Lead conversion is running at {metrics.get('conversion_rate', 0):.1f}% with qualification at {metrics.get('qualification_rate', 0):.1f}%.",
                f"There are {metrics.get('qualified_leads', 0)} qualified leads currently available to progress.",
                "Lead source mix should be reviewed to double down on channels producing the most converted opportunities.",
            ]

        if report_type == "activity_summary" or "total_events" in metrics:
            return [
                f"There are {metrics.get('total_events', 0)} tracked events in the selected period.",
                f"Upcoming events account for {metrics.get('upcoming_events', 0)} items, which helps indicate current engagement momentum.",
                "Event mix by type can highlight whether the team is spending time on the highest-conversion activities.",
            ]

        return [
            f"The report contains {len(metrics)} key metrics derived from live CRM data.",
            "The current data set is usable even though the AI provider was unavailable for narrative analysis.",
        ]

    def _build_fallback_recommendations(self, report_type: str, metrics: Dict[str, Any]) -> List[str]:
        if report_type == "sales_pipeline":
            value_by_stage = metrics.get("value_by_stage", {}) or {}
            top_stage = max(value_by_stage.items(), key=lambda item: item[1])[0] if value_by_stage else None
            recommendations = [
                "Prioritize follow-up on late-stage deals to turn pipeline value into closed revenue.",
                "Review stalled deals and either re-engage them or clean them out of the active pipeline.",
                "Use owner-level pipeline reviews to identify where coaching or support is needed.",
            ]
            if top_stage:
                recommendations[0] = f"Focus inspection and follow-up on the {top_stage} stage, since it holds the most pipeline value."
            return recommendations

        if report_type == "lead_conversion":
            return [
                "Audit the highest-volume lead sources and prioritize the ones that produce qualified leads fastest.",
                "Tighten lead follow-up SLAs so qualified leads do not stall before first contact.",
                "Add nurture steps for lower-intent leads instead of treating the funnel as one-size-fits-all.",
            ]

        if report_type == "activity_summary" or "total_events" in metrics:
            return [
                "Increase consistency in the highest-value event types and trim low-signal activity.",
                "Review no-show or low-conversion meeting patterns and improve scheduling hygiene.",
                "Link more activities to deals or leads so reporting can show clearer impact.",
            ]

        return [
            "Review the top metrics with the team and convert them into one or two concrete actions.",
            "Validate whether the underlying CRM records are complete enough for the next reporting cycle.",
        ]

    def _build_fallback_summary(self, report_title: str, metrics: Dict[str, Any], insights: List[str]) -> str:
        if metrics:
            first_insight = insights[0] if insights else "This report is based on live CRM metrics."
            return f"{report_title} generated from current CRM data. {first_insight}"
        return f"{report_title} generated successfully from the available CRM data."
    
    def _build_workflow(self) -> StateGraph:
        """Build LangGraph workflow for report generation"""
        workflow = StateGraph(ReportState)
        
        # Add nodes
        workflow.add_node("collect_data", self._collect_data)
        workflow.add_node("calculate_metrics", self._calculate_metrics)
        workflow.add_node("generate_charts", self._generate_charts)
        workflow.add_node("analyze_insights", self._analyze_insights)
        workflow.add_node("create_report", self._create_report)
        
        # Define flow
        workflow.set_entry_point("collect_data")
        workflow.add_edge("collect_data", "calculate_metrics")
        workflow.add_edge("calculate_metrics", "generate_charts")
        workflow.add_edge("generate_charts", "analyze_insights")
        workflow.add_edge("analyze_insights", "create_report")
        workflow.add_edge("create_report", END)
        
        return workflow.compile()
    
    async def generate_report(
        self,
        user_token: str,
        report_type: str = "sales_pipeline",
        custom_query: Optional[str] = None,
        date_range: Optional[Dict[str, str]] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate a report based on type or custom query
        
        Args:
            user_token: JWT token for authenticated requests
            report_type: Type of report to generate (or "custom")
            custom_query: Natural language query for custom reports
            date_range: Date range for the report
            filters: Additional filters to apply
        """
        # Default date range: last 30 days
        if not date_range:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            date_range = {
                "start": start_date.strftime("%Y-%m-%d"),
                "end": end_date.strftime("%Y-%m-%d")
            }
        
        initial_state = ReportState(
            user_token=user_token,
            report_type=report_type,
            custom_query=custom_query,
            date_range=date_range,
            filters=filters or {},
            degraded_mode=False,
            degraded_reasons=[],
        )
        
        try:
            result = await self.workflow.ainvoke(initial_state)
            
            return {
                "success": True,
                "report_type": report_type,
                "title": result.get("report_title"),
                "summary": result.get("report_summary"),
                "date_range": date_range,
                "metrics": result.get("metrics", {}),
                "charts": result.get("charts", []),
                "insights": result.get("insights", []),
                "recommendations": result.get("recommendations", []),
                "sections": result.get("sections", []),
                "generated_at": datetime.now().isoformat(),
                "error": result.get("error"),
                "degraded_mode": result.get("degraded_mode", False),
                "degraded_reason": "; ".join(result.get("degraded_reasons", [])) if result.get("degraded_reasons") else None,
            }
        except Exception as e:
            logger.error(f"Error generating report: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _collect_data(self, state: ReportState) -> ReportState:
        """Collect necessary data from CRM based on report type"""
        user_token = state["user_token"]
        report_type = state["report_type"]
        custom_query = state.get("custom_query") or ""
        date_range = state["date_range"]
        
        try:
            template = self.REPORT_TEMPLATES.get(report_type, {})
            data_requirements = template.get("data_requirements", ["deals", "leads", "contacts", "activities"])
            
            # For custom reports, determine data requirements from query
            if report_type == "custom" and custom_query:
                query_lower = custom_query.lower()
                data_requirements = []
                
                if any(word in query_lower for word in ["meeting", "event", "calendar", "appointment", "schedule"]):
                    data_requirements.append("events")
                if any(word in query_lower for word in ["deal", "pipeline", "opportunity", "sale"]):
                    data_requirements.append("deals")
                if any(word in query_lower for word in ["lead", "prospect"]):
                    data_requirements.append("leads")
                if any(word in query_lower for word in ["contact", "person", "people", "customer"]):
                    data_requirements.append("contacts")
                if any(word in query_lower for word in ["task", "activity", "action"]):
                    data_requirements.append("activities")
                
                # Default to all if no specific keywords found
                if not data_requirements:
                    data_requirements = ["deals", "leads", "contacts", "events"]
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {"Authorization": f"Bearer {user_token}"}
                
                # Fetch deals
                if "deals" in data_requirements:
                    deals_response = await client.get(
                        f"{self.backend_url}/api/v1/deals",
                        headers=headers,
                        params={"size": 1000}
                    )
                    deals_response.raise_for_status()
                    deals_data = deals_response.json()
                    state["deals"] = deals_data.get("content", deals_data) if isinstance(deals_data, dict) else deals_data
                    logger.info(f"Collected {len(state['deals'])} deals")
                else:
                    state["deals"] = []
                
                # Fetch leads
                if "leads" in data_requirements:
                    leads_response = await client.get(
                        f"{self.backend_url}/api/v1/leads",
                        headers=headers,
                        params={"size": 1000}
                    )
                    leads_response.raise_for_status()
                    leads_data = leads_response.json()
                    state["leads"] = leads_data.get("content", leads_data) if isinstance(leads_data, dict) else leads_data
                    logger.info(f"Collected {len(state['leads'])} leads")
                else:
                    state["leads"] = []
                
                # Fetch contacts
                if "contacts" in data_requirements:
                    contacts_response = await client.get(
                        f"{self.backend_url}/api/v1/contacts",
                        headers=headers,
                        params={"size": 500}
                    )
                    contacts_response.raise_for_status()
                    contacts_data = contacts_response.json()
                    state["contacts"] = contacts_data.get("content", contacts_data) if isinstance(contacts_data, dict) else contacts_data
                    logger.info(f"Collected {len(state['contacts'])} contacts")
                else:
                    state["contacts"] = []
                
                # Fetch events/meetings
                if "events" in data_requirements or "activities" in data_requirements:
                    try:
                        events_response = await client.get(
                            f"{self.backend_url}/api/v1/events",
                            headers=headers,
                            params={"size": 1000}
                        )
                        events_response.raise_for_status()
                        events_data = events_response.json()
                        state["activities"] = events_data.get("content", events_data) if isinstance(events_data, dict) else events_data
                        logger.info(f"Collected {len(state['activities'])} events/meetings")
                    except Exception as e:
                        logger.warning(f"Could not fetch events: {str(e)}")
                        state["activities"] = []
                else:
                    state["activities"] = []
                
        except Exception as e:
            logger.error(f"Error collecting data: {str(e)}")
            state["error"] = f"Data collection failed: {str(e)}"
            state["deals"] = []
            state["leads"] = []
            state["contacts"] = []
            state["activities"] = []
        
        return state
    
    async def _calculate_metrics(self, state: ReportState) -> ReportState:
        """Calculate key metrics based on collected data"""
        deals = state.get("deals", [])
        leads = state.get("leads", [])
        activities = state.get("activities", [])
        report_type = state["report_type"]
        custom_query = (state.get("custom_query") or "").lower()
        
        metrics = {}
        
        try:
            if report_type == "sales_pipeline":
                metrics = self._calculate_pipeline_metrics(deals)
            elif report_type == "lead_conversion":
                metrics = self._calculate_conversion_metrics(leads, deals)
            elif report_type == "revenue_forecast":
                metrics = self._calculate_revenue_metrics(deals)
            elif report_type == "team_performance":
                metrics = self._calculate_team_metrics(deals)
            elif report_type == "custom":
                # Determine what type of custom report based on query
                if any(word in custom_query for word in ["meeting", "event", "calendar", "appointment"]):
                    metrics = self._calculate_meeting_metrics(activities)
                else:
                    # Generic metrics for other custom reports
                    metrics = {
                        "total_deals": len(deals),
                        "total_leads": len(leads),
                        "total_events": len(activities),
                        "pipeline_value": sum(d.get("value", 0) for d in deals if d.get("stage") not in ["CLOSED_LOST"]),
                        "closed_revenue": sum(d.get("value", 0) for d in deals if d.get("stage") == "CLOSED_WON"),
                    }
            else:
                # Default generic metrics
                metrics = {
                    "total_deals": len(deals),
                    "total_leads": len(leads),
                    "pipeline_value": sum(d.get("value", 0) for d in deals if d.get("stage") not in ["CLOSED_LOST"]),
                    "closed_revenue": sum(d.get("value", 0) for d in deals if d.get("stage") == "CLOSED_WON"),
                }
            
            state["metrics"] = metrics
            logger.info(f"Calculated {len(metrics)} metrics")
            
        except Exception as e:
            logger.error(f"Error calculating metrics: {str(e)}")
            state["metrics"] = {}
        
        return state
    
    def _calculate_pipeline_metrics(self, deals: List[Dict]) -> Dict[str, Any]:
        """Calculate sales pipeline metrics"""
        active_deals = [d for d in deals if d.get("stage") not in ["CLOSED_WON", "CLOSED_LOST"]]
        closed_won = [d for d in deals if d.get("stage") == "CLOSED_WON"]
        closed_lost = [d for d in deals if d.get("stage") == "CLOSED_LOST"]
        
        # Count by stage
        stage_counts = {}
        stage_values = {}
        for deal in active_deals:
            stage = deal.get("stage", "UNKNOWN")
            stage_counts[stage] = stage_counts.get(stage, 0) + 1
            stage_values[stage] = stage_values.get(stage, 0) + deal.get("value", 0)
        
        total_pipeline = sum(d.get("value", 0) for d in active_deals)
        total_closed_won = sum(d.get("value", 0) for d in closed_won)
        total_closed_lost = sum(d.get("value", 0) for d in closed_lost)
        
        win_rate = len(closed_won) / (len(closed_won) + len(closed_lost)) * 100 if (len(closed_won) + len(closed_lost)) > 0 else 0
        avg_deal_size = total_pipeline / len(active_deals) if active_deals else 0
        
        return {
            "pipeline_value": total_pipeline,
            "closed_won_value": total_closed_won,
            "closed_lost_value": total_closed_lost,
            "active_deal_count": len(active_deals),
            "closed_won_count": len(closed_won),
            "closed_lost_count": len(closed_lost),
            "win_rate": round(win_rate, 2),
            "avg_deal_size": round(avg_deal_size, 2),
            "deals_by_stage": stage_counts,
            "value_by_stage": stage_values
        }
    
    def _calculate_conversion_metrics(self, leads: List[Dict], deals: List[Dict]) -> Dict[str, Any]:
        """Calculate lead conversion metrics"""
        qualified_leads = [l for l in leads if l.get("status") == "QUALIFIED"]
        converted_leads = [l for l in leads if l.get("status") == "CONVERTED"]
        
        conversion_rate = len(converted_leads) / len(leads) * 100 if leads else 0
        qualification_rate = len(qualified_leads) / len(leads) * 100 if leads else 0
        
        # Lead sources
        sources = {}
        for lead in leads:
            source = lead.get("source", "Unknown")
            sources[source] = sources.get(source, 0) + 1
        
        return {
            "total_leads": len(leads),
            "qualified_leads": len(qualified_leads),
            "converted_leads": len(converted_leads),
            "conversion_rate": round(conversion_rate, 2),
            "qualification_rate": round(qualification_rate, 2),
            "leads_by_source": sources
        }
    
    def _calculate_revenue_metrics(self, deals: List[Dict]) -> Dict[str, Any]:
        """Calculate revenue and forecast metrics"""
        active_deals = [d for d in deals if d.get("stage") not in ["CLOSED_WON", "CLOSED_LOST"]]
        closed_won = [d for d in deals if d.get("stage") == "CLOSED_WON"]
        
        forecasted_revenue = sum(d.get("weightedValue", d.get("value", 0) * d.get("probability", 50) / 100) for d in active_deals)
        closed_revenue = sum(d.get("value", 0) for d in closed_won)
        
        return {
            "forecasted_revenue": forecasted_revenue,
            "closed_revenue": closed_revenue,
            "pipeline_value": sum(d.get("value", 0) for d in active_deals),
            "total_deals": len(active_deals),
            "closed_deals": len(closed_won)
        }
    
    def _calculate_team_metrics(self, deals: List[Dict]) -> Dict[str, Any]:
        """Calculate team performance metrics"""
        # Group by owner
        rep_stats = {}
        for deal in deals:
            owner = deal.get("ownerName", deal.get("ownerId", "Unknown"))
            if owner not in rep_stats:
                rep_stats[owner] = {
                    "deals_count": 0,
                    "pipeline_value": 0,
                    "closed_won": 0,
                    "closed_won_value": 0
                }
            
            rep_stats[owner]["deals_count"] += 1
            if deal.get("stage") == "CLOSED_WON":
                rep_stats[owner]["closed_won"] += 1
                rep_stats[owner]["closed_won_value"] += deal.get("value", 0)
            elif deal.get("stage") not in ["CLOSED_LOST"]:
                rep_stats[owner]["pipeline_value"] += deal.get("value", 0)
        
        return {
            "team_size": len(rep_stats),
            "rep_performance": rep_stats
        }
    
    def _calculate_meeting_metrics(self, events: List[Dict]) -> Dict[str, Any]:
        """Calculate meeting and event metrics"""
        from datetime import datetime
        
        total_events = len(events)
        
        # Count by type
        events_by_type = {}
        for event in events:
            event_type = event.get("eventType", "Unknown")
            events_by_type[event_type] = events_by_type.get(event_type, 0) + 1
        
        # Count by location
        events_by_location = {}
        for event in events:
            location = event.get("location", "No Location")
            if location:
                events_by_location[location] = events_by_location.get(location, 0) + 1
        
        # Count upcoming vs past
        now = datetime.now()
        upcoming = 0
        past = 0
        
        for event in events:
            try:
                start_time = event.get("startTime", "")
                if start_time:
                    event_date = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
                    if event_date > now:
                        upcoming += 1
                    else:
                        past += 1
            except Exception:
                pass
        
        # Count by related entity
        events_with_contacts = sum(1 for e in events if e.get("relatedEntityType") == "Contact")
        events_with_deals = sum(1 for e in events if e.get("relatedEntityType") == "Deal")
        events_with_leads = sum(1 for e in events if e.get("relatedEntityType") == "Lead")
        
        return {
            "total_events": total_events,
            "events_by_type": events_by_type,
            "events_by_location": events_by_location,
            "upcoming_events": upcoming,
            "past_events": past,
            "events_with_contacts": events_with_contacts,
            "events_with_deals": events_with_deals,
            "events_with_leads": events_with_leads,
        }
    
    async def _generate_charts(self, state: ReportState) -> ReportState:
        """Generate chart configurations for visualization"""
        metrics = state.get("metrics", {})
        report_type = state["report_type"]
        
        charts = []
        
        try:
            if report_type == "sales_pipeline":
                # Pipeline by stage chart
                if "deals_by_stage" in metrics:
                    charts.append({
                        "type": "bar",
                        "title": "Deals by Stage",
                        "data": metrics["deals_by_stage"],
                        "xAxis": "Stage",
                        "yAxis": "Count"
                    })
                
                # Value by stage chart
                if "value_by_stage" in metrics:
                    charts.append({
                        "type": "bar",
                        "title": "Pipeline Value by Stage",
                        "data": metrics["value_by_stage"],
                        "xAxis": "Stage",
                        "yAxis": "Value ($)"
                    })
            
            elif report_type == "lead_conversion":
                # Funnel chart
                charts.append({
                    "type": "funnel",
                    "title": "Lead Conversion Funnel",
                    "data": {
                        "Total Leads": metrics.get("total_leads", 0),
                        "Qualified": metrics.get("qualified_leads", 0),
                        "Converted": metrics.get("converted_leads", 0)
                    }
                })
                
                # Sources pie chart
                if "leads_by_source" in metrics:
                    charts.append({
                        "type": "pie",
                        "title": "Leads by Source",
                        "data": metrics["leads_by_source"]
                    })
            
            elif report_type == "custom":
                # Meeting/Event charts
                if "events_by_type" in metrics:
                    charts.append({
                        "type": "pie",
                        "title": "Events by Type",
                        "data": metrics["events_by_type"]
                    })
                
                if "upcoming_events" in metrics and "past_events" in metrics:
                    charts.append({
                        "type": "bar",
                        "title": "Events Timeline",
                        "data": {
                            "Past": metrics["past_events"],
                            "Upcoming": metrics["upcoming_events"]
                        },
                        "xAxis": "Timeline",
                        "yAxis": "Count"
                    })
                
                if "events_by_location" in metrics:
                    charts.append({
                        "type": "bar",
                        "title": "Events by Location",
                        "data": metrics["events_by_location"],
                        "xAxis": "Location",
                        "yAxis": "Count"
                    })
            
            state["charts"] = charts
            logger.info(f"Generated {len(charts)} chart configurations")
            
        except Exception as e:
            logger.error(f"Error generating charts: {str(e)}")
            state["charts"] = []
        
        return state
    
    async def _analyze_insights(self, state: ReportState) -> ReportState:
        """Use AI to analyze data and generate insights"""
        metrics = state.get("metrics", {})
        report_type = state["report_type"]
        custom_query = state.get("custom_query") or ""
        
        try:
            # Determine report focus
            is_meeting_report = "total_events" in metrics or any(
                word in custom_query.lower() for word in ["meeting", "event", "calendar", "appointment"]
            )
            
            # Build context for LLM
            if is_meeting_report:
                context = f"""
You are analyzing a CRM meeting/event report.

Key Metrics:
{self._format_metrics_for_llm(metrics)}

Task: Provide 3-5 key insights and 3-5 actionable recommendations based on this meeting data.
Focus on meeting patterns, engagement levels, scheduling effectiveness, and opportunities to improve.

Format your response as:
INSIGHTS:
- [insight 1]
- [insight 2]
...

RECOMMENDATIONS:
- [recommendation 1]
- [recommendation 2]
...
"""
            else:
                context = f"""
You are analyzing a CRM report. Report type: {report_type}

Key Metrics:
{self._format_metrics_for_llm(metrics)}

Task: Provide 3-5 key insights and 3-5 actionable recommendations based on this data.
Focus on patterns, trends, risks, and opportunities.

Format your response as:
INSIGHTS:
- [insight 1]
- [insight 2]
...

RECOMMENDATIONS:
- [recommendation 1]
- [recommendation 2]
...
"""
            
            if custom_query:
                context += f"\n\nUser Question: {custom_query}\n"
            
            response = await self.llm.ainvoke(context)
            content = response.content
            
            # Parse insights and recommendations
            insights = []
            recommendations = []
            
            lines = content.split('\n')
            current_section = None
            
            for line in lines:
                line = line.strip()
                if 'INSIGHTS:' in line.upper():
                    current_section = 'insights'
                elif 'RECOMMENDATIONS:' in line.upper():
                    current_section = 'recommendations'
                elif line.startswith('- ') or line.startswith('* '):
                    text = line[2:].strip()
                    if text and current_section == 'insights':
                        insights.append(text)
                    elif text and current_section == 'recommendations':
                        recommendations.append(text)
            
            if not insights:
                insights = self._build_fallback_insights(report_type, metrics)
            if not recommendations:
                recommendations = self._build_fallback_recommendations(report_type, metrics)

            state["insights"] = insights[:5]  # Max 5
            state["recommendations"] = recommendations[:5]  # Max 5
            
            logger.info(f"Generated {len(insights)} insights and {len(recommendations)} recommendations")
            
        except Exception as e:
            logger.error(f"Error analyzing insights: {str(e)}")
            state["degraded_mode"] = True
            reasons = state.get("degraded_reasons", [])
            reasons.append("AI report insights unavailable; using metric-based fallback insights.")
            state["degraded_reasons"] = reasons
            state["insights"] = self._build_fallback_insights(report_type, metrics)
            state["recommendations"] = self._build_fallback_recommendations(report_type, metrics)
        
        return state
    
    def _format_metrics_for_llm(self, metrics: Dict[str, Any]) -> str:
        """Format metrics in a readable way for LLM"""
        lines = []
        for key, value in metrics.items():
            if isinstance(value, dict):
                lines.append(f"{key}:")
                for k, v in value.items():
                    lines.append(f"  - {k}: {v}")
            else:
                lines.append(f"{key}: {value}")
        return '\n'.join(lines)
    
    async def _create_report(self, state: ReportState) -> ReportState:
        """Create final report structure"""
        report_type = state["report_type"]
        template = self.REPORT_TEMPLATES.get(report_type, {})
        
        state["report_title"] = template.get("title", f"{report_type.replace('_', ' ').title()} Report")
        
        # Generate summary using AI
        try:
            metrics_summary = self._format_metrics_for_llm(state.get("metrics", {}))
            insights_text = '\n'.join(f"- {i}" for i in state.get("insights", []))
            
            summary_prompt = f"""
Write a brief 2-3 sentence executive summary for this report.

Report: {state["report_title"]}
Key Metrics: {metrics_summary}
Top Insights: {insights_text}

Make it concise and actionable.
"""
            response = await self.llm.ainvoke(summary_prompt)
            summary = response.content.strip()
            state["report_summary"] = summary or self._build_fallback_summary(
                state["report_title"],
                state.get("metrics", {}),
                state.get("insights", []),
            )
        except Exception as e:
            logger.error(f"Error generating summary: {str(e)}")
            state["degraded_mode"] = True
            reasons = state.get("degraded_reasons", [])
            reasons.append("AI executive summary unavailable; using metric-based fallback summary.")
            state["degraded_reasons"] = reasons
            state["report_summary"] = self._build_fallback_summary(
                state["report_title"],
                state.get("metrics", {}),
                state.get("insights", []),
            )
        
        # Create sections
        state["sections"] = [
            {
                "title": "Key Metrics",
                "type": "metrics",
                "content": state.get("metrics", {})
            },
            {
                "title": "Visualizations",
                "type": "charts",
                "content": state.get("charts", [])
            },
            {
                "title": "Insights",
                "type": "insights",
                "content": state.get("insights", [])
            },
            {
                "title": "Recommendations",
                "type": "recommendations",
                "content": state.get("recommendations", [])
            }
        ]
        
        return state


# Create global instance
def get_report_agent() -> ReportAgent:
    """Get or create report agent instance"""
    return ReportAgent(backend_url="http://crm-backend:8080")
