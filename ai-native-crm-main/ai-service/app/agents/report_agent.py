"""
AI-Powered CRM Reporting Agent
"""

import logging
from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, TypedDict

import httpx
from langchain_groq import ChatGroq
from langgraph.graph import END, StateGraph

from app.config import settings

logger = logging.getLogger(__name__)


def _template(
    *,
    title: str,
    category: str,
    description: str,
    data_requirements: List[str],
    metrics: List[str],
    display_modes: List[str],
    default_mode: str = "SUMMARY",
) -> Dict[str, Any]:
    return {
        "title": title,
        "category": category,
        "description": description,
        "data_requirements": data_requirements,
        "metrics": metrics,
        "display_modes": display_modes,
        "default_mode": default_mode,
    }


class ReportState(TypedDict, total=False):
    user_token: str
    report_type: str
    report_mode: str
    custom_query: Optional[str]
    date_range: Dict[str, str]
    filters: Optional[Dict[str, Any]]
    deals: List[Dict[str, Any]]
    leads: List[Dict[str, Any]]
    contacts: List[Dict[str, Any]]
    companies: List[Dict[str, Any]]
    campaigns: List[Dict[str, Any]]
    cases: List[Dict[str, Any]]
    invoices: List[Dict[str, Any]]
    products: List[Dict[str, Any]]
    quotes: List[Dict[str, Any]]
    tasks: List[Dict[str, Any]]
    events: List[Dict[str, Any]]
    users: List[Dict[str, Any]]
    activities: List[Dict[str, Any]]
    metrics: Dict[str, Any]
    detail_rows: List[Dict[str, Any]]
    summary_groups: List[Dict[str, Any]]
    matrix: Dict[str, Any]
    charts: List[Dict[str, Any]]
    insights: List[str]
    recommendations: List[str]
    report_title: str
    report_summary: str
    sections: List[Dict[str, Any]]
    error: Optional[str]
    degraded_mode: bool
    degraded_reasons: List[str]


class ReportAgent:
    REPORT_TEMPLATES: Dict[str, Dict[str, Any]] = {
        "sales_pipeline_summary": _template(title="Sales Pipeline Summary", category="Executive / Overview", description="Top-level pipeline visibility by stage, value, and owner.", data_requirements=["deals", "companies"], metrics=["pipeline_value", "weighted_pipeline", "open_deals", "win_rate"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "revenue_summary_report": _template(title="Revenue Summary Report", category="Executive / Overview", description="Closed revenue, weighted forecast, and pipeline movement.", data_requirements=["deals"], metrics=["closed_revenue", "weighted_pipeline", "forecast_vs_actual"], display_modes=["SUMMARY", "TABULAR"]),
        "deals_closing_this_month": _template(title="Deals Closing This Month", category="Executive / Overview", description="Deals expected or actually closed in the current month.", data_requirements=["deals", "companies"], metrics=["closing_deals", "closing_value", "won_value", "lost_value"], display_modes=["SUMMARY", "TABULAR"]),
        "deals_lost_this_month": _template(title="Deals Lost This Month", category="Executive / Overview", description="Closed-lost deals from the current month with owner and value context.", data_requirements=["deals", "companies"], metrics=["lost_deals", "lost_value", "avg_loss"], display_modes=["SUMMARY", "TABULAR"]),
        "sales_trend_report": _template(title="Sales Trend Report", category="Executive / Overview", description="Trend view of won revenue and created pipeline over time.", data_requirements=["deals"], metrics=["won_revenue_trend", "pipeline_trend"], display_modes=["SUMMARY", "TABULAR"]),
        "forecast_summary_report": _template(title="Forecast Summary Report", category="Executive / Overview", description="Forecast-style view of weighted pipeline, closed value, and quota posture.", data_requirements=["deals", "users"], metrics=["weighted_forecast", "closed_value", "quota_gap"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "deals_by_stage": _template(title="Deals by Stage", category="Deals (Sales)", description="Grouped view of deals by stage with counts and value.", data_requirements=["deals"], metrics=["deal_count", "deal_value_by_stage"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "deals_by_owner": _template(title="Deals by Owner", category="Deals (Sales)", description="Deals grouped by owner / sales rep.", data_requirements=["deals"], metrics=["deal_count_by_owner", "value_by_owner"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "deals_by_closing_date": _template(title="Deals by Closing Date", category="Deals (Sales)", description="Deals grouped across closing periods.", data_requirements=["deals"], metrics=["closing_schedule", "value_by_close_period"], display_modes=["SUMMARY", "TABULAR"]),
        "won_deals_report": _template(title="Won Deals Report", category="Deals (Sales)", description="Closed-won deal performance by owner and value.", data_requirements=["deals", "companies"], metrics=["won_count", "won_value", "avg_win_value"], display_modes=["SUMMARY", "TABULAR"]),
        "lost_deals_report": _template(title="Lost Deals Report", category="Deals (Sales)", description="Closed-lost deal performance by owner and source.", data_requirements=["deals", "companies"], metrics=["lost_count", "lost_value", "avg_loss_value"], display_modes=["SUMMARY", "TABULAR"]),
        "deals_by_type": _template(title="Deals by Type", category="Deals (Sales)", description="Deal volume and value by opportunity type.", data_requirements=["deals"], metrics=["deal_count_by_type", "value_by_type"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "deals_by_industry": _template(title="Deals by Industry", category="Deals (Sales)", description="Deal distribution by company industry.", data_requirements=["deals", "companies"], metrics=["deal_count_by_industry", "value_by_industry"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "deals_by_lead_source": _template(title="Deals by Lead Source", category="Deals (Sales)", description="Deal value grouped by originating lead source.", data_requirements=["deals"], metrics=["deal_count_by_source", "value_by_source"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "pipeline_value_report": _template(title="Pipeline Value Report", category="Deals (Sales)", description="Open pipeline value by stage, owner, and territory.", data_requirements=["deals", "companies"], metrics=["pipeline_value", "weighted_pipeline", "pipeline_by_stage"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "leads_by_source": _template(title="Leads by Source", category="Lead Reports", description="Lead distribution and quality by source.", data_requirements=["leads"], metrics=["lead_count_by_source", "lead_value_by_source"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "leads_by_status": _template(title="Leads by Status", category="Lead Reports", description="Lead lifecycle status report.", data_requirements=["leads"], metrics=["lead_count_by_status"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "leads_by_industry": _template(title="Leads by Industry", category="Lead Reports", description="Lead counts and value grouped by industry.", data_requirements=["leads"], metrics=["lead_count_by_industry", "lead_value_by_industry"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "leads_converted_report": _template(title="Leads Converted Report", category="Lead Reports", description="Converted leads with owner, source, and value context.", data_requirements=["leads"], metrics=["converted_leads", "conversion_rate"], display_modes=["SUMMARY", "TABULAR"]),
        "leads_not_contacted": _template(title="Leads Not Contacted", category="Lead Reports", description="Leads missing first outreach or recent touch.", data_requirements=["leads"], metrics=["not_contacted_count", "days_since_last_touch"], display_modes=["SUMMARY", "TABULAR"]),
        "leads_by_owner": _template(title="Leads by Owner", category="Lead Reports", description="Lead distribution by assigned owner.", data_requirements=["leads"], metrics=["lead_count_by_owner", "lead_value_by_owner"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "leads_created_over_time": _template(title="Leads Created Over Time", category="Lead Reports", description="Lead creation trend across the selected period.", data_requirements=["leads"], metrics=["lead_creation_trend"], display_modes=["SUMMARY", "TABULAR"]),
        "lead_to_deal_conversion_report": _template(title="Lead to Deal Conversion Report", category="Conversion Reports", description="Overall lead-to-deal movement and conversion performance.", data_requirements=["leads", "deals"], metrics=["conversion_rate", "qualified_rate", "deal_count"], display_modes=["SUMMARY", "TABULAR"]),
        "lead_conversion_funnel": _template(title="Lead Conversion Funnel", category="Conversion Reports", description="Funnel view from total leads to qualified to converted.", data_requirements=["leads"], metrics=["funnel_totals", "conversion_rate"], display_modes=["SUMMARY", "MATRIX"]),
        "conversion_by_source": _template(title="Conversion by Source", category="Conversion Reports", description="Lead conversion outcomes grouped by source.", data_requirements=["leads"], metrics=["conversion_rate_by_source"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "conversion_by_sales_rep": _template(title="Conversion by Sales Rep", category="Conversion Reports", description="Lead conversion outcomes grouped by owner.", data_requirements=["leads"], metrics=["conversion_rate_by_owner"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "activities_by_type": _template(title="Activities by Type", category="Activity Reports", description="Calls, meetings, tasks, and events grouped by type.", data_requirements=["events", "tasks"], metrics=["activities_by_type"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "activities_by_user": _template(title="Activities by User", category="Activity Reports", description="Activity volume grouped by user.", data_requirements=["events", "tasks"], metrics=["activities_by_user"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "calls_made_report": _template(title="Calls Made Report", category="Activity Reports", description="Tracked call activity by owner and schedule.", data_requirements=["events"], metrics=["calls_made"], display_modes=["SUMMARY", "TABULAR"]),
        "meetings_scheduled_report": _template(title="Meetings Scheduled Report", category="Activity Reports", description="Meetings and demos scheduled in the selected period.", data_requirements=["events"], metrics=["meetings_scheduled"], display_modes=["SUMMARY", "TABULAR"]),
        "tasks_completed_report": _template(title="Tasks Completed", category="Activity Reports", description="Task completion productivity by user.", data_requirements=["tasks"], metrics=["tasks_completed"], display_modes=["SUMMARY", "TABULAR"]),
        "overdue_activities": _template(title="Overdue Activities", category="Activity Reports", description="Overdue tasks and unfinished activities requiring attention.", data_requirements=["tasks"], metrics=["overdue_activities"], display_modes=["SUMMARY", "TABULAR"]),
        "last_activity_by_record": _template(title="Last Activity by Record", category="Activity Reports", description="Latest activity attached to leads, contacts, deals, and accounts.", data_requirements=["events", "tasks"], metrics=["records_with_activity"], display_modes=["SUMMARY", "TABULAR"]),
        "accounts_by_industry": _template(title="Accounts by Industry", category="Account & Contact Reports", description="Account counts and revenue grouped by industry.", data_requirements=["companies"], metrics=["accounts_by_industry", "revenue_by_industry"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "accounts_by_owner": _template(title="Accounts by Owner", category="Account & Contact Reports", description="Account ownership distribution and revenue exposure.", data_requirements=["companies"], metrics=["accounts_by_owner", "revenue_by_owner"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "contacts_by_source": _template(title="Contacts by Source", category="Account & Contact Reports", description="Contact acquisition sources and counts.", data_requirements=["contacts"], metrics=["contacts_by_source"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "contacts_created_over_time": _template(title="Contacts Created Over Time", category="Account & Contact Reports", description="Contact creation trend over time.", data_requirements=["contacts"], metrics=["contacts_created_trend"], display_modes=["SUMMARY", "TABULAR"]),
        "contact_activity_report": _template(title="Contact Activity Report", category="Account & Contact Reports", description="Latest touch and activity attached to contacts.", data_requirements=["contacts", "events", "tasks"], metrics=["contacts_with_activity", "recent_touch_count"], display_modes=["SUMMARY", "TABULAR"]),
        "campaign_roi_report": _template(title="Campaign ROI Report", category="Campaign / Marketing Reports", description="Campaign ROI and return performance.", data_requirements=["campaigns"], metrics=["campaign_roi", "actual_revenue", "budget"], display_modes=["SUMMARY", "TABULAR"]),
        "leads_by_campaign": _template(title="Leads by Campaign", category="Campaign / Marketing Reports", description="Lead and pipeline contribution grouped by campaign.", data_requirements=["campaigns", "leads"], metrics=["attributed_leads", "attributed_pipeline"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "campaign_revenue_report": _template(title="Campaign Revenue Report", category="Campaign / Marketing Reports", description="Expected and actual revenue by campaign.", data_requirements=["campaigns"], metrics=["expected_revenue", "actual_revenue"], display_modes=["SUMMARY", "TABULAR"]),
        "campaign_status_report": _template(title="Campaign Status Report", category="Campaign / Marketing Reports", description="Campaign lifecycle status overview.", data_requirements=["campaigns"], metrics=["campaigns_by_status"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "email_campaign_performance": _template(title="Email Campaign Performance", category="Campaign / Marketing Reports", description="Email-specific campaign performance and contribution.", data_requirements=["campaigns"], metrics=["email_campaign_roi", "email_campaign_conversions"], display_modes=["SUMMARY", "TABULAR"]),
        "products_by_revenue": _template(title="Products by Revenue", category="Product & Sales Inventory Reports", description="Revenue performance by product based on quotes and invoices.", data_requirements=["products", "quotes", "invoices"], metrics=["product_revenue", "units_sold"], display_modes=["SUMMARY", "TABULAR"]),
        "products_sold_report": _template(title="Products Sold Report", category="Product & Sales Inventory Reports", description="Product quantities sold across quote and invoice line items.", data_requirements=["products", "quotes", "invoices"], metrics=["units_sold", "quote_line_count", "invoice_line_count"], display_modes=["SUMMARY", "TABULAR"]),
        "quotes_report": _template(title="Quotes Report", category="Product & Sales Inventory Reports", description="Quote status, value, and validity overview.", data_requirements=["quotes"], metrics=["quotes_by_status", "quote_value"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "sales_orders_report": _template(title="Sales Orders Report", category="Product & Sales Inventory Reports", description="Placeholder for sales order reporting until sales orders are added to the CRM.", data_requirements=[], metrics=["availability"], display_modes=["SUMMARY"]),
        "invoices_report": _template(title="Invoices Report", category="Product & Sales Inventory Reports", description="Invoice status, payment progress, and totals.", data_requirements=["invoices"], metrics=["invoices_by_status", "invoice_total", "amount_paid"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "purchase_orders_report": _template(title="Purchase Orders Report", category="Product & Sales Inventory Reports", description="Placeholder for purchase order reporting until procurement entities are added.", data_requirements=[], metrics=["availability"], display_modes=["SUMMARY"]),
        "sales_forecast_by_user": _template(title="Sales Forecast by User", category="Forecast Reports", description="Forecast rollup by owner with quota and attainment.", data_requirements=["deals", "users"], metrics=["forecast_by_owner", "quota_vs_achievement"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "sales_forecast_by_territory": _template(title="Sales Forecast by Territory", category="Forecast Reports", description="Forecast rollup by territory with pipeline and closed revenue.", data_requirements=["deals", "companies", "users"], metrics=["forecast_by_territory"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "forecast_vs_actual": _template(title="Forecast vs Actual", category="Forecast Reports", description="Monthly comparison of weighted forecast versus closed actual value.", data_requirements=["deals"], metrics=["forecast_vs_actual"], display_modes=["SUMMARY", "TABULAR"]),
        "quota_vs_achievement": _template(title="Quota vs Achievement", category="Forecast Reports", description="Quota attainment by rep based on closed value and forecast.", data_requirements=["deals", "users"], metrics=["quota_vs_achievement"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "cases_by_status": _template(title="Cases by Status", category="Case / Support Reports", description="Support case distribution by status.", data_requirements=["cases"], metrics=["cases_by_status"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "cases_by_priority": _template(title="Cases by Priority", category="Case / Support Reports", description="Support case distribution by priority.", data_requirements=["cases"], metrics=["cases_by_priority"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "cases_by_owner": _template(title="Cases by Owner", category="Case / Support Reports", description="Support workload grouped by owner.", data_requirements=["cases"], metrics=["cases_by_owner"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "open_vs_closed_cases": _template(title="Open vs Closed Cases", category="Case / Support Reports", description="Open and closed case trend and split.", data_requirements=["cases"], metrics=["open_cases", "closed_cases"], display_modes=["SUMMARY", "TABULAR"]),
        "cases_by_category": _template(title="Cases by Category", category="Case / Support Reports", description="Case grouping by source/category proxy.", data_requirements=["cases"], metrics=["cases_by_category"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "escalated_cases": _template(title="Escalated Cases", category="Case / Support Reports", description="Escalated and breached support cases requiring action.", data_requirements=["cases"], metrics=["escalated_cases", "breached_cases"], display_modes=["SUMMARY", "TABULAR"]),
        "sales_by_territory": _template(title="Sales by Territory", category="Territory / Performance Reports", description="Pipeline, forecast, and won value by territory.", data_requirements=["deals", "companies", "users"], metrics=["sales_by_territory"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "performance_by_sales_rep": _template(title="Performance by Sales Rep", category="Territory / Performance Reports", description="Rep-level revenue, pipeline, and win performance.", data_requirements=["deals", "users"], metrics=["performance_by_sales_rep"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "revenue_by_region": _template(title="Revenue by Region", category="Territory / Performance Reports", description="Revenue grouped by region/country derived from accounts.", data_requirements=["deals", "companies"], metrics=["revenue_by_region"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "deals_by_territory": _template(title="Deals by Territory", category="Territory / Performance Reports", description="Deal counts and values grouped by territory.", data_requirements=["deals", "companies"], metrics=["deals_by_territory"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "user_activity_report": _template(title="User Activity Report", category="System / Admin Reports", description="Activity distribution grouped by user.", data_requirements=["events", "tasks", "users"], metrics=["activities_by_user"], display_modes=["SUMMARY", "TABULAR", "MATRIX"]),
        "login_history_report": _template(title="Login History", category="System / Admin Reports", description="Latest login visibility for current workspace users.", data_requirements=["users"], metrics=["recent_logins"], display_modes=["SUMMARY", "TABULAR"]),
        "record_modification_report": _template(title="Record Modification Report", category="System / Admin Reports", description="Recently modified CRM records across modules.", data_requirements=["deals", "leads", "contacts", "companies", "campaigns", "cases", "quotes", "invoices"], metrics=["recent_modifications"], display_modes=["SUMMARY", "TABULAR"]),
        "audit_log_report": _template(title="Audit Log Report", category="System / Admin Reports", description="Audit log visibility placeholder until a dedicated audit-log stream is added.", data_requirements=[], metrics=["availability"], display_modes=["SUMMARY"]),
    }

    def __init__(self, backend_url: str = "http://localhost:8080"):
        self.backend_url = backend_url
        self.llm = ChatGroq(
            groq_api_key=settings.GROQ_API_KEY,
            model_name=settings.CHAT_MODEL,
            temperature=0.3,
            max_tokens=4000,
        )
        self.workflow = self._build_workflow()
        logger.info("Report Agent initialized")

    def _build_workflow(self) -> StateGraph:
        workflow = StateGraph(ReportState)
        workflow.add_node("collect_data", self._collect_data)
        workflow.add_node("calculate_metrics", self._calculate_metrics)
        workflow.add_node("generate_charts", self._generate_charts)
        workflow.add_node("analyze_insights", self._analyze_insights)
        workflow.add_node("create_report", self._create_report)
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
        report_type: str = "sales_pipeline_summary",
        report_mode: str = "SUMMARY",
        custom_query: Optional[str] = None,
        date_range: Optional[Dict[str, str]] = None,
        filters: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        if not date_range:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            date_range = {
                "start": start_date.strftime("%Y-%m-%d"),
                "end": end_date.strftime("%Y-%m-%d"),
            }

        initial_state: ReportState = {
            "user_token": user_token,
            "report_type": report_type,
            "report_mode": (report_mode or "SUMMARY").upper(),
            "custom_query": custom_query,
            "date_range": date_range,
            "filters": filters or {},
            "degraded_mode": False,
            "degraded_reasons": [],
        }

        try:
            result = await self.workflow.ainvoke(initial_state)
            return {
                "success": True,
                "report_type": report_type,
                "report_mode": result.get("report_mode", "SUMMARY"),
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
        except Exception as exc:
            logger.error("Error generating report: %s", exc)
            return {
                "success": False,
                "report_type": report_type,
                "report_mode": report_mode,
                "title": "",
                "summary": "",
                "date_range": date_range,
                "metrics": {},
                "charts": [],
                "insights": [],
                "recommendations": [],
                "sections": [],
                "generated_at": datetime.now().isoformat(),
                "error": str(exc),
                "degraded_mode": True,
                "degraded_reason": str(exc),
            }

    @staticmethod
    def _format_currency(value: Any) -> str:
        try:
            return f"${float(value or 0):,.0f}"
        except (TypeError, ValueError):
            return "$0"

    @staticmethod
    def _safe_float(value: Any) -> float:
        try:
            return float(value or 0)
        except (TypeError, ValueError):
            return 0.0

    @staticmethod
    def _normalize_text(value: Any, fallback: str = "Unknown") -> str:
        text = str(value or "").strip()
        return text if text else fallback

    @staticmethod
    def _parse_date_boundary(value: Optional[str]) -> Optional[date]:
        if not value:
            return None
        try:
            return datetime.fromisoformat(value).date()
        except ValueError:
            try:
                return date.fromisoformat(value)
            except ValueError:
                return None

    @staticmethod
    def _coerce_item_date(value: Any) -> Optional[date]:
        if value in (None, ""):
            return None
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, date):
            return value
        if isinstance(value, str):
            normalized = value.replace("Z", "+00:00")
            try:
                return datetime.fromisoformat(normalized).date()
            except ValueError:
                try:
                    return date.fromisoformat(value)
                except ValueError:
                    return None
        return None

    @staticmethod
    def _coerce_datetime(value: Any) -> Optional[datetime]:
        if value in (None, ""):
            return None
        if isinstance(value, datetime):
            return value
        if isinstance(value, date):
            return datetime.combine(value, datetime.min.time())
        if isinstance(value, str):
            normalized = value.replace("Z", "+00:00")
            try:
                return datetime.fromisoformat(normalized)
            except ValueError:
                try:
                    parsed_date = date.fromisoformat(value)
                    return datetime.combine(parsed_date, datetime.min.time())
                except ValueError:
                    return None
        return None

    def _matches_date_range(self, item: Dict[str, Any], date_fields: List[str], date_range: Dict[str, str]) -> bool:
        start_date = self._parse_date_boundary(date_range.get("start"))
        end_date = self._parse_date_boundary(date_range.get("end"))
        if not start_date and not end_date:
            return True
        item_dates = [
            parsed_date
            for parsed_date in (self._coerce_item_date(item.get(field)) for field in date_fields)
            if parsed_date is not None
        ]
        if not item_dates:
            return False
        for item_date in item_dates:
            if start_date and item_date < start_date:
                continue
            if end_date and item_date > end_date:
                continue
            return True
        return False

    @staticmethod
    def _matches_filters(item: Dict[str, Any], filters: Optional[Dict[str, Any]]) -> bool:
        if not filters:
            return True
        for key, expected in filters.items():
            if expected in (None, ""):
                continue
            actual = item.get(key)
            if isinstance(expected, list):
                allowed = {str(value).lower() for value in expected}
                if str(actual).lower() not in allowed:
                    return False
                continue
            if isinstance(expected, str):
                if str(actual).lower() != expected.lower():
                    return False
                continue
            if actual != expected:
                return False
        return True

    def _apply_dataset_filters(
        self,
        items: List[Dict[str, Any]],
        date_fields: List[str],
        date_range: Dict[str, str],
        filters: Optional[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        return [
            item
            for item in items
            if self._matches_date_range(item, date_fields, date_range)
            and self._matches_filters(item, filters)
        ]

    def _record_degraded_reason(self, state: ReportState, reason: str) -> None:
        state["degraded_mode"] = True
        reasons = state.get("degraded_reasons", [])
        reasons.append(reason)
        state["degraded_reasons"] = reasons

    async def _fetch_collection(
        self,
        client: httpx.AsyncClient,
        headers: Dict[str, str],
        endpoint: str,
        size: int = 1000,
    ) -> List[Dict[str, Any]]:
        response = await client.get(
            f"{self.backend_url}{endpoint}",
            headers=headers,
            params={"size": size},
        )
        response.raise_for_status()
        payload = response.json()
        if isinstance(payload, dict):
            if isinstance(payload.get("content"), list):
                return payload["content"]
            if isinstance(payload.get("items"), list):
                return payload["items"]
        if isinstance(payload, list):
            return payload
        return []

    def _infer_custom_requirements(self, custom_query: str) -> List[str]:
        query = (custom_query or "").lower()
        requirements: List[str] = []
        keyword_map = {
            "deals": ["deal", "pipeline", "opportunity", "sale", "revenue", "forecast"],
            "leads": ["lead", "prospect", "conversion"],
            "contacts": ["contact", "person", "customer"],
            "companies": ["account", "company", "industry", "region", "territory"],
            "campaigns": ["campaign", "marketing", "roi", "email campaign"],
            "cases": ["case", "support", "ticket", "sla"],
            "invoices": ["invoice", "billing", "payment"],
            "quotes": ["quote", "proposal"],
            "products": ["product", "inventory", "sku"],
            "tasks": ["task", "todo", "activity"],
            "events": ["meeting", "event", "calendar", "call", "appointment"],
            "users": ["rep", "owner", "salesperson", "territory", "quota", "user", "login"],
        }
        for requirement, keywords in keyword_map.items():
            if any(keyword in query for keyword in keywords):
                requirements.append(requirement)
        if not requirements:
            return ["deals", "leads", "companies", "contacts", "campaigns", "cases", "events", "tasks"]
        return requirements

    async def _collect_data(self, state: ReportState) -> ReportState:
        report_type = state["report_type"]
        custom_query = state.get("custom_query") or ""
        template = self.REPORT_TEMPLATES.get(report_type, {})
        data_requirements = template.get("data_requirements", [])
        if report_type == "custom":
            data_requirements = self._infer_custom_requirements(custom_query)

        date_range = state["date_range"]
        filters = state.get("filters") or {}
        headers = {"Authorization": f"Bearer {state['user_token']}"}
        dataset_date_fields = {
            "deals": ["actualCloseDate", "expectedCloseDate", "createdAt", "updatedAt"],
            "leads": ["createdAt", "updatedAt", "lastContactDate", "lastContact"],
            "contacts": ["createdAt", "updatedAt", "lastContactDate", "lastContact"],
            "companies": ["createdAt", "updatedAt"],
            "campaigns": ["startDate", "endDate", "createdAt", "updatedAt"],
            "cases": ["createdAt", "updatedAt", "resolvedAt", "firstRespondedAt"],
            "invoices": ["issueDate", "dueDate", "paymentDate", "createdAt"],
            "products": ["createdAt", "updatedAt"],
            "quotes": ["issueDate", "validUntil", "createdAt", "updatedAt"],
            "tasks": ["dueDate", "createdAt", "updatedAt"],
            "events": ["startTime", "endTime", "createdAt", "updatedAt"],
            "users": ["createdAt", "updatedAt", "lastLoginAt"],
        }
        endpoints = {
            "deals": "/api/v1/deals",
            "leads": "/api/v1/leads",
            "contacts": "/api/v1/contacts",
            "companies": "/api/v1/companies",
            "campaigns": "/api/v1/campaigns",
            "cases": "/api/v1/cases",
            "invoices": "/api/v1/invoices",
            "products": "/api/v1/products",
            "quotes": "/api/v1/quotes",
            "tasks": "/api/v1/tasks",
            "events": "/api/v1/events",
            "users": "/api/v1/users",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            for requirement in sorted(set(data_requirements)):
                if requirement not in endpoints:
                    continue
                try:
                    raw_items = await self._fetch_collection(client, headers, endpoints[requirement])
                    state[requirement] = self._apply_dataset_filters(
                        raw_items,
                        dataset_date_fields.get(requirement, ["createdAt", "updatedAt"]),
                        date_range,
                        filters,
                    )
                except Exception as exc:
                    logger.warning("Report dataset fetch failed for %s: %s", requirement, exc)
                    state[requirement] = []
                    self._record_degraded_reason(
                        state,
                        f"{requirement.title()} data could not be loaded for this report.",
                    )

        for name in ["deals", "leads", "contacts", "companies", "campaigns", "cases", "invoices", "products", "quotes", "tasks", "events", "users"]:
            state.setdefault(name, [])

        state["activities"] = self._build_activity_feed(state.get("events", []), state.get("tasks", []))
        return state

    def _build_activity_feed(self, events: List[Dict[str, Any]], tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        activities: List[Dict[str, Any]] = []
        now = datetime.now()
        for event in events:
            start_time = self._coerce_datetime(event.get("startTime"))
            activities.append(
                {
                    "id": event.get("id"),
                    "title": event.get("title"),
                    "activityType": self._normalize_text(event.get("eventType"), "EVENT"),
                    "owner": self._normalize_text(event.get("ownerName") or event.get("assignedTo") or event.get("createdBy"), "Unassigned"),
                    "status": "SCHEDULED" if start_time and start_time >= now else "COMPLETED",
                    "activityAt": start_time.isoformat() if start_time else None,
                    "dueDate": event.get("startTime"),
                    "relatedEntityType": event.get("relatedEntityType"),
                    "relatedEntityId": event.get("relatedEntityId"),
                }
            )
        for task in tasks:
            due_at = self._coerce_datetime(task.get("dueDate"))
            status = self._normalize_text(task.get("status"), "TODO")
            activities.append(
                {
                    "id": task.get("id"),
                    "title": task.get("title"),
                    "activityType": "TASK",
                    "owner": self._normalize_text(task.get("assignedTo"), "Unassigned"),
                    "status": status,
                    "activityAt": task.get("updatedAt") or task.get("createdAt"),
                    "dueDate": task.get("dueDate"),
                    "overdue": bool(due_at and due_at < now and status != "COMPLETED"),
                    "relatedEntityType": task.get("relatedEntityType"),
                    "relatedEntityId": task.get("relatedEntityId"),
                }
            )
        return activities

    def _company_lookup(self, companies: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        return {str(company.get("id")): company for company in companies if company.get("id") is not None}

    def _group_count(self, items: List[Dict[str, Any]], label_fn) -> List[Dict[str, Any]]:
        counts: Dict[str, int] = defaultdict(int)
        for item in items:
            counts[self._normalize_text(label_fn(item))] += 1
        rows = [{"label": label, "count": count} for label, count in counts.items()]
        return sorted(rows, key=lambda row: (-row["count"], row["label"]))

    def _group_sum(self, items: List[Dict[str, Any]], label_fn, value_fn) -> List[Dict[str, Any]]:
        totals: Dict[str, float] = defaultdict(float)
        counts: Dict[str, int] = defaultdict(int)
        for item in items:
            label = self._normalize_text(label_fn(item))
            totals[label] += self._safe_float(value_fn(item))
            counts[label] += 1
        rows = [{"label": label, "count": counts[label], "value": round(total, 2)} for label, total in totals.items()]
        return sorted(rows, key=lambda row: (-row.get("value", 0), row["label"]))

    def _build_matrix(self, items: List[Dict[str, Any]], row_fn, column_fn, value_fn=None) -> Dict[str, Any]:
        if not items:
            return {}
        columns: List[str] = []
        matrix: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))
        row_totals: Dict[str, float] = defaultdict(float)
        column_totals: Dict[str, float] = defaultdict(float)
        for item in items:
            row_label = self._normalize_text(row_fn(item))
            column_label = self._normalize_text(column_fn(item))
            increment = self._safe_float(value_fn(item)) if value_fn else 1.0
            matrix[row_label][column_label] += increment
            row_totals[row_label] += increment
            column_totals[column_label] += increment
            if column_label not in columns:
                columns.append(column_label)
        return {
            "columns": columns,
            "rows": [
                {"label": row_label, "values": {column: round(matrix[row_label].get(column, 0), 2) for column in columns}, "total": round(row_totals[row_label], 2)}
                for row_label in sorted(matrix.keys())
            ],
            "columnTotals": {column: round(column_totals[column], 2) for column in columns},
        }

    def _build_time_series(self, items: List[Dict[str, Any]], date_fn, value_fn=None) -> List[Dict[str, Any]]:
        buckets: Dict[str, float] = defaultdict(float)
        for item in items:
            item_date = self._coerce_item_date(date_fn(item))
            if not item_date:
                continue
            bucket = item_date.strftime("%Y-%m")
            buckets[bucket] += self._safe_float(value_fn(item)) if value_fn else 1.0
        return [{"label": bucket, "value": round(value, 2)} for bucket, value in sorted(buckets.items())]

    def _unavailable_report(self, title: str, message: str) -> Dict[str, Any]:
        return {
            "metrics": {"available": False, "message": message},
            "detail_rows": [],
            "summary_groups": [{"label": "Status", "count": 1, "value": 0, "message": message}],
            "matrix": {},
            "charts": [],
            "title": title,
        }

    def _generic_rows(self, items: List[Dict[str, Any]], fields: List[str]) -> List[Dict[str, Any]]:
        return [{field: item.get(field) for field in fields} for item in items]

    def _build_report_content(self, state: ReportState) -> Dict[str, Any]:
        report_type = state["report_type"]
        deals = state.get("deals", [])
        leads = state.get("leads", [])
        contacts = state.get("contacts", [])
        companies = state.get("companies", [])
        campaigns = state.get("campaigns", [])
        cases = state.get("cases", [])
        invoices = state.get("invoices", [])
        products = state.get("products", [])
        quotes = state.get("quotes", [])
        tasks = state.get("tasks", [])
        users = state.get("users", [])
        activities = state.get("activities", [])
        company_lookup = self._company_lookup(companies)
        now = datetime.now()

        if report_type in {"sales_orders_report", "purchase_orders_report", "audit_log_report"}:
            title = self.REPORT_TEMPLATES.get(report_type, {}).get("title", "Unavailable Report")
            return self._unavailable_report(
                title,
                "This report category needs a dedicated module or audit stream before it can return live data.",
            )

        def deal_stage(deal: Dict[str, Any]) -> str:
            return self._normalize_text(deal.get("stage"))

        def deal_owner(deal: Dict[str, Any]) -> str:
            return self._normalize_text(deal.get("ownerName") or deal.get("ownerId"))

        def deal_type(deal: Dict[str, Any]) -> str:
            return self._normalize_text(deal.get("dealType"))

        def deal_source(deal: Dict[str, Any]) -> str:
            return self._normalize_text(deal.get("leadSource"))

        def deal_company(deal: Dict[str, Any]) -> Dict[str, Any]:
            company_id = deal.get("companyId")
            return company_lookup.get(str(company_id), {}) if company_id is not None else {}

        def deal_industry(deal: Dict[str, Any]) -> str:
            return self._normalize_text(deal_company(deal).get("industry"))

        def deal_territory(deal: Dict[str, Any]) -> str:
            company = deal_company(deal)
            return self._normalize_text(deal.get("territory") or company.get("territory"))

        def deal_region(deal: Dict[str, Any]) -> str:
            company = deal_company(deal)
            return self._normalize_text(company.get("country") or company.get("state") or company.get("city"))

        open_deals = [deal for deal in deals if deal_stage(deal) not in {"CLOSED_WON", "CLOSED_LOST"}]
        won_deals = [deal for deal in deals if deal_stage(deal) == "CLOSED_WON"]
        lost_deals = [deal for deal in deals if deal_stage(deal) == "CLOSED_LOST"]

        if report_type in {"sales_pipeline_summary", "pipeline_value_report", "deals_by_stage"}:
            summary_groups = self._group_sum(open_deals, deal_stage, lambda item: item.get("value"))
            detail_rows = [
                {
                    "deal": deal.get("name"),
                    "stage": deal_stage(deal),
                    "owner": deal_owner(deal),
                    "territory": deal_territory(deal),
                    "industry": deal_industry(deal),
                    "value": round(self._safe_float(deal.get("value")), 2),
                    "weightedValue": round(self._safe_float(deal.get("weightedValue") or self._safe_float(deal.get("value")) * self._safe_float(deal.get("probability")) / 100), 2),
                    "closeDate": deal.get("expectedCloseDate"),
                }
                for deal in sorted(open_deals, key=lambda item: self._safe_float(item.get("value")), reverse=True)
            ]
            charts = [{
                "type": "bar",
                "title": "Pipeline Value by Stage",
                "data": {row["label"]: row.get("value", 0) for row in summary_groups},
                "xAxis": "Stage",
                "yAxis": "Value",
            }]
            return {
                "metrics": {
                    "pipeline_value": round(sum(self._safe_float(deal.get("value")) for deal in open_deals), 2),
                    "weighted_pipeline": round(sum(self._safe_float(deal.get("weightedValue") or self._safe_float(deal.get("value")) * self._safe_float(deal.get("probability")) / 100) for deal in open_deals), 2),
                    "open_deals": len(open_deals),
                    "won_deals": len(won_deals),
                    "win_rate": round((len(won_deals) / max(len(won_deals) + len(lost_deals), 1)) * 100, 2),
                },
                "detail_rows": detail_rows,
                "summary_groups": summary_groups,
                "matrix": self._build_matrix(open_deals, deal_owner, deal_stage, lambda item: item.get("value")),
                "charts": charts,
            }

        if report_type in {"revenue_summary_report", "forecast_summary_report", "forecast_vs_actual"}:
            won_series = self._build_time_series(won_deals, lambda item: item.get("actualCloseDate") or item.get("expectedCloseDate"), lambda item: item.get("value"))
            forecast_series = self._build_time_series(open_deals, lambda item: item.get("expectedCloseDate"), lambda item: item.get("weightedValue") or self._safe_float(item.get("value")) * self._safe_float(item.get("probability")) / 100)
            detail_rows = [{
                "owner": deal_owner(deal),
                "deal": deal.get("name"),
                "stage": deal_stage(deal),
                "value": round(self._safe_float(deal.get("value")), 2),
                "weightedValue": round(self._safe_float(deal.get("weightedValue") or self._safe_float(deal.get("value")) * self._safe_float(deal.get("probability")) / 100), 2),
                "closeDate": deal.get("actualCloseDate") or deal.get("expectedCloseDate"),
            } for deal in sorted(deals, key=lambda item: self._safe_float(item.get("value")), reverse=True)]
            charts = [
                {"type": "line", "title": "Won Revenue Trend", "data": {row["label"]: row["value"] for row in won_series}, "xAxis": "Month", "yAxis": "Won Revenue"},
                {"type": "line", "title": "Forecast Trend", "data": {row["label"]: row["value"] for row in forecast_series}, "xAxis": "Month", "yAxis": "Weighted Forecast"},
            ]
            quota_total = sum(self._safe_float(user.get("quarterlyQuota")) for user in users)
            final_forecast = sum(self._safe_float(deal.get("weightedValue") or self._safe_float(deal.get("value")) * self._safe_float(deal.get("probability")) / 100) for deal in open_deals)
            closed_revenue = sum(self._safe_float(deal.get("value")) for deal in won_deals)
            return {
                "metrics": {
                    "closed_revenue": round(closed_revenue, 2),
                    "weighted_forecast": round(final_forecast, 2),
                    "pipeline_value": round(sum(self._safe_float(deal.get("value")) for deal in open_deals), 2),
                    "quota_total": round(quota_total, 2),
                    "quota_gap": round(quota_total - (closed_revenue + final_forecast), 2),
                },
                "detail_rows": detail_rows,
                "summary_groups": forecast_series,
                "matrix": self._build_matrix(open_deals, deal_owner, deal_stage, lambda item: item.get("weightedValue") or self._safe_float(item.get("value")) * self._safe_float(item.get("probability")) / 100),
                "charts": charts,
            }

        if report_type == "deals_closing_this_month":
            current_month = datetime.now().strftime("%Y-%m")
            month_deals = [deal for deal in deals if (self._coerce_item_date(deal.get("actualCloseDate") or deal.get("expectedCloseDate")) or datetime.now().date()).strftime("%Y-%m") == current_month]
            return {
                "metrics": {
                    "closing_deals": len(month_deals),
                    "closing_value": round(sum(self._safe_float(item.get("value")) for item in month_deals), 2),
                    "won_value": round(sum(self._safe_float(item.get("value")) for item in month_deals if deal_stage(item) == "CLOSED_WON"), 2),
                    "lost_value": round(sum(self._safe_float(item.get("value")) for item in month_deals if deal_stage(item) == "CLOSED_LOST"), 2),
                },
                "detail_rows": self._generic_rows(month_deals, ["name", "stage", "ownerName", "expectedCloseDate", "actualCloseDate", "value"]),
                "summary_groups": self._group_sum(month_deals, deal_owner, lambda item: item.get("value")),
                "matrix": self._build_matrix(month_deals, deal_owner, deal_stage, lambda item: item.get("value")),
                "charts": [],
            }

        if report_type == "deals_lost_this_month":
            current_month = datetime.now().strftime("%Y-%m")
            month_lost = [deal for deal in lost_deals if (self._coerce_item_date(deal.get("actualCloseDate")) or datetime.now().date()).strftime("%Y-%m") == current_month]
            return {
                "metrics": {
                    "lost_deals": len(month_lost),
                    "lost_value": round(sum(self._safe_float(item.get("value")) for item in month_lost), 2),
                    "avg_loss": round(sum(self._safe_float(item.get("value")) for item in month_lost) / max(len(month_lost), 1), 2),
                },
                "detail_rows": self._generic_rows(month_lost, ["name", "ownerName", "leadSource", "expectedCloseDate", "actualCloseDate", "value", "lossReason"]),
                "summary_groups": self._group_sum(month_lost, deal_owner, lambda item: item.get("value")),
                "matrix": {},
                "charts": [],
            }

        if report_type == "sales_trend_report":
            won_series = self._build_time_series(won_deals, lambda item: item.get("actualCloseDate"), lambda item: item.get("value"))
            pipeline_series = self._build_time_series(open_deals, lambda item: item.get("expectedCloseDate"), lambda item: item.get("value"))
            return {
                "metrics": {
                    "won_revenue_periods": len(won_series),
                    "pipeline_periods": len(pipeline_series),
                    "closed_revenue": round(sum(self._safe_float(item.get("value")) for item in won_deals), 2),
                    "pipeline_value": round(sum(self._safe_float(item.get("value")) for item in open_deals), 2),
                },
                "detail_rows": [{"period": row["label"], "wonRevenue": row["value"], "pipelineValue": next((entry["value"] for entry in pipeline_series if entry["label"] == row["label"]), 0)} for row in won_series],
                "summary_groups": won_series,
                "matrix": {},
                "charts": [{"type": "line", "title": "Sales Trend", "data": {row["label"]: row["value"] for row in won_series}, "xAxis": "Month", "yAxis": "Won Revenue"}],
            }

        if report_type in {"deals_by_owner", "deals_by_type", "deals_by_industry", "deals_by_lead_source", "deals_by_territory", "sales_by_territory", "performance_by_sales_rep", "revenue_by_region"}:
            if report_type == "deals_by_owner":
                label_fn = deal_owner
                matrix_rows = lambda item: deal_owner(item)
                matrix_columns = deal_stage
            elif report_type == "deals_by_type":
                label_fn = deal_type
                matrix_rows = lambda item: deal_owner(item)
                matrix_columns = deal_type
            elif report_type == "deals_by_industry":
                label_fn = deal_industry
                matrix_rows = lambda item: deal_owner(item)
                matrix_columns = deal_industry
            elif report_type in {"deals_by_territory", "sales_by_territory"}:
                label_fn = deal_territory
                matrix_rows = lambda item: deal_owner(item)
                matrix_columns = deal_territory
            elif report_type == "revenue_by_region":
                label_fn = deal_region
                matrix_rows = lambda item: deal_owner(item)
                matrix_columns = deal_region
            else:
                label_fn = deal_source
                matrix_rows = lambda item: deal_owner(item)
                matrix_columns = deal_source
            summary_groups = self._group_sum(deals, label_fn, lambda item: item.get("value"))
            detail_rows = [{"deal": deal.get("name"), "owner": deal_owner(deal), "stage": deal_stage(deal), "group": label_fn(deal), "value": round(self._safe_float(deal.get("value")), 2), "closeDate": deal.get("actualCloseDate") or deal.get("expectedCloseDate")} for deal in sorted(deals, key=lambda item: self._safe_float(item.get("value")), reverse=True)]
            return {
                "metrics": {"total_deals": len(deals), "total_value": round(sum(self._safe_float(item.get("value")) for item in deals), 2), "groups": len(summary_groups)},
                "detail_rows": detail_rows,
                "summary_groups": summary_groups,
                "matrix": self._build_matrix(deals, matrix_rows, matrix_columns, lambda item: item.get("value")),
                "charts": [{"type": "bar", "title": self.REPORT_TEMPLATES[report_type]["title"], "data": {row["label"]: row.get("value", row.get("count", 0)) for row in summary_groups}, "xAxis": "Group", "yAxis": "Value"}],
            }

        if report_type in {"deals_by_closing_date", "won_deals_report", "lost_deals_report"}:
            target_deals = won_deals if report_type == "won_deals_report" else lost_deals if report_type == "lost_deals_report" else deals
            summary_groups = self._build_time_series(target_deals, lambda item: item.get("actualCloseDate") or item.get("expectedCloseDate"), lambda item: item.get("value"))
            return {
                "metrics": {"deal_count": len(target_deals), "deal_value": round(sum(self._safe_float(item.get("value")) for item in target_deals), 2), "avg_deal_value": round(sum(self._safe_float(item.get("value")) for item in target_deals) / max(len(target_deals), 1), 2)},
                "detail_rows": self._generic_rows(target_deals, ["name", "ownerName", "stage", "leadSource", "expectedCloseDate", "actualCloseDate", "value", "winReason", "lossReason"]),
                "summary_groups": summary_groups,
                "matrix": {},
                "charts": [{"type": "line", "title": "Value by Closing Period", "data": {row["label"]: row["value"] for row in summary_groups}, "xAxis": "Period", "yAxis": "Value"}],
            }

        if report_type in {"leads_by_source", "leads_by_status", "leads_by_industry", "leads_by_owner"}:
            def lead_source(lead: Dict[str, Any]) -> str:
                return self._normalize_text(lead.get("source"))

            def lead_status(lead: Dict[str, Any]) -> str:
                return self._normalize_text(lead.get("status"))

            def lead_industry(lead: Dict[str, Any]) -> str:
                return self._normalize_text(lead.get("industry"))

            def lead_owner(lead: Dict[str, Any]) -> str:
                return self._normalize_text(lead.get("ownerName") or lead.get("ownerId"))

            if report_type == "leads_by_source":
                label_fn = lead_source
                matrix_columns = lead_source
            elif report_type == "leads_by_status":
                label_fn = lead_status
                matrix_columns = lead_status
            elif report_type == "leads_by_industry":
                label_fn = lead_industry
                matrix_columns = lead_industry
            else:
                label_fn = lead_owner
                matrix_columns = lead_status

            summary_groups = self._group_sum(leads, label_fn, lambda item: item.get("estimatedValue"))
            return {
                "metrics": {"total_leads": len(leads), "converted_leads": len([lead for lead in leads if self._normalize_text(lead.get("status")) == "CONVERTED"]), "estimated_value": round(sum(self._safe_float(item.get("estimatedValue")) for item in leads), 2)},
                "detail_rows": self._generic_rows(leads, ["firstName", "lastName", "source", "status", "industry", "ownerName", "estimatedValue", "createdAt"]),
                "summary_groups": summary_groups,
                "matrix": self._build_matrix(leads, lambda item: lead_owner(item), matrix_columns, lambda item: item.get("estimatedValue") or 1),
                "charts": [{"type": "bar", "title": self.REPORT_TEMPLATES[report_type]["title"], "data": {row["label"]: row.get("count", 0) for row in summary_groups}, "xAxis": "Group", "yAxis": "Lead Count"}],
            }

        if report_type == "leads_converted_report":
            converted = [lead for lead in leads if self._normalize_text(lead.get("status")) == "CONVERTED"]
            summary_groups = self._group_count(converted, lambda item: item.get("source"))
            return {
                "metrics": {"converted_leads": len(converted), "conversion_rate": round((len(converted) / max(len(leads), 1)) * 100, 2), "converted_estimated_value": round(sum(self._safe_float(item.get("estimatedValue")) for item in converted), 2)},
                "detail_rows": self._generic_rows(converted, ["firstName", "lastName", "source", "ownerName", "estimatedValue", "createdAt", "updatedAt"]),
                "summary_groups": summary_groups,
                "matrix": {},
                "charts": [],
            }

        if report_type == "leads_not_contacted":
            untouched = [lead for lead in leads if not lead.get("lastContactDate") and not lead.get("lastContact")]
            detail_rows = []
            for lead in untouched:
                created = self._coerce_datetime(lead.get("createdAt"))
                detail_rows.append(
                    {
                        "lead": f"{lead.get('firstName', '')} {lead.get('lastName', '')}".strip(),
                        "owner": self._normalize_text(lead.get("ownerName") or lead.get("ownerId")),
                        "source": self._normalize_text(lead.get("source")),
                        "status": self._normalize_text(lead.get("status")),
                        "daysSinceCreated": (now - created).days if created else None,
                        "estimatedValue": round(self._safe_float(lead.get("estimatedValue")), 2),
                    }
                )
            return {
                "metrics": {"not_contacted_count": len(untouched), "share_of_leads": round((len(untouched) / max(len(leads), 1)) * 100, 2)},
                "detail_rows": sorted(detail_rows, key=lambda row: row.get("daysSinceCreated") or 0, reverse=True),
                "summary_groups": self._group_count(untouched, lambda item: item.get("ownerName") or item.get("ownerId")),
                "matrix": {},
                "charts": [],
            }

        if report_type == "leads_created_over_time":
            series = self._build_time_series(leads, lambda item: item.get("createdAt"))
            return {
                "metrics": {"total_leads": len(leads), "periods": len(series)},
                "detail_rows": [{"period": row["label"], "count": row["value"]} for row in series],
                "summary_groups": series,
                "matrix": {},
                "charts": [{"type": "line", "title": "Leads Created Over Time", "data": {row["label"]: row["value"] for row in series}, "xAxis": "Month", "yAxis": "Leads"}],
            }

        if report_type in {"lead_to_deal_conversion_report", "lead_conversion_funnel", "conversion_by_source", "conversion_by_sales_rep"}:
            converted = [lead for lead in leads if self._normalize_text(lead.get("status")) == "CONVERTED"]
            qualified = [lead for lead in leads if self._normalize_text(lead.get("status")) == "QUALIFIED"]

            def source_fn(item: Dict[str, Any]) -> str:
                return self._normalize_text(item.get("source"))

            def owner_fn(item: Dict[str, Any]) -> str:
                return self._normalize_text(item.get("ownerName") or item.get("ownerId"))

            if report_type == "conversion_by_source":
                groups = sorted({source_fn(item) for item in leads})
                summary_groups = []
                for label in groups:
                    total = len([item for item in leads if source_fn(item) == label])
                    won = len([item for item in converted if source_fn(item) == label])
                    summary_groups.append({"label": label, "count": total, "converted": won, "rate": round((won / max(total, 1)) * 100, 2)})
                matrix = self._build_matrix(leads, owner_fn, source_fn)
            elif report_type == "conversion_by_sales_rep":
                groups = sorted({owner_fn(item) for item in leads})
                summary_groups = []
                for label in groups:
                    total = len([item for item in leads if owner_fn(item) == label])
                    won = len([item for item in converted if owner_fn(item) == label])
                    summary_groups.append({"label": label, "count": total, "converted": won, "rate": round((won / max(total, 1)) * 100, 2)})
                matrix = self._build_matrix(leads, owner_fn, source_fn)
            else:
                summary_groups = [{"label": "Leads", "count": len(leads), "value": len(leads)}, {"label": "Qualified", "count": len(qualified), "value": len(qualified)}, {"label": "Converted", "count": len(converted), "value": len(converted)}, {"label": "Deals", "count": len(deals), "value": len(deals)}]
                matrix = {}
            charts = []
            if report_type == "lead_conversion_funnel":
                charts.append({"type": "funnel", "title": "Lead Conversion Funnel", "data": {row["label"]: row["value"] for row in summary_groups}})
            return {
                "metrics": {"total_leads": len(leads), "qualified_leads": len(qualified), "converted_leads": len(converted), "deal_count": len(deals), "conversion_rate": round((len(converted) / max(len(leads), 1)) * 100, 2)},
                "detail_rows": self._generic_rows(converted if report_type != "lead_conversion_funnel" else leads, ["firstName", "lastName", "source", "status", "ownerName", "estimatedValue"]),
                "summary_groups": summary_groups,
                "matrix": matrix,
                "charts": charts,
            }

        if report_type in {"activities_by_type", "activities_by_user", "calls_made_report", "meetings_scheduled_report", "tasks_completed_report", "overdue_activities", "last_activity_by_record", "user_activity_report"}:
            filtered_activities = activities
            if report_type == "calls_made_report":
                filtered_activities = [item for item in activities if self._normalize_text(item.get("activityType")) == "CALL"]
            elif report_type == "meetings_scheduled_report":
                filtered_activities = [item for item in activities if self._normalize_text(item.get("activityType")) in {"MEETING", "DEMO", "PRESENTATION"}]
            elif report_type == "tasks_completed_report":
                filtered_activities = [item for item in activities if item.get("activityType") == "TASK" and self._normalize_text(item.get("status")) == "COMPLETED"]
            elif report_type == "overdue_activities":
                filtered_activities = [item for item in activities if item.get("overdue")]
            elif report_type == "last_activity_by_record":
                latest_by_record: Dict[str, Dict[str, Any]] = {}
                for item in activities:
                    key = f"{item.get('relatedEntityType')}:{item.get('relatedEntityId')}"
                    if not item.get("relatedEntityId"):
                        continue
                    current = latest_by_record.get(key)
                    current_dt = self._coerce_datetime(current.get("activityAt")) if current else None
                    item_dt = self._coerce_datetime(item.get("activityAt"))
                    if not current or (item_dt and (not current_dt or item_dt > current_dt)):
                        latest_by_record[key] = item
                filtered_activities = list(latest_by_record.values())

            if report_type in {"activities_by_type", "calls_made_report", "meetings_scheduled_report"}:
                summary_groups = self._group_count(filtered_activities, lambda item: item.get("activityType"))
                matrix = self._build_matrix(filtered_activities, lambda item: item.get("owner"), lambda item: item.get("activityType"))
            elif report_type in {"activities_by_user", "user_activity_report", "tasks_completed_report", "overdue_activities"}:
                summary_groups = self._group_count(filtered_activities, lambda item: item.get("owner"))
                matrix = self._build_matrix(filtered_activities, lambda item: item.get("owner"), lambda item: item.get("activityType"))
            else:
                summary_groups = self._group_count(filtered_activities, lambda item: item.get("relatedEntityType"))
                matrix = {}
            return {
                "metrics": {"total_activities": len(filtered_activities), "users_involved": len({self._normalize_text(item.get("owner")) for item in filtered_activities}), "overdue_count": len([item for item in filtered_activities if item.get("overdue")])},
                "detail_rows": self._generic_rows(filtered_activities, ["title", "activityType", "owner", "status", "activityAt", "dueDate", "relatedEntityType", "relatedEntityId"]),
                "summary_groups": summary_groups,
                "matrix": matrix,
                "charts": [],
            }

        if report_type in {"accounts_by_industry", "accounts_by_owner"}:
            label_fn = (lambda item: item.get("industry")) if report_type == "accounts_by_industry" else (lambda item: item.get("ownerName") or item.get("ownerId"))
            summary_groups = self._group_sum(companies, label_fn, lambda item: item.get("revenue"))
            return {
                "metrics": {"total_accounts": len(companies), "total_revenue": round(sum(self._safe_float(item.get("revenue")) for item in companies), 2)},
                "detail_rows": self._generic_rows(companies, ["name", "industry", "ownerName", "territory", "revenue", "status", "createdAt"]),
                "summary_groups": summary_groups,
                "matrix": self._build_matrix(companies, lambda item: self._normalize_text(item.get("ownerName") or item.get("ownerId")), lambda item: self._normalize_text(item.get("industry")), lambda item: item.get("revenue") or 1),
                "charts": [],
            }

        if report_type == "contacts_by_source":
            summary_groups = self._group_count(contacts, lambda item: item.get("source"))
            return {
                "metrics": {"total_contacts": len(contacts), "contacts_with_source": len([item for item in contacts if item.get("source")])},
                "detail_rows": self._generic_rows(contacts, ["firstName", "lastName", "companyName", "source", "status", "createdAt"]),
                "summary_groups": summary_groups,
                "matrix": self._build_matrix(contacts, lambda item: self._normalize_text(item.get("companyName")), lambda item: self._normalize_text(item.get("source"))),
                "charts": [],
            }

        if report_type == "contacts_created_over_time":
            series = self._build_time_series(contacts, lambda item: item.get("createdAt"))
            return {"metrics": {"total_contacts": len(contacts), "periods": len(series)}, "detail_rows": [{"period": row["label"], "count": row["value"]} for row in series], "summary_groups": series, "matrix": {}, "charts": []}

        if report_type == "contact_activity_report":
            contact_touch_map: Dict[str, Dict[str, Any]] = {}
            for contact in contacts:
                contact_id = str(contact.get("id"))
                contact_touch_map[contact_id] = {"contact": f"{contact.get('firstName', '')} {contact.get('lastName', '')}".strip(), "company": contact.get("companyName"), "lastContact": contact.get("lastContactDate") or contact.get("lastContact"), "activityCount": 0}
            for item in activities:
                if self._normalize_text(item.get("relatedEntityType")) != "CONTACT":
                    continue
                contact_id = str(item.get("relatedEntityId"))
                if contact_id in contact_touch_map:
                    contact_touch_map[contact_id]["activityCount"] += 1
            rows = list(contact_touch_map.values())
            return {
                "metrics": {"contacts_with_activity": len([row for row in rows if row["activityCount"] > 0]), "recent_touch_count": len([row for row in rows if row["lastContact"]]), "total_contacts": len(rows)},
                "detail_rows": rows,
                "summary_groups": self._group_count(rows, lambda row: "Active" if row["activityCount"] > 0 else "No Activity"),
                "matrix": {},
                "charts": [],
            }

        if report_type in {"campaign_roi_report", "campaign_revenue_report", "campaign_status_report", "email_campaign_performance", "leads_by_campaign"}:
            filtered_campaigns = [campaign for campaign in campaigns if self._normalize_text(campaign.get("channel")) == "EMAIL"] if report_type == "email_campaign_performance" else campaigns
            if report_type == "campaign_status_report":
                summary_groups = self._group_count(filtered_campaigns, lambda item: item.get("status"))
                matrix = self._build_matrix(filtered_campaigns, lambda item: self._normalize_text(item.get("channel")), lambda item: self._normalize_text(item.get("status")))
            else:
                summary_groups = [{"label": self._normalize_text(campaign.get("name")), "count": int(self._safe_float(campaign.get("leadsGenerated") or campaign.get("attributedLeadCount"))), "value": round(self._safe_float(campaign.get("actualRevenue") or campaign.get("attributedPipelineValue")), 2), "roi": round(self._safe_float(campaign.get("roiPercent")), 2)} for campaign in filtered_campaigns]
                summary_groups.sort(key=lambda row: (-row.get("value", 0), row["label"]))
                matrix = {}
            return {
                "metrics": {"total_campaigns": len(filtered_campaigns), "total_budget": round(sum(self._safe_float(item.get("budget")) for item in filtered_campaigns), 2), "total_actual_revenue": round(sum(self._safe_float(item.get("actualRevenue")) for item in filtered_campaigns), 2), "total_attributed_leads": round(sum(self._safe_float(item.get("attributedLeadCount") or item.get("leadsGenerated")) for item in filtered_campaigns), 2)},
                "detail_rows": self._generic_rows(filtered_campaigns, ["name", "status", "channel", "budget", "expectedRevenue", "actualRevenue", "leadsGenerated", "attributedLeadCount", "conversions", "roiPercent"]),
                "summary_groups": summary_groups,
                "matrix": matrix,
                "charts": [],
            }

        if report_type in {"products_by_revenue", "products_sold_report"}:
            product_lookup = {str(product.get("id")): product for product in products if product.get("id") is not None}
            aggregates: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"label": "Unknown Product", "count": 0, "value": 0.0})

            def apply_line_items(records: List[Dict[str, Any]], status_filter: Optional[List[str]] = None) -> None:
                for record in records:
                    if status_filter and self._normalize_text(record.get("status")) not in status_filter:
                        continue
                    for line in record.get("lineItems") or []:
                        product_id = str(line.get("productId"))
                        product = product_lookup.get(product_id, {})
                        label = self._normalize_text(product.get("name") or line.get("description"))
                        quantity = self._safe_float(line.get("quantity"))
                        total = self._safe_float(line.get("total") or quantity * self._safe_float(line.get("unitPrice")))
                        aggregates[label]["label"] = label
                        aggregates[label]["count"] += int(quantity)
                        aggregates[label]["value"] += total

            apply_line_items(quotes, ["ACCEPTED"])
            apply_line_items(invoices, ["PAID", "SENT", "OVERDUE"])
            rows = sorted([{"label": label, "count": values["count"], "value": round(values["value"], 2)} for label, values in aggregates.items()], key=lambda row: (-row["value"], row["label"]))
            return {
                "metrics": {"products_reported": len(rows), "units_sold": sum(row["count"] for row in rows), "product_revenue": round(sum(row["value"] for row in rows), 2)},
                "detail_rows": rows,
                "summary_groups": rows,
                "matrix": {},
                "charts": [{"type": "bar", "title": "Products by Revenue", "data": {row["label"]: row["value"] for row in rows[:12]}, "xAxis": "Product", "yAxis": "Revenue"}],
            }

        if report_type == "quotes_report":
            summary_groups = self._group_sum(quotes, lambda item: item.get("status"), lambda item: item.get("total"))
            return {"metrics": {"total_quotes": len(quotes), "quote_value": round(sum(self._safe_float(item.get("total")) for item in quotes), 2), "accepted_quotes": len([item for item in quotes if self._normalize_text(item.get("status")) == "ACCEPTED"])}, "detail_rows": self._generic_rows(quotes, ["quoteNumber", "companyName", "status", "issueDate", "validUntil", "subtotal", "discountAmount", "tax", "total"]), "summary_groups": summary_groups, "matrix": self._build_matrix(quotes, lambda item: self._normalize_text(item.get("companyName")), lambda item: self._normalize_text(item.get("status")), lambda item: item.get("total") or 1), "charts": []}

        if report_type == "invoices_report":
            summary_groups = self._group_sum(invoices, lambda item: item.get("status"), lambda item: item.get("total"))
            return {"metrics": {"total_invoices": len(invoices), "invoice_total": round(sum(self._safe_float(item.get("total")) for item in invoices), 2), "amount_paid": round(sum(self._safe_float(item.get("amountPaid")) for item in invoices), 2)}, "detail_rows": self._generic_rows(invoices, ["invoiceNumber", "companyId", "status", "issueDate", "dueDate", "paymentDate", "total", "amountPaid"]), "summary_groups": summary_groups, "matrix": self._build_matrix(invoices, lambda item: self._normalize_text(item.get("status")), lambda item: self._normalize_text(item.get("paymentTerms")), lambda item: item.get("total") or 1), "charts": []}

        if report_type in {"sales_forecast_by_user", "quota_vs_achievement"}:
            owner_rows: Dict[str, Dict[str, Any]] = {}
            for user in users:
                owner_label = self._normalize_text(f"{user.get('firstName', '')} {user.get('lastName', '')}".strip() or user.get("email") or user.get("id"))
                owner_rows[owner_label] = {"label": owner_label, "quota": round(self._safe_float(user.get("quarterlyQuota")), 2), "closed": 0.0, "forecast": 0.0, "pipeline": 0.0}
            for deal in deals:
                owner_label = deal_owner(deal)
                owner_rows.setdefault(owner_label, {"label": owner_label, "quota": 0.0, "closed": 0.0, "forecast": 0.0, "pipeline": 0.0})
                owner_rows[owner_label]["pipeline"] += self._safe_float(deal.get("value"))
                owner_rows[owner_label]["forecast"] += self._safe_float(deal.get("weightedValue") or self._safe_float(deal.get("value")) * self._safe_float(deal.get("probability")) / 100)
                if deal_stage(deal) == "CLOSED_WON":
                    owner_rows[owner_label]["closed"] += self._safe_float(deal.get("value"))
            rows = []
            for label, values in owner_rows.items():
                quota = values["quota"]
                closed = values["closed"]
                forecast = values["forecast"]
                rows.append({"label": label, "quota": round(quota, 2), "closed": round(closed, 2), "forecast": round(forecast, 2), "achievementPercent": round((closed / quota) * 100, 2) if quota else 0, "forecastPercent": round(((closed + forecast) / quota) * 100, 2) if quota else 0})
            rows.sort(key=lambda row: (-row["forecast"], row["label"]))
            return {"metrics": {"owners": len(rows), "total_quota": round(sum(row["quota"] for row in rows), 2), "closed_revenue": round(sum(row["closed"] for row in rows), 2), "weighted_forecast": round(sum(row["forecast"] for row in rows), 2)}, "detail_rows": rows, "summary_groups": rows, "matrix": self._build_matrix(rows, lambda item: item["label"], lambda item: "Forecast" if item["forecast"] else "Closed", lambda item: item["forecast"] + item["closed"]), "charts": []}

        if report_type == "sales_forecast_by_territory":
            territory_rows: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"label": "Unknown", "quota": 0.0, "closed": 0.0, "forecast": 0.0, "pipeline": 0.0})
            for user in users:
                territory = self._normalize_text(user.get("territory"))
                territory_rows[territory]["label"] = territory
                territory_rows[territory]["quota"] += self._safe_float(user.get("quarterlyQuota"))
            for deal in deals:
                territory = deal_territory(deal)
                territory_rows[territory]["label"] = territory
                territory_rows[territory]["pipeline"] += self._safe_float(deal.get("value"))
                territory_rows[territory]["forecast"] += self._safe_float(deal.get("weightedValue") or self._safe_float(deal.get("value")) * self._safe_float(deal.get("probability")) / 100)
                if deal_stage(deal) == "CLOSED_WON":
                    territory_rows[territory]["closed"] += self._safe_float(deal.get("value"))
            rows = sorted([{"label": label, "quota": round(values["quota"], 2), "closed": round(values["closed"], 2), "forecast": round(values["forecast"], 2), "pipeline": round(values["pipeline"], 2)} for label, values in territory_rows.items()], key=lambda row: (-row["forecast"], row["label"]))
            return {"metrics": {"territories": len(rows), "total_quota": round(sum(row["quota"] for row in rows), 2), "closed_revenue": round(sum(row["closed"] for row in rows), 2), "weighted_forecast": round(sum(row["forecast"] for row in rows), 2)}, "detail_rows": rows, "summary_groups": rows, "matrix": self._build_matrix(deals, deal_owner, deal_territory, lambda item: item.get("weightedValue") or self._safe_float(item.get("value")) * self._safe_float(item.get("probability")) / 100), "charts": []}

        if report_type in {"cases_by_status", "cases_by_priority", "cases_by_owner", "cases_by_category"}:
            if report_type == "cases_by_status":
                label_fn = lambda item: item.get("status")
                matrix_columns = lambda item: item.get("status")
            elif report_type == "cases_by_priority":
                label_fn = lambda item: item.get("priority")
                matrix_columns = lambda item: item.get("priority")
            elif report_type == "cases_by_owner":
                label_fn = lambda item: item.get("ownerName") or item.get("ownerId")
                matrix_columns = lambda item: item.get("status")
            else:
                label_fn = lambda item: item.get("source")
                matrix_columns = lambda item: item.get("source")
            summary_groups = self._group_count(cases, label_fn)
            return {"metrics": {"total_cases": len(cases), "escalated_cases": len([item for item in cases if self._normalize_text(item.get("status")) == "ESCALATED"]), "breached_cases": len([item for item in cases if item.get("overdueResponse") or item.get("overdueResolution")])}, "detail_rows": self._generic_rows(cases, ["caseNumber", "title", "status", "priority", "source", "ownerName", "customerTier", "responseSlaStatus", "resolutionSlaStatus", "createdAt"]), "summary_groups": summary_groups, "matrix": self._build_matrix(cases, lambda item: self._normalize_text(item.get("ownerName") or item.get("ownerId")), matrix_columns), "charts": []}

        if report_type == "open_vs_closed_cases":
            open_cases = [item for item in cases if self._normalize_text(item.get("status")) not in {"RESOLVED", "CLOSED"}]
            closed_cases = [item for item in cases if self._normalize_text(item.get("status")) in {"RESOLVED", "CLOSED"}]
            rows = [{"label": "Open", "count": len(open_cases), "value": len(open_cases)}, {"label": "Closed", "count": len(closed_cases), "value": len(closed_cases)}]
            return {"metrics": {"open_cases": len(open_cases), "closed_cases": len(closed_cases), "closure_rate": round((len(closed_cases) / max(len(cases), 1)) * 100, 2)}, "detail_rows": self._generic_rows(cases, ["caseNumber", "title", "status", "priority", "ownerName", "createdAt", "resolvedAt"]), "summary_groups": rows, "matrix": {}, "charts": [{"type": "pie", "title": "Open vs Closed Cases", "data": {row["label"]: row["count"] for row in rows}}]}

        if report_type == "escalated_cases":
            escalated = [item for item in cases if self._normalize_text(item.get("status")) == "ESCALATED"]
            return {"metrics": {"escalated_cases": len(escalated), "response_breaches": len([item for item in escalated if item.get("overdueResponse")]), "resolution_breaches": len([item for item in escalated if item.get("overdueResolution")])}, "detail_rows": self._generic_rows(escalated, ["caseNumber", "title", "priority", "ownerName", "customerTier", "responseSlaStatus", "resolutionSlaStatus", "createdAt"]), "summary_groups": self._group_count(escalated, lambda item: item.get("ownerName") or item.get("ownerId")), "matrix": {}, "charts": []}

        if report_type == "login_history_report":
            sorted_users = sorted(users, key=lambda item: self._coerce_datetime(item.get("lastLoginAt")) or datetime.min, reverse=True)
            return {"metrics": {"workspace_users": len(users), "recent_logins": len([user for user in users if user.get("lastLoginAt")])}, "detail_rows": [{"name": self._normalize_text(f"{user.get('firstName', '')} {user.get('lastName', '')}".strip() or user.get("email")), "email": user.get("email"), "role": user.get("role"), "territory": user.get("territory"), "lastLoginAt": user.get("lastLoginAt")} for user in sorted_users], "summary_groups": self._group_count(users, lambda item: item.get("role")), "matrix": {}, "charts": []}

        if report_type == "record_modification_report":
            entity_sources = [("Deal", deals, "name"), ("Lead", leads, "email"), ("Contact", contacts, "email"), ("Company", companies, "name"), ("Campaign", campaigns, "name"), ("Case", cases, "caseNumber"), ("Quote", quotes, "quoteNumber"), ("Invoice", invoices, "invoiceNumber")]
            rows: List[Dict[str, Any]] = []
            for entity_type, items, label_field in entity_sources:
                for item in items:
                    rows.append({"entityType": entity_type, "record": item.get(label_field), "modifiedAt": item.get("updatedAt"), "createdAt": item.get("createdAt")})
            rows.sort(key=lambda item: self._coerce_datetime(item.get("modifiedAt")) or datetime.min, reverse=True)
            return {"metrics": {"records_tracked": len(rows), "modules_in_scope": len(entity_sources)}, "detail_rows": rows, "summary_groups": self._group_count(rows, lambda item: item.get("entityType")), "matrix": {}, "charts": []}

        return {"metrics": {"total_deals": len(deals), "total_leads": len(leads), "total_accounts": len(companies), "total_activities": len(activities), "pipeline_value": round(sum(self._safe_float(deal.get("value")) for deal in open_deals), 2), "closed_revenue": round(sum(self._safe_float(deal.get("value")) for deal in won_deals), 2)}, "detail_rows": self._generic_rows(deals[:50], ["name", "stage", "ownerName", "value", "expectedCloseDate"]), "summary_groups": self._group_sum(open_deals, deal_stage, lambda item: item.get("value")), "matrix": {}, "charts": []}

    async def _calculate_metrics(self, state: ReportState) -> ReportState:
        try:
            content = self._build_report_content(state)
            state["metrics"] = content.get("metrics", {})
            state["detail_rows"] = content.get("detail_rows", [])
            state["summary_groups"] = content.get("summary_groups", [])
            state["matrix"] = content.get("matrix", {})
            state["charts"] = content.get("charts", [])
            if content.get("title"):
                state["report_title"] = content["title"]
        except Exception as exc:
            logger.error("Error calculating report metrics: %s", exc)
            state["metrics"] = {}
            state["detail_rows"] = []
            state["summary_groups"] = []
            state["matrix"] = {}
            state["charts"] = []
            state["error"] = f"Metric calculation failed: {exc}"
            self._record_degraded_reason(state, "Metric calculation fell back to an empty report.")
        return state

    async def _generate_charts(self, state: ReportState) -> ReportState:
        state.setdefault("charts", [])
        return state

    def _build_fallback_insights(self, report_type: str, metrics: Dict[str, Any]) -> List[str]:
        if "pipeline_value" in metrics:
            return [
                f"Pipeline currently stands at {self._format_currency(metrics.get('pipeline_value'))}.",
                f"Weighted forecast is {self._format_currency(metrics.get('weighted_pipeline') or metrics.get('weighted_forecast'))}.",
                "The stage mix and owner distribution in the report show where execution focus will matter most.",
            ]
        if "conversion_rate" in metrics:
            return [
                f"Overall conversion is {metrics.get('conversion_rate', 0):.1f}%.",
                "Source and owner breakouts highlight where qualification and follow-up are strongest.",
                "The report can be used to tighten funnel stages with the biggest drop-offs.",
            ]
        if "total_activities" in metrics:
            return [
                f"The selected period includes {metrics.get('total_activities', 0)} tracked activities.",
                "Activity mix can be used to coach toward higher-value work patterns.",
                "Overdue and incomplete items should be reviewed quickly to avoid follow-up gaps.",
            ]
        if "total_cases" in metrics:
            return [
                f"There are {metrics.get('total_cases', 0)} cases in scope for the selected period.",
                "Owner and priority patterns highlight support workload concentration.",
                "Escalated and breached cases should drive operational review first.",
            ]
        return [
            f"{report_type.replace('_', ' ').title()} was generated from live CRM data.",
            "Use the grouped sections and detailed rows to drill into the biggest movements.",
        ]

    def _build_fallback_recommendations(self, report_type: str, metrics: Dict[str, Any]) -> List[str]:
        if "pipeline_value" in metrics:
            return [
                "Review the largest open deals first and make sure next steps are current.",
                "Coach owners with the biggest pipeline but weakest conversion outcomes.",
                "Use stage-level bottlenecks to refine the deal process and forecast confidence.",
            ]
        if "conversion_rate" in metrics:
            return [
                "Double down on the sources and reps producing the cleanest conversion rates.",
                "Tighten first-contact SLAs for untouched leads.",
                "Adjust nurture steps where qualified leads are stalling before conversion.",
            ]
        if "total_cases" in metrics:
            return [
                "Review escalated and breached cases with queue owners first.",
                "Rebalance case ownership where one rep or queue is overloaded.",
                "Use SLA and priority patterns to refine queue routing rules.",
            ]
        return [
            "Use the saved definition and schedule features to keep this view recurring.",
            "Turn the strongest grouped insight into one or two focused actions for the team.",
        ]

    def _format_metrics_for_llm(self, metrics: Dict[str, Any]) -> str:
        lines: List[str] = []
        for key, value in metrics.items():
            lines.append(f"{key}: {value}")
        return "\n".join(lines)

    async def _analyze_insights(self, state: ReportState) -> ReportState:
        metrics = state.get("metrics", {})
        report_type = state["report_type"]
        custom_query = state.get("custom_query") or ""
        try:
            prompt = f"""
You are analyzing a CRM report.

Report type: {report_type}
Report mode: {state.get("report_mode", "SUMMARY")}
Custom query: {custom_query or "N/A"}

Key metrics:
{self._format_metrics_for_llm(metrics)}

Return:
INSIGHTS:
- ...

RECOMMENDATIONS:
- ...
"""
            response = await self.llm.ainvoke(prompt)
            content = str(response.content)
            insights: List[str] = []
            recommendations: List[str] = []
            section = None
            for raw_line in content.splitlines():
                line = raw_line.strip()
                if "INSIGHTS:" in line.upper():
                    section = "insights"
                    continue
                if "RECOMMENDATIONS:" in line.upper():
                    section = "recommendations"
                    continue
                if line.startswith("- "):
                    value = line[2:].strip()
                    if section == "insights":
                        insights.append(value)
                    elif section == "recommendations":
                        recommendations.append(value)
            state["insights"] = insights[:5] or self._build_fallback_insights(report_type, metrics)
            state["recommendations"] = recommendations[:5] or self._build_fallback_recommendations(report_type, metrics)
        except Exception as exc:
            logger.error("Error analyzing report insights: %s", exc)
            self._record_degraded_reason(state, "AI report narrative was unavailable; metric-based insights were used instead.")
            state["insights"] = self._build_fallback_insights(report_type, metrics)
            state["recommendations"] = self._build_fallback_recommendations(report_type, metrics)
        return state

    def _build_fallback_summary(self, report_title: str, metrics: Dict[str, Any], insights: List[str]) -> str:
        if insights:
            return f"{report_title} generated from live CRM data. {insights[0]}"
        if metrics:
            return f"{report_title} generated from live CRM data with {len(metrics)} top-level metrics."
        return f"{report_title} generated from the available CRM data."

    def _build_summary_section(self, summary_groups: List[Dict[str, Any]]) -> Dict[str, Any]:
        return {"title": "Grouped Summary", "type": "summary", "content": summary_groups}

    def _build_table_section(self, detail_rows: List[Dict[str, Any]]) -> Dict[str, Any]:
        return {"title": "Detailed Rows", "type": "table", "content": detail_rows}

    def _build_matrix_section(self, matrix: Dict[str, Any]) -> Dict[str, Any]:
        return {"title": "Matrix View", "type": "matrix", "content": matrix}

    async def _create_report(self, state: ReportState) -> ReportState:
        report_type = state["report_type"]
        report_mode = state.get("report_mode", "SUMMARY").upper()
        template = self.REPORT_TEMPLATES.get(report_type, {})
        state["report_title"] = state.get("report_title") or template.get("title", report_type.replace("_", " ").title())
        try:
            summary_prompt = f"""
Write a concise 2-3 sentence executive summary for this CRM report.

Report title: {state["report_title"]}
Metrics:
{self._format_metrics_for_llm(state.get("metrics", {}))}

Top insights:
{chr(10).join(f"- {item}" for item in state.get("insights", []))}
"""
            response = await self.llm.ainvoke(summary_prompt)
            state["report_summary"] = str(response.content).strip() or self._build_fallback_summary(state["report_title"], state.get("metrics", {}), state.get("insights", []))
        except Exception as exc:
            logger.error("Error generating report summary: %s", exc)
            self._record_degraded_reason(state, "AI executive summary unavailable; using metric-based fallback summary.")
            state["report_summary"] = self._build_fallback_summary(state["report_title"], state.get("metrics", {}), state.get("insights", []))

        sections: List[Dict[str, Any]] = [{"title": "Key Metrics", "type": "metrics", "content": state.get("metrics", {})}]
        if report_mode == "TABULAR":
            if state.get("detail_rows"):
                sections.append(self._build_table_section(state["detail_rows"]))
            if state.get("summary_groups"):
                sections.append(self._build_summary_section(state["summary_groups"]))
        elif report_mode == "MATRIX":
            if state.get("matrix") and state["matrix"].get("rows"):
                sections.append(self._build_matrix_section(state["matrix"]))
            elif state.get("summary_groups"):
                sections.append(self._build_summary_section(state["summary_groups"]))
            if state.get("detail_rows"):
                sections.append(self._build_table_section(state["detail_rows"][:50]))
        else:
            if state.get("summary_groups"):
                sections.append(self._build_summary_section(state["summary_groups"]))
            if state.get("charts"):
                sections.append({"title": "Visualizations", "type": "charts", "content": state.get("charts", [])})
            if state.get("matrix") and state["matrix"].get("rows"):
                sections.append(self._build_matrix_section(state["matrix"]))
            if state.get("detail_rows"):
                sections.append(self._build_table_section(state["detail_rows"][:25]))

        sections.extend([
            {"title": "Insights", "type": "insights", "content": state.get("insights", [])},
            {"title": "Recommendations", "type": "recommendations", "content": state.get("recommendations", [])},
        ])
        state["sections"] = sections
        return state


def get_report_agent() -> ReportAgent:
    return ReportAgent(backend_url="http://crm-backend:8080")
