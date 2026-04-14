from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, AsyncGenerator
from datetime import datetime
import logging
import uuid
import json
import base64
import asyncio

from app.agents.crm_agent import CRMAgent
from app.agents.lead_scoring_agent import LeadScoringAgent
from app.agents.autonomous_lead_scorer import autonomous_scorer
from app.agents.report_agent import get_report_agent
from app.services.autonomous_forecasting_service import autonomous_forecasting
from app.config import settings
from app.services.vector_conversation_store import VectorConversationStore
from app.services.insights_service import InsightsService
from app.services.report_definition_store import ReportDefinitionStore
from app.services.report_delivery_service import ReportDeliveryService
from app.services.forecast_submission_store import ForecastSubmissionStore

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="CRM AI Service",
    description="Agentic AI service with LangGraph, MCP, and RAG for CRM",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.FRONTEND_ORIGINS.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize CRM Agent
crm_agent = CRMAgent()

# Initialize Lead Scoring Agent
lead_scoring_agent = None  # Will be initialized after startup

# Initialize insights service
insights_service = None  # Will be initialized after agent startup

# Initialize vector-based conversation store
conversation_store = None  # Will be initialized after agent startup

# Initialize insights monitor
insights_monitor = None  # Will be initialized after agent startup

report_definition_store = ReportDefinitionStore(settings.REPORT_DEFINITIONS_PATH)
forecast_submission_store = ForecastSubmissionStore(settings.FORECAST_SUBMISSIONS_PATH)
report_delivery_service = ReportDeliveryService()
report_scheduler_task: Optional[asyncio.Task] = None


def _extract_bearer_token(authorization: Optional[str]) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization token required")
    return authorization[7:]


def _decode_jwt_payload(token: str) -> Dict[str, Any]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid JWT format")
        payload_part = parts[1]
        padded = payload_part + "=" * (-len(payload_part) % 4)
        decoded = base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8")
        return json.loads(decoded)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authorization token")


def _build_forecast_cache_key(user_id: str, tenant_id: Optional[str]) -> str:
    if tenant_id and isinstance(tenant_id, str):
        return f"{tenant_id}:{user_id}"
    return user_id


def _build_report_scope_key(user_id: str, tenant_id: Optional[str]) -> str:
    if tenant_id and isinstance(tenant_id, str):
        return f"{tenant_id}:{user_id}"
    return user_id


async def _require_authenticated_identity(token: str) -> Dict[str, str]:
    try:
        # Validate token with backend before using claims for user-scoped data access.
        await crm_agent.crm_client._request("GET", "/api/v1/dashboard/stats", user_token=token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authorization token")

    claims = _decode_jwt_payload(token)
    user_id = claims.get("userId")
    tenant_id = claims.get("tenantId")
    if not user_id or not isinstance(user_id, str):
        raise HTTPException(status_code=401, detail="Invalid authorization token")
    if tenant_id is not None and not isinstance(tenant_id, str):
        raise HTTPException(status_code=401, detail="Invalid authorization token")

    return {
        "user_id": user_id,
        "tenant_id": tenant_id or "",
        "forecast_cache_key": _build_forecast_cache_key(user_id, tenant_id),
    }


async def _require_authenticated_user(authorization: Optional[str]) -> str:
    token = _extract_bearer_token(authorization)
    identity = await _require_authenticated_identity(token)
    return identity["user_id"]


async def _refresh_access_token(refresh_token: str) -> str:
    import httpx

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{settings.BACKEND_URL}/api/v1/auth/refresh",
            json={"refreshToken": refresh_token},
        )
        response.raise_for_status()
        payload = response.json()
        token = payload.get("accessToken")
        if not token:
            raise RuntimeError("Refresh token did not return an access token")
        return token


async def _run_scheduled_report(scope_key: str, definition: Dict[str, Any]) -> None:
    report_agent = get_report_agent()
    schedule = definition.get("schedule") or {}
    delivery_email = (schedule.get("delivery_email") or "").strip()
    refresh_token = definition.get("delivery_refresh_token")
    if not delivery_email:
        report_definition_store.update_schedule_run(
            scope_key,
            definition["id"],
            success=False,
            message="Scheduled report skipped because no delivery email is configured",
        )
        return
    if not refresh_token:
        report_definition_store.update_schedule_run(
            scope_key,
            definition["id"],
            success=False,
            message="Scheduled report skipped because no refresh token is available",
        )
        return

    try:
        access_token = await _refresh_access_token(refresh_token)
        report = await report_agent.generate_report(
            user_token=access_token,
            report_type=definition["report_type"],
            report_mode=definition.get("report_mode"),
            custom_query=definition.get("custom_query"),
            date_range=definition.get("date_range"),
            filters=definition.get("filters"),
        )
        if not report.get("success"):
            raise RuntimeError(report.get("error") or "Scheduled report generation failed")
        report_delivery_service.send_report(delivery_email, definition["name"], report)
        report_definition_store.update_schedule_run(scope_key, definition["id"], success=True, message=None)
    except Exception as exc:
        logger.error("Scheduled report delivery failed for %s: %s", definition.get("id"), exc)
        report_definition_store.update_schedule_run(
            scope_key,
            definition["id"],
            success=False,
            message=str(exc),
        )


async def _report_scheduler_loop() -> None:
    while True:
        try:
            for scope_key, definition in report_definition_store.scheduled_due_definitions():
                await _run_scheduled_report(scope_key, definition)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.error("Scheduled report sweep failed: %s", exc)
        await asyncio.sleep(max(settings.REPORT_SCHEDULER_INTERVAL_SECONDS, 30))


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    global conversation_store, insights_service, report_scheduler_task
    # Initialize conversation store with embedding service
    conversation_store = VectorConversationStore(crm_agent.embedding_service)
    # Initialize insights service (doesn't need LLM for rule-based insights)
    insights_service = InsightsService(crm_agent.crm_client, None)
    # Start autonomous lead scorer
    await autonomous_scorer.start()
    # Start autonomous forecasting service
    await autonomous_forecasting.start()
    report_scheduler_task = asyncio.create_task(_report_scheduler_loop())
    logger.info("AI Service started with vector conversation storage, insights service, autonomous lead scorer, and autonomous forecasting")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    global report_scheduler_task
    await autonomous_scorer.stop()
    await autonomous_forecasting.stop()
    if report_scheduler_task:
        report_scheduler_task.cancel()
        try:
            await report_scheduler_task
        except asyncio.CancelledError:
            pass
    logger.info("AI Service stopped")


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    context: Optional[Dict[str, Any]] = None
    stream: bool = False
    user_id: Optional[str] = None
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    message: str
    tool_calls: Optional[List[Dict[str, Any]]] = None
    sources: Optional[List[Dict[str, Any]]] = None
    degraded_mode: bool = False
    degraded_reason: Optional[str] = None


@app.get("/")
async def root():
    return {
        "service": "CRM AI Service",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for Docker"""
    return {
        "status": "healthy",
        "groq_configured": bool(settings.GROQ_API_KEY),
        "crm_backend": settings.CRM_API_URL
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, authorization: Optional[str] = Header(None)):
    """
    Main chat endpoint with agentic capabilities and conversation persistence
    
    The agent can:
    - Search and query CRM data (leads, deals, contacts)
    - Perform semantic search with RAG
    - Execute multi-step workflows
    - Make decisions autonomously using LangGraph
    - Maintain conversation context across sessions
    
    Requires: User JWT token in Authorization header
    """
    # Require authentication
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Authorization token required")
    
    try:
        logger.info(f"Processing chat request with {len(request.messages)} messages")
        authenticated_user_id = await _require_authenticated_user(authorization)
        
        # Extract user token from Authorization header
        user_token = None
        if authorization and authorization.startswith('Bearer '):
            user_token = authorization[7:]  # Remove 'Bearer ' prefix
        
        # Always bind conversations to the authenticated user so tenants cannot
        # accidentally or intentionally write chat history under another id.
        user_id = authenticated_user_id
        conversation_id = request.conversation_id or "default"
        
        # Load conversation history from Redis if not provided
        if not request.messages[:-1] and user_id:
            stored_history = await conversation_store.get_conversation(
                user_id=user_id,
                conversation_id=conversation_id,
                limit=10  # Last 10 messages for context
            )
            history = stored_history
        else:
            # Get conversation history from request
            history = [
                {"role": msg.role, "content": msg.content} 
                for msg in request.messages[:-1]
            ]
        
        # Extract user query (last message)
        user_message = request.messages[-1].content if request.messages else ""
        
        # Save user message
        await conversation_store.save_message(
            user_id=user_id,
            conversation_id=conversation_id,
            message={"role": "user", "content": user_message}
        )
        
        # Run agent with full context and user token
        result = await crm_agent.process_query(
            query=user_message,
            history=history,
            context=request.context,
            user_token=user_token  # Pass user's JWT token to agent
        )
        
        # Save assistant response
        await conversation_store.save_message(
            user_id=user_id,
            conversation_id=conversation_id,
            message={
                "role": "assistant",
                "content": result["message"],
                "tool_calls": result.get("tool_calls"),
                "sources": result.get("sources")
            }
        )
        
        return ChatResponse(
            message=result["message"],
            tool_calls=result.get("tool_calls"),
            sources=result.get("sources"),
            degraded_mode=result.get("degraded_mode", False),
            degraded_reason=result.get("degraded_reason"),
        )
        
    except Exception as e:
        logger.error(f"Error processing chat: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat/stream")
async def chat_stream(request: ChatRequest, authorization: Optional[str] = Header(None)):
    """
    Streaming chat endpoint - returns Server-Sent Events (SSE)
    
    Events:
    - tool_start: When a tool starts executing
    - tool_end: When a tool completes
    - token: Each token of the response
    - done: Final message with complete response
    
    Requires: User JWT token in Authorization header
    """
    # Require authentication
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Authorization token required")
    
    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            logger.info(f"Processing streaming chat request")
            authenticated_user_id = await _require_authenticated_user(authorization)
            
            # Extract user token
            user_token = None
            if authorization and authorization.startswith('Bearer '):
                user_token = authorization[7:]
            
            user_id = authenticated_user_id
            conversation_id = request.conversation_id or "default"
            
            # Load history
            if not request.messages[:-1] and user_id:
                stored_history = await conversation_store.get_conversation(
                    user_id=user_id,
                    conversation_id=conversation_id,
                    limit=10
                )
                history = stored_history
            else:
                history = [
                    {"role": msg.role, "content": msg.content} 
                    for msg in request.messages[:-1]
                ]
            
            user_message = request.messages[-1].content if request.messages else ""
            
            # Save user message
            await conversation_store.save_message(
                user_id=user_id,
                conversation_id=conversation_id,
                message={"role": "user", "content": user_message}
            )
            
            # Stream agent processing
            full_response = ""
            async for event in crm_agent.process_query_stream(
                query=user_message,
                history=history,
                context=request.context,
                user_token=user_token
            ):
                event_type = event.get("type")
                
                if event_type == "tool_start":
                    yield f"data: {json.dumps(event)}\n\n"
                
                elif event_type == "tool_end":
                    yield f"data: {json.dumps(event)}\n\n"
                
                elif event_type == "token":
                    token = event.get("content", "")
                    full_response += token
                    yield f"data: {json.dumps(event)}\n\n"
                
                elif event_type == "done":
                    # Save assistant response
                    await conversation_store.save_message(
                        user_id=user_id,
                        conversation_id=conversation_id,
                        message={
                            "role": "assistant",
                            "content": full_response,
                            "tool_calls": event.get("tool_calls"),
                            "sources": event.get("sources")
                        }
                    )
                    yield f"data: {json.dumps(event)}\n\n"
        
        except Exception as e:
            logger.error(f"Error in streaming: {str(e)}", exc_info=True)
            error_event = {
                "type": "error",
                "message": str(e)
            }
            yield f"data: {json.dumps(error_event)}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@app.post("/embeddings/generate")
async def generate_embeddings(entity_type: str, entity_id: str):
    """Generate embeddings for a CRM entity"""
    try:
        await crm_agent.embedding_service.generate_entity_embedding(
            entity_type=entity_type,
            entity_id=entity_id
        )
        return {"status": "success", "entity_type": entity_type, "entity_id": entity_id}
    except Exception as e:
        logger.error(f"Error generating embeddings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search/semantic")
async def semantic_search(
    query: str,
    entity_type: str,
    limit: int = 5
):
    """Semantic search across CRM entities using RAG"""
    try:
        results = await crm_agent.embedding_service.semantic_search(
            query=query,
            entity_type=entity_type,
            limit=limit
        )
        return {"results": results}
    except Exception as e:
        logger.error(f"Error in semantic search: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/tools")
async def list_tools():
    """List all available MCP tools"""
    return {
        "tools": crm_agent.get_available_tools()
    }


@app.get("/conversation/history")
async def get_conversation_history(
    user_id: Optional[str] = None,
    conversation_id: Optional[str] = None,
    limit: Optional[int] = 50,
    authorization: Optional[str] = Header(None),
):
    """Get conversation history for a user"""
    try:
        authenticated_user_id = await _require_authenticated_user(authorization)
        if user_id and user_id != authenticated_user_id:
            raise HTTPException(status_code=403, detail="Forbidden")

        messages = await conversation_store.get_conversation(
            user_id=authenticated_user_id,
            conversation_id=conversation_id,
            limit=limit
        )
        return {"messages": messages}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting conversation history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/conversation/clear")
async def clear_conversation(
    user_id: Optional[str] = None,
    conversation_id: Optional[str] = None,
    authorization: Optional[str] = Header(None),
):
    """Clear conversation history"""
    try:
        authenticated_user_id = await _require_authenticated_user(authorization)
        if user_id and user_id != authenticated_user_id:
            raise HTTPException(status_code=403, detail="Forbidden")

        success = await conversation_store.clear_conversation(
            user_id=authenticated_user_id,
            conversation_id=conversation_id
        )
        return {"success": success}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error clearing conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/conversation/list")
async def list_conversations(user_id: Optional[str] = None, authorization: Optional[str] = Header(None)):
    """List all conversations for a user"""
    try:
        authenticated_user_id = await _require_authenticated_user(authorization)
        if user_id and user_id != authenticated_user_id:
            raise HTTPException(status_code=403, detail="Forbidden")

        conversations = await conversation_store.list_conversations(authenticated_user_id)
        return {"conversations": conversations}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing conversations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/insights")
async def get_insights(
    context: str = "dashboard",
    authorization: Optional[str] = Header(None)
):
    """Get live AI-powered insights for the authenticated user"""
    try:
        # Extract token from Authorization header
        user_token = None
        if authorization and authorization.startswith("Bearer "):
            user_token = authorization[7:]
        
        if not user_token:
            raise HTTPException(status_code=401, detail="Authorization token required")
        
        # Generate contextual insights
        insights = await insights_service.generate_insights(user_token, context)
        
        return {
            "insights": insights,
            "generated_at": datetime.utcnow().isoformat(),
            "count": len(insights),
            "context": context
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating insights: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ===== LEAD SCORING AGENT ENDPOINTS =====

class LeadScoringRequest(BaseModel):
    """Request to score a lead"""
    lead_id: str


class LeadScoringResponse(BaseModel):
    """Response from lead scoring"""
    success: bool
    lead_id: str
    score: Optional[int] = None
    score_breakdown: Optional[Dict[str, Any]] = None
    qualification: Optional[str] = None
    recommended_actions: Optional[List[str]] = None
    draft_email: Optional[str] = None
    task_created: bool = False
    error: Optional[str] = None
    degraded_mode: bool = False
    degraded_reason: Optional[str] = None


@app.post("/agents/score-lead", response_model=LeadScoringResponse)
async def score_lead(request: LeadScoringRequest, authorization: Optional[str] = Header(None)):
    """
    Score and qualify a lead using the Lead Scoring Agent
    
    This autonomous agent will:
    1. Fetch lead and company data
    2. Calculate AI-powered lead score (0-100)
    3. Qualify as HOT, WARM, or COLD
    4. Draft personalized outreach email
    5. Create follow-up task
    6. Update lead in CRM
    
    Requires: User JWT token in Authorization header
    """
    # Require authentication
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Authorization token required")
    
    try:
        # Extract user token
        user_token = authorization[7:]  # Remove 'Bearer ' prefix
        
        # Initialize agent with token
        global lead_scoring_agent
        if not lead_scoring_agent:
            lead_scoring_agent = LeadScoringAgent(
                backend_url=settings.BACKEND_URL,
                api_token=user_token
            )
        else:
            lead_scoring_agent.api_token = user_token
        
        logger.info(f"Starting lead scoring for lead: {request.lead_id}")
        
        # Run the agent
        result = await lead_scoring_agent.score_lead(request.lead_id)
        
        logger.info(f"Lead scoring complete: {result.get('qualification')} ({result.get('score')}/100)")
        
        return LeadScoringResponse(**result)
        
    except Exception as e:
        logger.error(f"Error in lead scoring: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agents/batch-score-leads")
async def batch_score_leads(authorization: Optional[str] = Header(None)):
    """
    Batch score all NEW leads
    
    Useful for:
    - Daily lead scoring runs
    - Re-scoring after data updates
    - Initial setup of lead scores
    """
    # Require authentication
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Authorization token required")
    
    try:
        user_token = authorization[7:]
        
        # Initialize agent
        global lead_scoring_agent
        if not lead_scoring_agent:
            lead_scoring_agent = LeadScoringAgent(
                backend_url=settings.BACKEND_URL,
                api_token=user_token
            )
        else:
            lead_scoring_agent.api_token = user_token
        
        # Fetch all NEW leads
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.BACKEND_URL}/api/v1/leads",
                headers={"Authorization": f"Bearer {user_token}"},
                params={"status": "NEW", "size": 50},
                timeout=10.0
            )
            response.raise_for_status()
            payload = response.json()
            leads = payload.get("content", []) if isinstance(payload, dict) else []
        
        logger.info(f"Batch scoring {len(leads)} NEW leads")
        
        results = []
        for lead in leads:
            try:
                result = await lead_scoring_agent.score_lead(lead["id"])
                results.append(result)
            except Exception as e:
                logger.error(f"Error scoring lead {lead['id']}: {str(e)}")
                results.append({
                    "success": False,
                    "lead_id": lead["id"],
                    "error": str(e)
                })
        
        successful = sum(1 for r in results if r.get("success"))
        
        return {
            "success": True,
            "total_leads": len(leads),
            "successful": successful,
            "failed": len(leads) - successful,
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error in batch lead scoring: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ===== WEBHOOK ENDPOINTS FOR AUTONOMOUS LEAD SCORING =====

class LeadWebhookPayload(BaseModel):
    """Payload for lead webhook events"""
    lead_id: str
    event_type: str  # 'created' or 'updated'
    user_token: str  # JWT token for API calls


@app.post("/webhooks/lead-created")
async def webhook_lead_created(payload: LeadWebhookPayload):
    """
    Webhook endpoint triggered when a new lead is created
    
    Automatically scores the lead using the autonomous lead scorer
    """
    try:
        logger.info(f"Webhook received: Lead created - {payload.lead_id}")
        
        # Trigger autonomous scoring
        await autonomous_scorer.score_lead_webhook(
            lead_id=payload.lead_id,
            user_token=payload.user_token
        )
        
        return {
            "success": True,
            "message": f"Lead {payload.lead_id} queued for scoring"
        }
        
    except Exception as e:
        logger.error(f"Error in lead-created webhook: {str(e)}")
        # Don't fail the webhook - lead creation should succeed even if scoring fails
        return {
            "success": False,
            "error": str(e),
            "message": "Lead created but scoring failed"
        }


@app.post("/webhooks/lead-updated")
async def webhook_lead_updated(payload: LeadWebhookPayload):
    """
    Webhook endpoint triggered when a lead is updated
    
    Re-scores the lead if significant changes were made
    """
    try:
        logger.info(f"Webhook received: Lead updated - {payload.lead_id}")
        
        # Trigger autonomous scoring (with cooldown check)
        await autonomous_scorer.score_lead_webhook(
            lead_id=payload.lead_id,
            user_token=payload.user_token
        )
        
        return {
            "success": True,
            "message": f"Lead {payload.lead_id} queued for re-scoring"
        }
        
    except Exception as e:
        logger.error(f"Error in lead-updated webhook: {str(e)}")
        # Don't fail the webhook
        return {
            "success": False,
            "error": str(e),
            "message": "Lead updated but re-scoring failed"
        }


# ===== FORECASTING AGENT ENDPOINTS =====

class ForecastingRequest(BaseModel):
    """Request to generate sales forecast"""
    forecast_months: int = 6  # Number of months to forecast
    forecast_category: str = "COMMIT"
    manager_adjustment_percent: float = 0.0
    snapshot_label: Optional[str] = None


class ForecastSubmissionRequest(BaseModel):
    title: str
    forecast_months: int = 6
    forecast_category: str = "COMMIT"
    manager_adjustment_percent: float = 0.0
    snapshot_label: Optional[str] = None
    notes: Optional[str] = None


class ForecastReviewRequest(BaseModel):
    status: str
    review_notes: Optional[str] = None


class ForecastingResponse(BaseModel):
    """Response from forecasting agent"""
    success: bool
    monthly_forecasts: Optional[List[Dict[str, Any]]] = None
    team_forecasts: Optional[List[Dict[str, Any]]] = None
    rollup_hierarchy: Optional[List[Dict[str, Any]]] = None
    forecast_categories: Optional[List[Dict[str, Any]]] = None
    selected_forecast_category: Optional[str] = None
    manager_adjustment_percent: Optional[float] = None
    base_forecast: Optional[float] = None
    final_forecast: Optional[float] = None
    closed_revenue: Optional[float] = None
    open_pipeline: Optional[float] = None
    snapshot_history: Optional[List[Dict[str, Any]]] = None
    variance_to_prior: Optional[Dict[str, Any]] = None
    weighted_pipeline: Optional[float] = None
    total_quota: Optional[float] = None
    forecast_vs_quota: Optional[float] = None
    insights: Optional[List[str]] = None
    risks: Optional[List[Dict[str, Any]]] = None
    opportunities: Optional[List[Dict[str, Any]]] = None
    recommendations: Optional[List[str]] = None
    stage_conversion_rates: Optional[Dict[str, float]] = None
    error: Optional[str] = None
    degraded_mode: bool = False
    degraded_reason: Optional[str] = None


class ForecastSubmissionResponse(BaseModel):
    id: str
    title: str
    forecast_category: str
    manager_adjustment_percent: float
    snapshot_label: Optional[str] = None
    notes: Optional[str] = None
    status: str
    submitted_at: str
    submitted_by_user_id: str
    reviewed_at: Optional[str] = None
    reviewed_by_user_id: Optional[str] = None
    review_notes: Optional[str] = None
    forecast_snapshot: Dict[str, Any]


def _serialize_forecast_submission(submission: Dict[str, Any]) -> Dict[str, Any]:
    return submission


@app.post("/forecasting/generate", response_model=ForecastingResponse)
async def generate_forecast(
    request: ForecastingRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Generate AI-powered sales forecast
    
    This agent will:
    1. Analyze current pipeline and historical deal data
    2. Calculate weighted forecasts using AI-powered probability scoring
    3. Generate monthly projections (default: 6 months)
    4. Provide actionable insights and recommendations
    5. Identify risks (stalled deals) and opportunities (high-value deals)
    
    Requires: User JWT token in Authorization header
    """
    # Require authentication
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Authorization token required")
    
    try:
        # Extract user token
        user_token = authorization[7:]  # Remove 'Bearer ' prefix
        identity = await _require_authenticated_identity(user_token)
        
        logger.info(f"Generating {request.forecast_months}-month sales forecast")
        
        result = await autonomous_forecasting.get_forecast(
            user_token=user_token,
            cache_key=identity["forecast_cache_key"],
            force_refresh=True,
            forecast_months=request.forecast_months,
            forecast_category=request.forecast_category,
            manager_adjustment_percent=request.manager_adjustment_percent,
            snapshot_label=request.snapshot_label,
        )
        
        logger.info(f"Forecast generated: ${result.get('weighted_pipeline', 0):,.0f} weighted pipeline")
        
        return ForecastingResponse(**result)
        
    except Exception as e:
        logger.error(f"Error generating forecast: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/forecasting/latest", response_model=ForecastingResponse)
async def get_latest_forecast(authorization: Optional[str] = Header(None)):
    """
    Get the latest cached forecast (instant response)
    
    Returns cached forecast if available (< 30 minutes old),
    otherwise generates a new one.
    
    Use this endpoint for real-time dashboard displays.
    """
    # Require authentication
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Authorization token required")
    
    try:
        # Extract user token
        user_token = authorization[7:]
        identity = await _require_authenticated_identity(user_token)
        
        # Get cached or fresh forecast
        result = await autonomous_forecasting.get_forecast(
            user_token=user_token,
            cache_key=identity["forecast_cache_key"],
            force_refresh=False
        )
        
        logger.info(f"Forecast retrieved: cached={result.get('cached', False)}")
        
        return ForecastingResponse(**result)
        
    except Exception as e:
        logger.error(f"Error retrieving forecast: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/forecasting/submissions")
async def list_forecast_submissions(authorization: Optional[str] = Header(None)):
    identity = await _require_authenticated_identity(_extract_bearer_token(authorization))
    scope_key = _build_report_scope_key(identity["user_id"], identity["tenant_id"])
    return {
        "success": True,
        "submissions": [
            _serialize_forecast_submission(item)
            for item in forecast_submission_store.list(scope_key)
        ],
    }


@app.post("/forecasting/submissions", response_model=ForecastSubmissionResponse)
async def submit_forecast_for_review(
    request: ForecastSubmissionRequest,
    authorization: Optional[str] = Header(None),
):
    user_token = _extract_bearer_token(authorization)
    identity = await _require_authenticated_identity(user_token)
    scope_key = _build_report_scope_key(identity["user_id"], identity["tenant_id"])

    forecast = await autonomous_forecasting.get_forecast(
        user_token=user_token,
        cache_key=identity["forecast_cache_key"],
        force_refresh=True,
        forecast_months=request.forecast_months,
        forecast_category=request.forecast_category,
        manager_adjustment_percent=request.manager_adjustment_percent,
        snapshot_label=request.snapshot_label or request.title,
    )
    if not forecast.get("success"):
        raise HTTPException(status_code=400, detail=forecast.get("error") or "Unable to generate forecast submission")

    submission = forecast_submission_store.save(
        scope_key,
        {
            "title": request.title,
            "forecast_category": request.forecast_category,
            "manager_adjustment_percent": request.manager_adjustment_percent,
            "snapshot_label": request.snapshot_label,
            "notes": request.notes,
            "submitted_by_user_id": identity["user_id"],
            "forecast_snapshot": {
                "generated_at": forecast.get("generated_at"),
                "final_forecast": forecast.get("final_forecast"),
                "base_forecast": forecast.get("base_forecast"),
                "total_quota": forecast.get("total_quota"),
                "forecast_vs_quota": forecast.get("forecast_vs_quota"),
                "forecast_category": forecast.get("selected_forecast_category"),
                "manager_adjustment_percent": forecast.get("manager_adjustment_percent"),
                "variance_to_prior": forecast.get("variance_to_prior"),
                "snapshot_history": forecast.get("snapshot_history", []),
                "rollup_hierarchy": forecast.get("rollup_hierarchy", []),
            },
        },
    )
    return ForecastSubmissionResponse(**_serialize_forecast_submission(submission))


@app.post("/forecasting/submissions/{submission_id}/review", response_model=ForecastSubmissionResponse)
async def review_forecast_submission(
    submission_id: str,
    request: ForecastReviewRequest,
    authorization: Optional[str] = Header(None),
):
    identity = await _require_authenticated_identity(_extract_bearer_token(authorization))
    scope_key = _build_report_scope_key(identity["user_id"], identity["tenant_id"])
    normalized_status = (request.status or "").strip().upper()
    if normalized_status not in {"APPROVED", "CHANGES_REQUESTED"}:
        raise HTTPException(status_code=400, detail="Forecast review status must be APPROVED or CHANGES_REQUESTED")

    submission = forecast_submission_store.review(
        scope_key,
        submission_id,
        reviewer_user_id=identity["user_id"],
        status=normalized_status,
        review_notes=request.review_notes,
    )
    if not submission:
        raise HTTPException(status_code=404, detail="Forecast submission not found")
    return ForecastSubmissionResponse(**_serialize_forecast_submission(submission))


# ===== DEAL WEBHOOKS FOR AUTONOMOUS FORECASTING =====

class DealWebhookPayload(BaseModel):
    """Payload for deal webhook events"""
    deal_id: str
    event_type: str  # 'created', 'updated', 'closed_won', 'closed_lost'
    deal_value: float
    user_token: str  # JWT token for API calls


@app.post("/webhooks/deal-created")
async def webhook_deal_created(payload: DealWebhookPayload):
    """
    Webhook endpoint triggered when a new deal is created
    
    Automatically updates forecast if deal is significant (>$50K)
    """
    try:
        identity = await _require_authenticated_identity(payload.user_token)
        logger.info(f"Webhook received: Deal created - {payload.deal_id} (${payload.deal_value:,.0f})")
        
        # Trigger autonomous forecast update
        await autonomous_forecasting.handle_deal_webhook(
            deal_id=payload.deal_id,
            event_type="created",
            deal_value=payload.deal_value,
            user_token=payload.user_token,
            cache_key=identity["forecast_cache_key"]
        )
        
        return {
            "success": True,
            "message": f"Deal {payload.deal_id} webhook processed"
        }
        
    except Exception as e:
        logger.error(f"Error in deal-created webhook: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Deal created but forecast update failed"
        }


@app.post("/webhooks/deal-updated")
async def webhook_deal_updated(payload: DealWebhookPayload):
    """
    Webhook endpoint triggered when a deal is updated
    
    Updates forecast if changes are significant (stage change, high value, etc.)
    """
    try:
        identity = await _require_authenticated_identity(payload.user_token)
        logger.info(f"Webhook received: Deal updated - {payload.deal_id} (${payload.deal_value:,.0f})")
        
        # Trigger autonomous forecast update
        await autonomous_forecasting.handle_deal_webhook(
            deal_id=payload.deal_id,
            event_type="updated",
            deal_value=payload.deal_value,
            user_token=payload.user_token,
            cache_key=identity["forecast_cache_key"]
        )
        
        return {
            "success": True,
            "message": f"Deal {payload.deal_id} webhook processed"
        }
        
    except Exception as e:
        logger.error(f"Error in deal-updated webhook: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Deal updated but forecast update failed"
        }


@app.post("/webhooks/deal-closed")
async def webhook_deal_closed(payload: DealWebhookPayload):
    """
    Webhook endpoint triggered when a deal is closed (won or lost)
    
    Always updates forecast immediately for closed deals
    """
    try:
        identity = await _require_authenticated_identity(payload.user_token)
        logger.info(f"Webhook received: Deal closed - {payload.deal_id} ({payload.event_type}, ${payload.deal_value:,.0f})")
        
        # Trigger immediate forecast update
        await autonomous_forecasting.handle_deal_webhook(
            deal_id=payload.deal_id,
            event_type=payload.event_type,
            deal_value=payload.deal_value,
            user_token=payload.user_token,
            cache_key=identity["forecast_cache_key"]
        )
        
        return {
            "success": True,
            "message": f"Deal {payload.deal_id} closed, forecast updated"
        }
        
    except Exception as e:
        logger.error(f"Error in deal-closed webhook: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Deal closed but forecast update failed"
        }


# ===== REPORT GENERATION ENDPOINTS =====

class ReportRequest(BaseModel):
    """Request model for report generation"""
    report_type: str  # "sales_pipeline", "lead_conversion", "activity_summary", "revenue_forecast", "team_performance", "custom"
    report_mode: Optional[str] = "SUMMARY"
    custom_query: Optional[str] = None  # Natural language query for custom reports
    date_range: Optional[Dict[str, str]] = None  # {"start": "2026-01-01", "end": "2026-01-31"}
    filters: Optional[Dict[str, Any]] = None  # Additional filters


class ReportDefinitionRequest(BaseModel):
    """Request model for saved report definitions"""
    name: str
    report_type: str
    report_mode: Optional[str] = "SUMMARY"
    custom_query: Optional[str] = None
    date_range: Optional[Dict[str, str]] = None
    filters: Optional[Dict[str, Any]] = None
    schedule: Optional[Dict[str, Any]] = None
    delivery_refresh_token: Optional[str] = None


class ReportDefinitionResponse(BaseModel):
    id: str
    name: str
    report_type: str
    report_mode: str
    custom_query: Optional[str] = None
    date_range: Optional[Dict[str, str]] = None
    filters: Optional[Dict[str, Any]] = None
    schedule: Optional[Dict[str, Any]] = None
    created_at: str
    updated_at: str


class ReportResponse(BaseModel):
    """Response model for generated reports"""
    success: bool
    report_type: str
    report_mode: Optional[str] = None
    title: str
    summary: str
    date_range: Dict[str, str]
    metrics: Dict[str, Any]
    charts: List[Dict[str, Any]]
    insights: List[str]
    recommendations: List[str]
    sections: List[Dict[str, Any]]
    generated_at: str
    definition_id: Optional[str] = None
    error: Optional[str] = None
    degraded_mode: bool = False
    degraded_reason: Optional[str] = None


def _serialize_report_definition(definition: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": definition["id"],
        "name": definition["name"],
        "report_type": definition["report_type"],
        "report_mode": definition.get("report_mode", "SUMMARY"),
        "custom_query": definition.get("custom_query"),
        "date_range": definition.get("date_range"),
        "filters": definition.get("filters"),
        "schedule": definition.get("schedule"),
        "created_at": definition["created_at"],
        "updated_at": definition["updated_at"],
    }


@app.post("/reports/generate", response_model=ReportResponse)
async def generate_report(request: ReportRequest, authorization: Optional[str] = Header(None)):
    """
    Generate a comprehensive AI-powered report
    
    Supports:
    - Standard Templates: sales_pipeline, lead_conversion, activity_summary, revenue_forecast, team_performance
    - Custom Reports: Use report_type="custom" with a natural language query
    - Date Filtering: Specify date_range for time-bound analysis
    - Advanced Filters: Additional filtering criteria
    
    Returns:
    - Metrics: Key performance indicators
    - Charts: Visualization configurations
    - Insights: AI-generated observations
    - Recommendations: Actionable suggestions
    """
    # Require authentication
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Authorization token required")
    
    if request.report_type != "custom":
        raise HTTPException(
            status_code=400,
            detail="Standard report templates now run from the Java backend. Use report_type='custom' for AI-generated reports."
        )

    try:
        # Extract user token
        user_token = authorization[7:]
        
        # Get report agent
        report_agent = get_report_agent()
        
        # Generate report
        result = await report_agent.generate_report(
            user_token=user_token,
            report_type=request.report_type,
            report_mode=request.report_mode,
            custom_query=request.custom_query,
            date_range=request.date_range,
            filters=request.filters
        )
        
        logger.info(f"Report generated: {request.report_type}")
        
        return ReportResponse(**result)
        
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/reports/definitions")
async def list_report_definitions(authorization: Optional[str] = Header(None)):
    """List saved report definitions for the authenticated tenant/user scope."""
    identity = await _require_authenticated_identity(_extract_bearer_token(authorization))
    scope_key = _build_report_scope_key(identity["user_id"], identity["tenant_id"])
    return {
        "success": True,
        "definitions": [
            _serialize_report_definition(item)
            for item in report_definition_store.list(scope_key)
            if item.get("report_type") == "custom"
        ],
    }


@app.post("/reports/definitions", response_model=ReportDefinitionResponse)
async def save_report_definition(
    request: ReportDefinitionRequest,
    authorization: Optional[str] = Header(None),
):
    """Create a saved report definition for the authenticated tenant/user scope."""
    identity = await _require_authenticated_identity(_extract_bearer_token(authorization))
    scope_key = _build_report_scope_key(identity["user_id"], identity["tenant_id"])
    if request.report_type != "custom":
        raise HTTPException(
            status_code=400,
            detail="Only custom AI report definitions are stored in the AI service."
        )

    definition = report_definition_store.save(
        scope_key,
        {
            "name": request.name,
            "report_type": request.report_type,
            "report_mode": request.report_mode,
            "custom_query": request.custom_query,
            "date_range": request.date_range,
            "filters": request.filters or {},
            "schedule": request.schedule,
            "delivery_refresh_token": request.delivery_refresh_token,
        },
    )
    return ReportDefinitionResponse(**_serialize_report_definition(definition))


@app.delete("/reports/definitions/{definition_id}")
async def delete_report_definition(definition_id: str, authorization: Optional[str] = Header(None)):
    """Delete a saved report definition."""
    identity = await _require_authenticated_identity(_extract_bearer_token(authorization))
    scope_key = _build_report_scope_key(identity["user_id"], identity["tenant_id"])
    return {
        "success": report_definition_store.delete(scope_key, definition_id),
    }


@app.post("/reports/definitions/{definition_id}/run", response_model=ReportResponse)
async def run_saved_report_definition(definition_id: str, authorization: Optional[str] = Header(None)):
    """Generate a report from a saved definition."""
    identity = await _require_authenticated_identity(_extract_bearer_token(authorization))
    scope_key = _build_report_scope_key(identity["user_id"], identity["tenant_id"])
    definition = report_definition_store.get(scope_key, definition_id)
    if not definition:
        raise HTTPException(status_code=404, detail="Saved report definition not found")
    if definition.get("report_type") != "custom":
        raise HTTPException(
            status_code=400,
            detail="Standard report definitions now run from the Java backend."
        )

    user_token = _extract_bearer_token(authorization)
    report_agent = get_report_agent()
    result = await report_agent.generate_report(
        user_token=user_token,
        report_type=definition["report_type"],
        report_mode=definition.get("report_mode"),
        custom_query=definition.get("custom_query"),
        date_range=definition.get("date_range"),
        filters=definition.get("filters"),
    )
    result["definition_id"] = definition_id
    return ReportResponse(**result)


@app.get("/reports/templates")
async def get_report_templates():
    """
    List available report templates
    
    Returns all standard report templates with their descriptions
    and data requirements.
    """
    return {
        "success": True,
        "templates": [
            {
                "id": "custom",
                "category": "Custom AI",
                "title": "Custom AI Report",
                "description": "Generate an AI-authored report from a natural-language prompt.",
                "data_requirements": ["natural-language-query"],
                "metrics": ["custom"],
                "display_modes": ["SUMMARY"],
                "default_mode": "SUMMARY",
            }
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
