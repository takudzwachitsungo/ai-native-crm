from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, PlainTextResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, AsyncGenerator
from datetime import datetime, timedelta
import logging
import uuid
import json
import base64
import asyncio
import time
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
from app.services.ai_audit_store import AIAuditStore
from app.services.ai_action_service import AIActionService
from app.services.ai_approval_store import AIApprovalStore
from app.services.insight_state_store import InsightStateStore

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
ai_audit_store = AIAuditStore(settings.DATABASE_URL, settings.AI_AUDIT_FALLBACK_PATH)
ai_action_service = AIActionService(crm_agent.crm_client)
ai_approval_store = AIApprovalStore(settings.AI_APPROVAL_STORE_PATH)
insight_state_store = InsightStateStore(settings.AI_INSIGHT_STATE_PATH)
report_scheduler_task: Optional[asyncio.Task] = None
rag_scheduler_task: Optional[asyncio.Task] = None
rag_scheduler_state: Dict[str, Any] = {
    "enabled": settings.AI_RAG_SCHEDULER_ENABLED,
    "configured": bool(settings.AI_RAG_SCHEDULER_ACCESS_TOKEN or (settings.AI_RAG_SERVICE_ACCOUNT_EMAIL and settings.AI_RAG_SERVICE_ACCOUNT_PASSWORD)),
    "running": False,
    "last_run_at": None,
    "last_success_at": None,
    "last_failure_at": None,
    "last_result": None,
    "last_error": None,
    "run_count": 0,
    "failure_count": 0,
}


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


def _runtime_capabilities() -> Dict[str, Any]:
    return {
        "provider": "groq" if settings.GROQ_API_KEY else "not_configured",
        "model": settings.CHAT_MODEL,
        "embedding_model": settings.EMBEDDING_MODEL,
        "temperature": settings.TEMPERATURE,
        "max_tokens": settings.MAX_TOKENS,
        "streaming": True,
        "rag": {
            "enabled": True,
            "embedding_dimensions": settings.EMBEDDING_DIMENSIONS,
            "similarity_threshold": settings.SIMILARITY_THRESHOLD,
            "top_k_results": settings.TOP_K_RESULTS,
        },
        "storage": {
            "conversation_store": "vector_redis_with_jsonl_fallback",
            "audit_store": "postgres_with_jsonl_fallback",
            "insight_state_store": "json_file",
        },
        "cost_tracking": {
            "enabled": settings.AI_INPUT_TOKEN_COST_PER_1M > 0 or settings.AI_OUTPUT_TOKEN_COST_PER_1M > 0,
            "currency": "USD",
            "input_token_cost_per_1m": settings.AI_INPUT_TOKEN_COST_PER_1M,
            "output_token_cost_per_1m": settings.AI_OUTPUT_TOKEN_COST_PER_1M,
        },
        "alert_thresholds": {
            "failure_rate_percent": settings.AI_FAILURE_RATE_ALERT_THRESHOLD,
            "fallback_rate_percent": settings.AI_FALLBACK_RATE_ALERT_THRESHOLD,
            "latency_p95_ms": settings.AI_LATENCY_P95_ALERT_MS,
            "provider_errors": settings.AI_PROVIDER_ERROR_ALERT_THRESHOLD,
        },
        "secrets": {
            "groq_configured": bool(settings.GROQ_API_KEY),
            "smtp_configured": bool(settings.SMTP_HOST and settings.SMTP_USERNAME and settings.SMTP_PASSWORD),
        },
    }


def _rag_scheduler_domains() -> List[str]:
    return [
        domain.strip()
        for domain in settings.AI_RAG_SCHEDULER_DOMAINS.split(",")
        if domain.strip()
    ] or ["documents", "emails", "cases", "tasks"]


def _scheduler_token_rotation_status() -> Dict[str, Any]:
    """Expose rotation readiness without ever returning the scheduler token."""
    auth_mode = (settings.AI_RAG_SCHEDULER_AUTH_MODE or "jwt").lower()
    service_account_configured = bool(settings.AI_RAG_SERVICE_ACCOUNT_EMAIL and settings.AI_RAG_SERVICE_ACCOUNT_PASSWORD)
    expires_at = settings.AI_RAG_SCHEDULER_TOKEN_EXPIRES_AT
    if auth_mode == "service_account":
        cached_expiry = crm_agent.crm_client.service_account_token_expires_at
        return {
            "status": "ok" if service_account_configured else "not_configured",
            "auth_mode": "service_account",
            "expires_at": datetime.utcfromtimestamp(cached_expiry).isoformat() if cached_expiry else None,
            "rotation_required": False,
            "rotation_warning": False,
            "warning_days": settings.AI_RAG_SCHEDULER_TOKEN_ROTATION_WARNING_DAYS,
            "refresh_buffer_seconds": settings.AI_RAG_SERVICE_ACCOUNT_REFRESH_BUFFER_SECONDS,
        }

    if not settings.AI_RAG_SCHEDULER_ACCESS_TOKEN:
        return {
            "status": "not_configured",
            "auth_mode": "jwt",
            "expires_at": expires_at,
            "rotation_required": False,
            "rotation_warning": False,
            "warning_days": settings.AI_RAG_SCHEDULER_TOKEN_ROTATION_WARNING_DAYS,
        }

    if not expires_at:
        return {
            "status": "expiry_not_configured",
            "auth_mode": "jwt",
            "expires_at": None,
            "rotation_required": True,
            "rotation_warning": True,
            "warning_days": settings.AI_RAG_SCHEDULER_TOKEN_ROTATION_WARNING_DAYS,
        }

    try:
        normalized = expires_at.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(normalized)
        if parsed.tzinfo is not None:
            parsed = parsed.replace(tzinfo=None)
    except ValueError:
        return {
            "status": "invalid_expiry",
            "auth_mode": "jwt",
            "expires_at": expires_at,
            "rotation_required": True,
            "rotation_warning": True,
            "warning_days": settings.AI_RAG_SCHEDULER_TOKEN_ROTATION_WARNING_DAYS,
        }

    now = datetime.utcnow()
    warning_at = parsed - timedelta(days=max(settings.AI_RAG_SCHEDULER_TOKEN_ROTATION_WARNING_DAYS, 1))
    if parsed <= now:
        status = "expired"
    elif warning_at <= now:
        status = "rotation_due"
    else:
        status = "ok"
    return {
        "status": status,
        "auth_mode": "jwt",
        "expires_at": parsed.isoformat(),
        "rotation_required": status in {"expired", "invalid_expiry"},
        "rotation_warning": status in {"expired", "rotation_due"},
        "warning_days": settings.AI_RAG_SCHEDULER_TOKEN_ROTATION_WARNING_DAYS,
        "warning_at": warning_at.isoformat(),
    }


def _estimate_ai_cost(usage: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    usage = usage or {}
    input_tokens = int(usage.get("input_tokens") or 0)
    output_tokens = int(usage.get("output_tokens") or 0)
    input_rate = settings.AI_INPUT_TOKEN_COST_PER_1M
    output_rate = settings.AI_OUTPUT_TOKEN_COST_PER_1M
    configured = input_rate > 0 or output_rate > 0
    estimated_usd = None
    if configured:
        estimated_usd = round(((input_tokens / 1_000_000) * input_rate) + ((output_tokens / 1_000_000) * output_rate), 6)
    return {
        "currency": "USD",
        "estimated_usd": estimated_usd,
        "pricing_configured": configured,
    }


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


async def _run_rag_index_job(
    *,
    token: str,
    domains: Optional[List[str]] = None,
    limit: Optional[int] = None,
    trigger: str = "manual",
) -> Dict[str, Any]:
    global rag_scheduler_state
    if rag_scheduler_state.get("running"):
        raise RuntimeError("RAG indexing is already running")

    rag_scheduler_state["running"] = True
    started_at = datetime.utcnow()
    try:
        identity = await _require_authenticated_identity(token)
        token_handle = crm_agent.crm_client.set_user_token(token)
        try:
            result = await crm_agent.embedding_service.index_knowledge_domains(
                domains or _rag_scheduler_domains(),
                tenant_id=identity["tenant_id"],
                limit=max(1, min(limit or settings.AI_RAG_SCHEDULER_LIMIT, 500)),
            )
        finally:
            crm_agent.crm_client.reset_user_token(token_handle)

        completed_at = datetime.utcnow().isoformat()
        rag_scheduler_state.update({
            "running": False,
            "last_run_at": started_at.isoformat(),
            "last_success_at": completed_at if not result.get("errors") else rag_scheduler_state.get("last_success_at"),
            "last_failure_at": completed_at if result.get("errors") else rag_scheduler_state.get("last_failure_at"),
            "last_result": result,
            "last_error": result.get("errors") or None,
            "run_count": int(rag_scheduler_state.get("run_count") or 0) + 1,
            "failure_count": int(rag_scheduler_state.get("failure_count") or 0) + (1 if result.get("errors") else 0),
        })
        ai_audit_store.record(
            event_type="rag_index_completed",
            user_id=identity["user_id"],
            tenant_id=identity["tenant_id"] or None,
            outcome="success" if not result.get("errors") else "partial",
            action="rag_index",
            metadata={**result, "trigger": trigger, "scheduler": True},
        )
        return result
    except Exception as exc:
        rag_scheduler_state.update({
            "running": False,
            "last_run_at": started_at.isoformat(),
            "last_failure_at": datetime.utcnow().isoformat(),
            "last_error": str(exc),
            "failure_count": int(rag_scheduler_state.get("failure_count") or 0) + 1,
        })
        raise


async def _rag_scheduler_loop() -> None:
    while True:
        try:
            if settings.AI_RAG_SCHEDULER_ENABLED:
                scheduler_token = await crm_agent.crm_client.get_rag_scheduler_token()
                await _run_rag_index_job(
                    token=scheduler_token,
                    domains=_rag_scheduler_domains(),
                    limit=settings.AI_RAG_SCHEDULER_LIMIT,
                    trigger="scheduled",
                )
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.error("Scheduled RAG indexing failed: %s", exc)
        await asyncio.sleep(max(settings.AI_RAG_SCHEDULER_INTERVAL_SECONDS, 300))


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    global conversation_store, insights_service, report_scheduler_task, rag_scheduler_task
    ai_audit_store.initialize()
    # Initialize conversation store with embedding service
    conversation_store = VectorConversationStore(
        crm_agent.embedding_service,
        fallback_path=settings.CONVERSATION_FALLBACK_PATH,
    )
    # Initialize insights service (doesn't need LLM for rule-based insights)
    insights_service = InsightsService(crm_agent.crm_client, None)
    # Start autonomous lead scorer
    await autonomous_scorer.start()
    # Start autonomous forecasting service
    await autonomous_forecasting.start()
    report_scheduler_task = asyncio.create_task(_report_scheduler_loop())
    if settings.AI_RAG_SCHEDULER_ENABLED:
        rag_scheduler_task = asyncio.create_task(_rag_scheduler_loop())
    logger.info("AI Service started with vector conversation storage, insights service, autonomous lead scorer, and autonomous forecasting")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    global report_scheduler_task, rag_scheduler_task
    await autonomous_scorer.stop()
    await autonomous_forecasting.stop()
    if report_scheduler_task:
        report_scheduler_task.cancel()
        try:
            await report_scheduler_task
        except asyncio.CancelledError:
            pass
    if rag_scheduler_task:
        rag_scheduler_task.cancel()
        try:
            await rag_scheduler_task
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


class AIActionProposalRequest(BaseModel):
    intent: str
    action_type: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None


class AIActionExecuteRequest(BaseModel):
    action_type: str
    payload: Dict[str, Any]
    confirmed: bool = False
    proposal_id: Optional[str] = None


class AIApprovalCreateRequest(BaseModel):
    proposal: Dict[str, Any]
    reason: Optional[str] = None


class AIApprovalReviewRequest(BaseModel):
    note: Optional[str] = None


class InsightLifecycleUpdateRequest(BaseModel):
    status: str
    assigned_to: Optional[str] = None
    snoozed_until: Optional[str] = None
    note: Optional[str] = None


class RagIndexRequest(BaseModel):
    domains: Optional[List[str]] = None
    limit: int = 100


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
        request_id = str(uuid.uuid4())
        user_token = _extract_bearer_token(authorization)
        identity = await _require_authenticated_identity(user_token)
        
        # Always bind conversations to the authenticated user so tenants cannot
        # accidentally or intentionally write chat history under another id.
        user_id = identity["user_id"]
        tenant_id = identity["tenant_id"] or None
        conversation_id = request.conversation_id or "default"
        agent_context = dict(request.context or {})
        agent_context.update({"tenant_id": tenant_id, "user_id": user_id})
        
        # Load conversation history from Redis if not provided
        if not request.messages[:-1] and user_id:
            stored_history = await conversation_store.get_conversation(
                user_id=user_id,
                conversation_id=conversation_id,
                limit=10,  # Last 10 messages for context
                tenant_id=tenant_id
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
            tenant_id=tenant_id,
            message={"role": "user", "content": user_message}
        )
        
        # Run agent with full context and user token
        started_at = time.perf_counter()
        result = await crm_agent.process_query(
            query=user_message,
            history=history,
            context=agent_context,
            user_token=user_token  # Pass user's JWT token to agent
        )
        latency_ms = round((time.perf_counter() - started_at) * 1000, 1)
        ai_audit_store.record(
            event_type="chat_completion",
            user_id=user_id,
            tenant_id=tenant_id,
            outcome="success",
            conversation_id=conversation_id,
            request_id=request_id,
            prompt=user_message,
            metadata={
                "tool_calls": result.get("tool_calls") or [],
                "sources_count": len(result.get("sources") or []),
                "degraded_mode": result.get("degraded_mode", False),
                "latency_ms": latency_ms,
                "history_messages": len(history),
                "response_characters": len(result.get("message") or ""),
                "runtime_provider": "groq" if settings.GROQ_API_KEY else "not_configured",
                "runtime_model": settings.CHAT_MODEL,
                "usage": result.get("usage") or {},
                "cost": _estimate_ai_cost(result.get("usage") or {}),
                "provider_errors": result.get("provider_errors") or [],
            },
        )
        
        # Save assistant response
        await conversation_store.save_message(
            user_id=user_id,
            conversation_id=conversation_id,
            tenant_id=tenant_id,
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
        
    except HTTPException:
        raise
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
            request_id = str(uuid.uuid4())
            user_token = _extract_bearer_token(authorization)
            identity = await _require_authenticated_identity(user_token)
            
            user_id = identity["user_id"]
            tenant_id = identity["tenant_id"] or None
            conversation_id = request.conversation_id or "default"
            agent_context = dict(request.context or {})
            agent_context.update({"tenant_id": tenant_id, "user_id": user_id})
            
            # Load history
            if not request.messages[:-1] and user_id:
                stored_history = await conversation_store.get_conversation(
                    user_id=user_id,
                    conversation_id=conversation_id,
                    limit=10,
                    tenant_id=tenant_id
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
                tenant_id=tenant_id,
                message={"role": "user", "content": user_message}
            )
            
            # Stream agent processing
            full_response = ""
            started_at = time.perf_counter()
            streamed_tool_events = 0
            async for event in crm_agent.process_query_stream(
                query=user_message,
                history=history,
                context=agent_context,
                user_token=user_token
            ):
                event_type = event.get("type")
                
                if event_type == "tool_start":
                    streamed_tool_events += 1
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
                        tenant_id=tenant_id,
                        message={
                            "role": "assistant",
                            "content": full_response,
                            "tool_calls": event.get("tool_calls"),
                            "sources": event.get("sources")
                        }
                    )
                    ai_audit_store.record(
                        event_type="chat_stream_completion",
                        user_id=user_id,
                        tenant_id=tenant_id,
                        outcome="success",
                        conversation_id=conversation_id,
                        request_id=request_id,
                        prompt=user_message,
                        metadata={
                            "tool_calls": event.get("tool_calls") or [],
                            "sources_count": len(event.get("sources") or []),
                            "degraded_mode": event.get("degraded_mode", False),
                            "latency_ms": round((time.perf_counter() - started_at) * 1000, 1),
                            "history_messages": len(history),
                            "response_characters": len(full_response),
                            "streamed_tool_events": streamed_tool_events,
                            "runtime_provider": "groq" if settings.GROQ_API_KEY else "not_configured",
                            "runtime_model": settings.CHAT_MODEL,
                            "usage": event.get("usage") or {},
                            "cost": _estimate_ai_cost(event.get("usage") or {}),
                            "provider_errors": event.get("provider_errors") or [],
                        },
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
async def generate_embeddings(
    entity_type: str,
    entity_id: str,
    authorization: Optional[str] = Header(None),
):
    """Generate embeddings for a CRM entity"""
    user_token = _extract_bearer_token(authorization)
    identity = await _require_authenticated_identity(user_token)
    token_handle = crm_agent.crm_client.set_user_token(user_token)
    try:
        await crm_agent.embedding_service.generate_entity_embedding(
            entity_type=entity_type,
            entity_id=entity_id,
            tenant_id=identity["tenant_id"] or None,
        )
        return {"status": "success", "entity_type": entity_type, "entity_id": entity_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating embeddings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        crm_agent.crm_client.reset_user_token(token_handle)


@app.post("/search/semantic")
async def semantic_search(
    query: str,
    entity_type: str,
    limit: int = 5,
    authorization: Optional[str] = Header(None),
):
    """Semantic search across CRM entities using RAG"""
    user_token = _extract_bearer_token(authorization)
    identity = await _require_authenticated_identity(user_token)
    try:
        results = await crm_agent.embedding_service.semantic_search(
            query=query,
            entity_type=entity_type,
            limit=limit,
            tenant_id=identity["tenant_id"] or None,
        )
        return {"results": results}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in semantic search: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/rag/index")
async def index_rag_knowledge(request: RagIndexRequest, authorization: Optional[str] = Header(None)):
    """Batch-index richer CRM knowledge into the semantic retrieval store."""
    user_token = _extract_bearer_token(authorization)
    identity = await _require_authenticated_identity(user_token)
    token_handle = crm_agent.crm_client.set_user_token(user_token)
    try:
        result = await crm_agent.embedding_service.index_knowledge_domains(
            request.domains or ["documents", "emails", "cases", "tasks"],
            tenant_id=identity["tenant_id"],
            limit=max(1, min(request.limit, 500)),
        )
        ai_audit_store.record(
            event_type="rag_index_completed",
            user_id=identity["user_id"],
            tenant_id=identity["tenant_id"] or None,
            outcome="success" if not result.get("errors") else "partial",
            action="rag_index",
            metadata=result,
        )
        return result
    except HTTPException:
        raise
    except Exception as exc:
        ai_audit_store.record(
            event_type="rag_index_completed",
            user_id=identity["user_id"],
            tenant_id=identity["tenant_id"] or None,
            outcome="failed",
            action="rag_index",
            metadata={"error": str(exc), "domains": request.domains or []},
        )
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        crm_agent.crm_client.reset_user_token(token_handle)


@app.get("/rag/index/status")
async def rag_index_status(authorization: Optional[str] = Header(None)):
    """Return indexed semantic record counts for the authenticated workspace."""
    token = _extract_bearer_token(authorization)
    identity = await _require_authenticated_identity(token)
    counts = await crm_agent.embedding_service.count_embeddings_by_type(identity["tenant_id"] or None)
    return {
        "counts": counts,
        "total": sum(counts.values()),
        "domains": ["documents", "emails", "cases", "tasks", "leads", "deals", "contacts"],
    }


@app.get("/metrics", response_class=PlainTextResponse)
async def ai_metrics():
    """Prometheus-compatible operational metrics for external monitoring."""
    events = ai_audit_store.list_recent(limit=1000)
    total = len(events)
    failed = sum(1 for event in events if event.get("outcome") == "failed")
    degraded = sum(1 for event in events if (event.get("metadata") or {}).get("degraded_mode") is True)
    provider_errors = 0
    latencies: List[float] = []
    llm_calls = 0
    total_tokens = 0
    for event in events:
        metadata = event.get("metadata") or {}
        provider_errors += len(metadata.get("provider_errors") or [])
        latency = metadata.get("latency_ms")
        if isinstance(latency, (int, float)):
            latencies.append(float(latency))
        usage = metadata.get("usage") or {}
        if isinstance(usage, dict):
            llm_calls += int(usage.get("calls") or 0)
            total_tokens += int(usage.get("total_tokens") or 0)

    latencies.sort()
    p95 = latencies[min(len(latencies) - 1, int(len(latencies) * 0.95))] if latencies else 0
    lines = [
        "# HELP crm_ai_audit_events_total Recent AI audit events in the metrics window.",
        "# TYPE crm_ai_audit_events_total gauge",
        f"crm_ai_audit_events_total {total}",
        "# HELP crm_ai_failed_events_total Recent failed AI events.",
        "# TYPE crm_ai_failed_events_total gauge",
        f"crm_ai_failed_events_total {failed}",
        "# HELP crm_ai_degraded_events_total Recent degraded AI responses.",
        "# TYPE crm_ai_degraded_events_total gauge",
        f"crm_ai_degraded_events_total {degraded}",
        "# HELP crm_ai_provider_errors_total Recent provider errors captured by AI audit metadata.",
        "# TYPE crm_ai_provider_errors_total gauge",
        f"crm_ai_provider_errors_total {provider_errors}",
        "# HELP crm_ai_latency_p95_ms P95 latency for audited AI operations.",
        "# TYPE crm_ai_latency_p95_ms gauge",
        f"crm_ai_latency_p95_ms {round(p95, 1)}",
        "# HELP crm_ai_llm_calls_total Recent audited LLM calls.",
        "# TYPE crm_ai_llm_calls_total gauge",
        f"crm_ai_llm_calls_total {llm_calls}",
        "# HELP crm_ai_tokens_total Recent audited LLM tokens.",
        "# TYPE crm_ai_tokens_total gauge",
        f"crm_ai_tokens_total {total_tokens}",
        "# HELP crm_ai_rag_scheduler_configured Whether the RAG scheduler credential path is configured.",
        "# TYPE crm_ai_rag_scheduler_configured gauge",
        f"crm_ai_rag_scheduler_configured {1 if rag_scheduler_state.get('configured') else 0}",
    ]
    return "\n".join(lines) + "\n"


@app.get("/rag/scheduler/status")
async def rag_scheduler_status(authorization: Optional[str] = Header(None)):
    """Return scheduler configuration and last-run state without exposing secrets."""
    token = _extract_bearer_token(authorization)
    identity = await _require_authenticated_identity(token)
    counts = await crm_agent.embedding_service.count_embeddings_by_type(identity["tenant_id"] or None)
    return {
        **rag_scheduler_state,
        "configured": bool(settings.AI_RAG_SCHEDULER_ACCESS_TOKEN or (settings.AI_RAG_SERVICE_ACCOUNT_EMAIL and settings.AI_RAG_SERVICE_ACCOUNT_PASSWORD)),
        "auth_mode": settings.AI_RAG_SCHEDULER_AUTH_MODE,
        "configured_domains": _rag_scheduler_domains(),
        "configured_limit": settings.AI_RAG_SCHEDULER_LIMIT,
        "interval_seconds": settings.AI_RAG_SCHEDULER_INTERVAL_SECONDS,
        "token_rotation": _scheduler_token_rotation_status(),
        "counts": counts,
        "total_indexed": sum(counts.values()),
    }


@app.post("/rag/scheduler/run")
async def run_rag_scheduler_now(request: RagIndexRequest, authorization: Optional[str] = Header(None)):
    """Run the same RAG indexing job path used by the background scheduler."""
    token = _extract_bearer_token(authorization)
    try:
        result = await _run_rag_index_job(
            token=token,
            domains=request.domains or _rag_scheduler_domains(),
            limit=request.limit,
            trigger="manual_scheduler",
        )
        return {"result": result, "state": rag_scheduler_state}
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Manual RAG scheduler run failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/tools")
async def list_tools(authorization: Optional[str] = Header(None)):
    """List all available MCP tools"""
    await _require_authenticated_identity(_extract_bearer_token(authorization))
    return {
        "tools": crm_agent.get_available_tools()
    }


@app.get("/governance/capabilities")
async def ai_governance_capabilities(authorization: Optional[str] = Header(None)):
    """Describe AI copilot governance and safe action capabilities."""
    await _require_authenticated_identity(_extract_bearer_token(authorization))
    return {
        "audit_logging": True,
        "insight_lifecycle": True,
        "runtime": _runtime_capabilities(),
        "tool_domains": [
            "leads",
            "deals",
            "contacts",
            "companies",
            "tasks",
            "calendar",
            "email",
            "documents",
            "quotes",
            "invoices",
            "products",
            "campaigns",
            "support_cases",
            "contracts",
            "field_service",
            "integrations",
            "revenue_ops",
        ],
        "rag_indexing": {
            "enabled": True,
            "domains": ["documents", "emails", "cases", "tasks", "leads", "deals", "contacts"],
            "status_endpoint": "/rag/index/status",
            "index_endpoint": "/rag/index",
            "scheduler": {
                "enabled": settings.AI_RAG_SCHEDULER_ENABLED,
                "configured": bool(settings.AI_RAG_SCHEDULER_ACCESS_TOKEN or (settings.AI_RAG_SERVICE_ACCOUNT_EMAIL and settings.AI_RAG_SERVICE_ACCOUNT_PASSWORD)),
                "auth_mode": settings.AI_RAG_SCHEDULER_AUTH_MODE,
                "interval_seconds": settings.AI_RAG_SCHEDULER_INTERVAL_SECONDS,
                "domains": _rag_scheduler_domains(),
                "status_endpoint": "/rag/scheduler/status",
                "run_endpoint": "/rag/scheduler/run",
                "token_rotation": _scheduler_token_rotation_status(),
            },
        },
        "observability": {
            "metrics_endpoint": "/metrics",
            "metrics_format": "prometheus_text",
        },
        "approvals": {
            "enabled": True,
            "list_endpoint": "/actions/approvals",
            "create_endpoint": "/actions/approvals",
            "approve_endpoint": "/actions/approvals/{approval_id}/approve",
            "reject_endpoint": "/actions/approvals/{approval_id}/reject",
        },
        "tools": crm_agent.get_available_tools(),
        "actions": ai_action_service.capabilities(),
    }


@app.get("/governance/audit")
async def list_ai_audit_events(
    limit: int = 100,
    event_type: Optional[str] = None,
    authorization: Optional[str] = Header(None),
):
    """List AI audit events for the authenticated user and tenant."""
    token = _extract_bearer_token(authorization)
    identity = await _require_authenticated_identity(token)
    events = ai_audit_store.list(
        user_id=identity["user_id"],
        tenant_id=identity["tenant_id"] or None,
        limit=limit,
        event_type=event_type,
    )
    return {"events": events, "count": len(events)}


@app.get("/governance/summary")
async def ai_governance_summary(
    limit: int = 500,
    authorization: Optional[str] = Header(None),
):
    """Summarize recent AI activity for observability dashboards."""
    token = _extract_bearer_token(authorization)
    identity = await _require_authenticated_identity(token)
    return ai_audit_store.summary(
        user_id=identity["user_id"],
        tenant_id=identity["tenant_id"] or None,
        limit=limit,
        failure_rate_threshold=settings.AI_FAILURE_RATE_ALERT_THRESHOLD,
        fallback_rate_threshold=settings.AI_FALLBACK_RATE_ALERT_THRESHOLD,
        latency_p95_threshold_ms=settings.AI_LATENCY_P95_ALERT_MS,
        provider_error_threshold=settings.AI_PROVIDER_ERROR_ALERT_THRESHOLD,
    )


@app.post("/actions/propose")
async def propose_ai_action(request: AIActionProposalRequest, authorization: Optional[str] = Header(None)):
    """Create a safe action proposal that must be confirmed before execution."""
    token = _extract_bearer_token(authorization)
    identity = await _require_authenticated_identity(token)
    proposal = ai_action_service.propose(
        intent=request.intent,
        action_type=request.action_type,
        entity_type=request.entity_type,
        entity_id=request.entity_id,
        payload=request.payload,
    )
    ai_audit_store.record(
        event_type="action_proposed",
        user_id=identity["user_id"],
        tenant_id=identity["tenant_id"] or None,
        outcome="success",
        action=proposal["action_type"],
        prompt=request.intent,
        metadata={"proposal": proposal},
    )
    return proposal


@app.post("/actions/execute")
async def execute_ai_action(request: AIActionExecuteRequest, authorization: Optional[str] = Header(None)):
    """Execute a confirmed non-destructive AI action through the Java backend."""
    token = _extract_bearer_token(authorization)
    identity = await _require_authenticated_identity(token)
    token_handle = crm_agent.crm_client.set_user_token(token)
    started_at = time.perf_counter()
    try:
        result = await ai_action_service.execute(
            action_type=request.action_type,
            payload=request.payload,
            confirmed=request.confirmed,
        )
        ai_audit_store.record(
            event_type="action_executed",
            user_id=identity["user_id"],
            tenant_id=identity["tenant_id"] or None,
            outcome="success",
            action=request.action_type,
            metadata={
                "proposal_id": request.proposal_id,
                "result": result,
                "latency_ms": round((time.perf_counter() - started_at) * 1000, 1),
            },
        )
        return result
    except Exception as exc:
        ai_audit_store.record(
            event_type="action_executed",
            user_id=identity["user_id"],
            tenant_id=identity["tenant_id"] or None,
            outcome="failed",
            action=request.action_type,
            metadata={
                "proposal_id": request.proposal_id,
                "error": str(exc),
                "latency_ms": round((time.perf_counter() - started_at) * 1000, 1),
            },
        )
        raise HTTPException(status_code=400, detail=str(exc))
    finally:
        crm_agent.crm_client.reset_user_token(token_handle)


@app.post("/actions/approvals")
async def create_action_approval(request: AIApprovalCreateRequest, authorization: Optional[str] = Header(None)):
    """Create an approval request for a higher-risk AI action proposal."""
    token = _extract_bearer_token(authorization)
    identity = await _require_authenticated_identity(token)
    approval = ai_approval_store.create(
        tenant_id=identity["tenant_id"] or None,
        requested_by=identity["user_id"],
        proposal=request.proposal,
        reason=request.reason,
    )
    ai_audit_store.record(
        event_type="action_approval_requested",
        user_id=identity["user_id"],
        tenant_id=identity["tenant_id"] or None,
        outcome="success",
        action=request.proposal.get("action_type"),
        metadata={"approval": approval},
    )
    return {"approval": approval}


@app.get("/actions/approvals")
async def list_action_approvals(
    status: Optional[str] = None,
    limit: int = 100,
    authorization: Optional[str] = Header(None),
):
    token = _extract_bearer_token(authorization)
    identity = await _require_authenticated_identity(token)
    approvals = ai_approval_store.list(
        tenant_id=identity["tenant_id"] or None,
        status=status,
        limit=limit,
    )
    return {"approvals": approvals, "count": len(approvals)}


@app.post("/actions/approvals/{approval_id}/approve")
async def approve_action_approval(
    approval_id: str,
    request: AIApprovalReviewRequest,
    authorization: Optional[str] = Header(None),
):
    token = _extract_bearer_token(authorization)
    identity = await _require_authenticated_identity(token)
    try:
        approval = ai_approval_store.review(
            approval_id=approval_id,
            tenant_id=identity["tenant_id"] or None,
            reviewed_by=identity["user_id"],
            status="approved",
            note=request.note,
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="Approval request not found")
    ai_audit_store.record(
        event_type="action_approval_reviewed",
        user_id=identity["user_id"],
        tenant_id=identity["tenant_id"] or None,
        outcome="approved",
        action=(approval.get("proposal") or {}).get("action_type"),
        metadata={"approval": approval},
    )
    return {"approval": approval}


@app.post("/actions/approvals/{approval_id}/reject")
async def reject_action_approval(
    approval_id: str,
    request: AIApprovalReviewRequest,
    authorization: Optional[str] = Header(None),
):
    token = _extract_bearer_token(authorization)
    identity = await _require_authenticated_identity(token)
    try:
        approval = ai_approval_store.review(
            approval_id=approval_id,
            tenant_id=identity["tenant_id"] or None,
            reviewed_by=identity["user_id"],
            status="rejected",
            note=request.note,
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="Approval request not found")
    ai_audit_store.record(
        event_type="action_approval_reviewed",
        user_id=identity["user_id"],
        tenant_id=identity["tenant_id"] or None,
        outcome="rejected",
        action=(approval.get("proposal") or {}).get("action_type"),
        metadata={"approval": approval},
    )
    return {"approval": approval}


@app.get("/conversation/history")
async def get_conversation_history(
    user_id: Optional[str] = None,
    conversation_id: Optional[str] = None,
    limit: Optional[int] = 50,
    authorization: Optional[str] = Header(None),
):
    """Get conversation history for a user"""
    try:
        token = _extract_bearer_token(authorization)
        identity = await _require_authenticated_identity(token)
        authenticated_user_id = identity["user_id"]
        tenant_id = identity["tenant_id"] or None
        if user_id and user_id != authenticated_user_id:
            raise HTTPException(status_code=403, detail="Forbidden")

        messages = await conversation_store.get_conversation(
            user_id=authenticated_user_id,
            conversation_id=conversation_id,
            limit=limit,
            tenant_id=tenant_id
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
        token = _extract_bearer_token(authorization)
        identity = await _require_authenticated_identity(token)
        authenticated_user_id = identity["user_id"]
        tenant_id = identity["tenant_id"] or None
        if user_id and user_id != authenticated_user_id:
            raise HTTPException(status_code=403, detail="Forbidden")

        success = await conversation_store.clear_conversation(
            user_id=authenticated_user_id,
            conversation_id=conversation_id,
            tenant_id=tenant_id
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
        token = _extract_bearer_token(authorization)
        identity = await _require_authenticated_identity(token)
        authenticated_user_id = identity["user_id"]
        tenant_id = identity["tenant_id"] or None
        if user_id and user_id != authenticated_user_id:
            raise HTTPException(status_code=403, detail="Forbidden")

        conversations = await conversation_store.list_conversations(authenticated_user_id, tenant_id)
        return {"conversations": conversations}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing conversations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/insights")
async def get_insights(
    context: str = "dashboard",
    include_inactive: bool = False,
    authorization: Optional[str] = Header(None)
):
    """Get live AI-powered insights for the authenticated user"""
    try:
        user_token = _extract_bearer_token(authorization)
        identity = await _require_authenticated_identity(user_token)
        scope_key = _build_report_scope_key(identity["user_id"], identity["tenant_id"] or None)
        
        # Generate contextual insights
        insights = await insights_service.generate_insights(user_token, context)
        insight_state_store.upsert_insights(scope_key, insights)
        insights = insight_state_store.apply_to_insights(
            scope_key,
            insights,
            include_inactive=include_inactive,
        )
        ai_audit_store.record(
            event_type="insights_generated",
            user_id=identity["user_id"],
            tenant_id=identity["tenant_id"] or None,
            outcome="success",
            action="generate_insights",
            metadata={"context": context, "count": len(insights)},
        )
        
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


@app.get("/insights/inbox")
async def list_insight_inbox(
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    limit: int = 100,
    authorization: Optional[str] = Header(None),
):
    """List persisted generated insights for team/admin review."""
    token = _extract_bearer_token(authorization)
    identity = await _require_authenticated_identity(token)
    scope_key = _build_report_scope_key(identity["user_id"], identity["tenant_id"] or None)
    result = insight_state_store.list_inbox(
        scope_key,
        status=status,
        assigned_to=assigned_to,
        limit=limit,
    )
    ai_audit_store.record(
        event_type="insight_inbox_viewed",
        user_id=identity["user_id"],
        tenant_id=identity["tenant_id"] or None,
        outcome="success",
        action="list_insight_inbox",
        metadata={
            "status": status,
            "assigned_to": assigned_to,
            "count": result.get("count", 0),
        },
    )
    return result


@app.patch("/insights/{insight_id:path}/state")
async def update_insight_lifecycle(
    insight_id: str,
    request: InsightLifecycleUpdateRequest,
    authorization: Optional[str] = Header(None),
):
    """Dismiss, snooze, assign, or reactivate a generated insight."""
    token = _extract_bearer_token(authorization)
    identity = await _require_authenticated_identity(token)
    scope_key = _build_report_scope_key(identity["user_id"], identity["tenant_id"] or None)
    try:
        state = insight_state_store.update(scope_key, insight_id, request.dict())
        ai_audit_store.record(
            event_type="insight_state_updated",
            user_id=identity["user_id"],
            tenant_id=identity["tenant_id"] or None,
            outcome="success",
            action=request.status,
            metadata={"insight_id": insight_id, "state": state},
        )
        return {"state": state}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/insights/state")
async def list_insight_lifecycle_states(authorization: Optional[str] = Header(None)):
    """List saved insight lifecycle states for the authenticated user."""
    token = _extract_bearer_token(authorization)
    identity = await _require_authenticated_identity(token)
    scope_key = _build_report_scope_key(identity["user_id"], identity["tenant_id"] or None)
    return {"states": insight_state_store.list(scope_key)}


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
