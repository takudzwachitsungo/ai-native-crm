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

from app.agents.crm_agent import CRMAgent
from app.agents.lead_scoring_agent import LeadScoringAgent
from app.agents.autonomous_lead_scorer import autonomous_scorer
from app.agents.forecasting_agent import get_forecasting_agent
from app.agents.report_agent import get_report_agent
from app.services.autonomous_forecasting_service import autonomous_forecasting
from app.config import settings
from app.services.vector_conversation_store import VectorConversationStore
from app.services.insights_service import InsightsService

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


async def _require_authenticated_user(authorization: Optional[str]) -> str:
    token = _extract_bearer_token(authorization)
    try:
        # Validate token with backend before using claims for user-scoped data access.
        await crm_agent.crm_client._request("GET", "/api/v1/dashboard/stats", user_token=token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authorization token")

    claims = _decode_jwt_payload(token)
    user_id = claims.get("userId")
    if not user_id or not isinstance(user_id, str):
        raise HTTPException(status_code=401, detail="Invalid authorization token")
    return user_id


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    global conversation_store, insights_service
    # Initialize conversation store with embedding service
    conversation_store = VectorConversationStore(crm_agent.embedding_service)
    # Initialize insights service (doesn't need LLM for rule-based insights)
    insights_service = InsightsService(crm_agent.crm_client, None)
    # Start autonomous lead scorer
    await autonomous_scorer.start()
    # Start autonomous forecasting service
    await autonomous_forecasting.start()
    logger.info("AI Service started with vector conversation storage, insights service, autonomous lead scorer, and autonomous forecasting")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await autonomous_scorer.stop()
    await autonomous_forecasting.stop()
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
        
        # Extract user token from Authorization header
        user_token = None
        if authorization and authorization.startswith('Bearer '):
            user_token = authorization[7:]  # Remove 'Bearer ' prefix
        
        # Use user_id from request or generate default
        user_id = request.user_id or "anonymous"
        conversation_id = request.conversation_id
        
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
            sources=result.get("sources")
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
            
            # Extract user token
            user_token = None
            if authorization and authorization.startswith('Bearer '):
                user_token = authorization[7:]
            
            user_id = request.user_id or "anonymous"
            conversation_id = request.conversation_id
            
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


class ForecastingResponse(BaseModel):
    """Response from forecasting agent"""
    success: bool
    monthly_forecasts: Optional[List[Dict[str, Any]]] = None
    team_forecasts: Optional[List[Dict[str, Any]]] = None
    weighted_pipeline: Optional[float] = None
    total_quota: Optional[float] = None
    forecast_vs_quota: Optional[float] = None
    insights: Optional[List[str]] = None
    risks: Optional[List[Dict[str, Any]]] = None
    opportunities: Optional[List[Dict[str, Any]]] = None
    recommendations: Optional[List[str]] = None
    stage_conversion_rates: Optional[Dict[str, float]] = None
    error: Optional[str] = None


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
        
        # Get forecasting agent instance
        agent = get_forecasting_agent(
            backend_url=settings.BACKEND_URL,
            api_token=user_token
        )
        
        logger.info(f"Generating {request.forecast_months}-month sales forecast")
        
        # Run the agent
        result = await agent.generate_forecast(
            user_token=user_token,
            forecast_months=request.forecast_months
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
        
        # Get cached or fresh forecast
        result = await autonomous_forecasting.get_forecast(
            user_token=user_token,
            user_id="default",  # TODO: Extract from JWT
            force_refresh=False
        )
        
        logger.info(f"Forecast retrieved: cached={result.get('cached', False)}")
        
        return ForecastingResponse(**result)
        
    except Exception as e:
        logger.error(f"Error retrieving forecast: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


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
        logger.info(f"Webhook received: Deal created - {payload.deal_id} (${payload.deal_value:,.0f})")
        
        # Trigger autonomous forecast update
        await autonomous_forecasting.handle_deal_webhook(
            deal_id=payload.deal_id,
            event_type="created",
            deal_value=payload.deal_value,
            user_token=payload.user_token,
            user_id="default"
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
        logger.info(f"Webhook received: Deal updated - {payload.deal_id} (${payload.deal_value:,.0f})")
        
        # Trigger autonomous forecast update
        await autonomous_forecasting.handle_deal_webhook(
            deal_id=payload.deal_id,
            event_type="updated",
            deal_value=payload.deal_value,
            user_token=payload.user_token,
            user_id="default"
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
        logger.info(f"Webhook received: Deal closed - {payload.deal_id} ({payload.event_type}, ${payload.deal_value:,.0f})")
        
        # Trigger immediate forecast update
        await autonomous_forecasting.handle_deal_webhook(
            deal_id=payload.deal_id,
            event_type=payload.event_type,
            deal_value=payload.deal_value,
            user_token=payload.user_token,
            user_id="default"
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
    custom_query: Optional[str] = None  # Natural language query for custom reports
    date_range: Optional[Dict[str, str]] = None  # {"start": "2026-01-01", "end": "2026-01-31"}
    filters: Optional[Dict[str, Any]] = None  # Additional filters


class ReportResponse(BaseModel):
    """Response model for generated reports"""
    success: bool
    report_type: str
    title: str
    summary: str
    date_range: Dict[str, str]
    metrics: Dict[str, Any]
    charts: List[Dict[str, Any]]
    insights: List[str]
    recommendations: List[str]
    sections: List[Dict[str, Any]]
    generated_at: str
    error: Optional[str] = None


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
    
    try:
        # Extract user token
        user_token = authorization[7:]
        
        # Get report agent
        report_agent = get_report_agent()
        
        # Generate report
        result = await report_agent.generate_report(
            user_token=user_token,
            report_type=request.report_type,
            custom_query=request.custom_query,
            date_range=request.date_range,
            filters=request.filters
        )
        
        logger.info(f"Report generated: {request.report_type}")
        
        return ReportResponse(**result)
        
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/reports/templates")
async def get_report_templates():
    """
    List available report templates
    
    Returns all standard report templates with their descriptions
    and data requirements.
    """
    report_agent = get_report_agent()
    
    return {
        "success": True,
        "templates": [
            {
                "id": template_id,
                **template_config
            }
            for template_id, template_config in report_agent.REPORT_TEMPLATES.items()
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
