# AI Governance And Copilot Architecture

This document describes the current AI integration structure for the CRM and the governance layer added around assistant activity, insight lifecycle, and safe writeback actions.

## Service Boundary

The platform uses a three-part architecture:

- The React frontend owns user experience, chat streaming, insight badges, and AI governance status display.
- The Java Spring Boot backend remains the system of record for CRM data, authentication, RBAC, tenant isolation, reporting, documents, integrations, notifications, and realtime events.
- The Python FastAPI AI service owns LLM orchestration, CRM assistant workflows, AI custom reports, lead scoring, forecasting, embeddings, semantic search, insight generation, and safe AI action proposals.

The AI service does not bypass the Java backend. It receives the authenticated user's JWT, validates it through the backend, and uses that same user token when reading or writing CRM records.

## Current AI Capabilities

The AI service currently supports:

- Authenticated CRM assistant chat.
- Server-sent event streaming for chat responses.
- Tenant/user-scoped conversation history.
- Resilient conversation history persistence with JSONL fallback when vector storage is unavailable.
- CRM data tools for leads, deals, contacts, companies, tasks, invoices, quotes, products, events, documents, emails, and dashboard stats.
- Lead scoring with fallback behavior.
- Forecast generation and forecast submission/review support.
- AI custom report generation.
- Embeddings and semantic search.
- Batch RAG indexing for documents, emails, support cases, tasks, and core CRM records.
- Deterministic operational insights for records, including hot, stuck, inactive, at risk, overdue, and closing soon states.
- Persistent team insight inbox with lifecycle state, assignment, status filters, and audit capture.
- AI governance capability discovery.
- AI audit event listing for the authenticated user.
- AI governance operational summaries for event volume, fallback usage, failure rate, latency, tool calls, action health, top tools, trend counts, and recent failures.
- Safe AI runtime discovery for provider, model, streaming, RAG, storage mode, and non-secret configuration flags.
- Provider operations tracking for LLM call count, token usage when available, model attribution, sanitized provider errors, and optional configured cost estimates.
- Confirmed safe action proposals and execution for low-risk writeback.
- First-class read-only AI grounding for campaigns, support cases, contracts, field service, integrations, and revenue operations.

## Governance Layer

The governance layer is implemented in the Python AI service.

Key files:

- `ai-service/app/services/ai_audit_store.py`
- `ai-service/app/services/ai_action_service.py`
- `ai-service/app/services/insight_state_store.py`
- `ai-service/app/main.py`
- `src/lib/ai-api.ts`
- `src/pages/Chat.tsx`

## AI Audit Log

The audit store records important AI activity:

- Chat completions.
- Streaming chat completions.
- Insight generation.
- Insight lifecycle updates.
- AI action proposals.
- AI action executions.

Storage behavior:

- The service tries to create and use a Postgres table named `ai_audit_events`.
- If Postgres initialization fails, it falls back to JSONL at `AI_AUDIT_FALLBACK_PATH`.

Relevant endpoints:

```http
GET /governance/capabilities
GET /governance/audit
GET /governance/summary
```

The capabilities endpoint exposes safe runtime metadata such as model, provider, streaming support, RAG settings, tool domains, available tools, cost-tracking configuration, and boolean configuration flags. It must never expose raw API keys, passwords, tokens, or connection strings.

The summary endpoint powers operational panels in the frontend governance workspace. It aggregates recent AI events for the authenticated user and workspace, including event counts, degraded/fallback responses, failure rate, latency average/P95/max, safe action execution success rate, tool-call volume, top tools, token usage, model usage, provider errors, optional cost estimates, recent failures, event trends, and whether audit storage is using Postgres or JSONL fallback.

## Safe AI Actions

AI writeback is intentionally conservative.

The current action framework supports:

- `create_task`: creates a CRM task after explicit confirmation.
- `create_followup_sequence`: creates up to five CRM follow-up tasks after explicit confirmation.
- `draft_email`: creates a draft email after explicit confirmation; it does not send externally.
- `draft_proposal_email`: creates a proposal-style draft email after explicit confirmation; it does not send externally.
- `update_deal_stage`: moves a deal to a selected pipeline stage after explicit confirmation.
- `create_case_followup_task`: creates a support-case follow-up task after explicit confirmation.
- `draft_case_response_email`: creates a support response email draft after explicit confirmation; it does not send externally.
- `create_campaign_followup_sequence`: creates up to five campaign follow-up tasks after explicit confirmation.
- `draft_contract_renewal_email`: creates a contract renewal email draft after explicit confirmation; it does not send externally.
- `create_work_order_followup_task`: creates a field-service work-order follow-up task after explicit confirmation.
- `create_revenue_ops_review_task`: creates a revenue-ops review task after explicit confirmation.
- `recommend_update`: returns a structured recommendation when direct execution is not enabled.

Guardrails:

- No destructive actions.
- No external email sending from the AI action endpoint.
- Follow-up sequences are capped to five tasks.
- Deal stage updates require an explicit target deal and supported stage.
- Newer enterprise-domain actions create only tasks or email drafts.
- Every proposal and execution is audit logged.
- Java backend RBAC and tenant checks still apply.
- Execution requires `confirmed: true`.

Relevant endpoints:

```http
POST /actions/propose
POST /actions/execute
```

## RAG Indexing

The semantic retrieval layer can now index richer CRM knowledge domains in batches.

Relevant endpoints:

```http
POST /rag/index
GET /rag/index/status
GET /rag/scheduler/status
POST /rag/scheduler/run
POST /search/semantic?query=...&entity_type=all
```

Supported batch domains:

- `documents`
- `emails`
- `cases`
- `tasks`
- `leads`
- `deals`
- `contacts`

Indexing still reads data through the Java backend using the authenticated user's JWT, then writes tenant-scoped embeddings into Postgres/pgvector. RAG indexing runs are audit logged as `rag_index_completed`.

The AI service also exposes a production-oriented scheduler path. Background scheduling is disabled by default and can be enabled with `AI_RAG_SCHEDULER_ENABLED=true`, `AI_RAG_SCHEDULER_ACCESS_TOKEN`, `AI_RAG_SCHEDULER_INTERVAL_SECONDS`, `AI_RAG_SCHEDULER_DOMAINS`, and `AI_RAG_SCHEDULER_LIMIT`. The manual scheduler endpoint uses the signed-in user's JWT and records `trigger=manual_scheduler` in audit metadata.

Runtime governance metadata includes alert thresholds for failure rate, fallback rate, P95 latency, and provider errors. These thresholds are used by the audit summary health calculation and surfaced in the AI Governance page so QA can compare current AI health against configured operational expectations.

Scheduler access tokens should be rotated. Configure `AI_RAG_SCHEDULER_TOKEN_EXPIRES_AT` and `AI_RAG_SCHEDULER_TOKEN_ROTATION_WARNING_DAYS` so the governance page can show whether rotation is healthy, due, expired, or missing expiry metadata. The token value itself is never returned by capability or status endpoints.

For production-like operation, prefer service-account scheduler mode with `AI_RAG_SCHEDULER_AUTH_MODE=service_account`, `AI_RAG_SERVICE_ACCOUNT_EMAIL`, and `AI_RAG_SERVICE_ACCOUNT_PASSWORD`. The AI service logs in through the Java backend, caches the token, and refreshes it before expiry. Store the service-account password in a real secret store for production deployments.

External observability is available through `GET /metrics`, which emits Prometheus-style metrics for recent AI events, failed/degraded responses, provider errors, latency P95, token usage, and scheduler configuration.

Deployable observability assets live in `ops/observability`:

- `prometheus.yml` scrapes the AI service and Java backend.
- `alerts/ai-service.rules.yml` defines starter AI health alerts.
- `grafana/dashboards/crm-ai-service-overview.json` provides a starter dashboard.
- `docker-compose.observability.yml` runs Prometheus and Grafana locally.

High-risk writebacks are gated through the approval workflow:

```http
POST /actions/approvals
GET /actions/approvals
POST /actions/approvals/{approval_id}/approve
POST /actions/approvals/{approval_id}/reject
```

RAG indexing now records chunk metadata and retrieval ranking metadata. This gives us a tuning surface for long documents, email threads, and future re-ranking improvements as real customer documents grow.

The governance page is the AI control room. It shows:

- Runtime model/provider, RAG settings, and secret readiness.
- Audit volume, recent failures, latency, fallback rate, provider errors, and cost metadata.
- Safe action guardrails and approval policy by risk level.
- Persistent insight inbox state for active, assigned, snoozed, and dismissed insights.
- RAG index coverage, scheduler status, and scheduler token rotation state.

Example proposal request:

```json
{
  "intent": "Create a follow-up task for this deal tomorrow",
  "action_type": "create_task",
  "entity_type": "deal",
  "entity_id": "deal-uuid",
  "payload": {
    "title": "Follow up on proposal",
    "priority": "HIGH"
  }
}
```

Example execution request:

```json
{
  "proposal_id": "proposal-uuid",
  "action_type": "create_task",
  "confirmed": true,
  "payload": {
    "title": "Follow up on proposal",
    "description": "AI-suggested follow-up",
    "dueDate": "2026-05-15T09:00:00",
    "priority": "HIGH",
    "status": "PENDING",
    "relatedEntityType": "deal",
    "relatedEntityId": "deal-uuid"
  }
}
```

## Insight Lifecycle

Insights are still generated dynamically, but each user can now store lifecycle state for generated insight IDs.

Supported states:

- `active`
- `dismissed`
- `snoozed`
- `assigned`

Relevant endpoints:

```http
GET /insights?context=dashboard
GET /insights?context=dashboard&include_inactive=true
GET /insights/inbox
GET /insights/inbox?status=assigned
PATCH /insights/{insight_id}/state
GET /insights/state
```

Generated insights are snapshotted into a persisted inbox with first-seen, last-seen, and seen-count metadata. Lifecycle state is scoped by tenant and user. Dismissed and currently snoozed insights are hidden from the default `/insights` response unless `include_inactive=true`, but they remain available in `/insights/inbox` for admin review and filtering.

## Frontend Integration

The frontend AI client now exposes:

- `getAIGovernanceCapabilities`
- `getAIAuditEvents`
- `getAIGovernanceSummary`
- `proposeAIAction`
- `executeAIAction`
- `updateInsightLifecycle`

The chat page displays a lightweight governed status when the AI service reports audit logging is enabled. Assistant responses can also propose a follow-up task; the user must confirm the action card before the task is created through the backend.

The app also includes an AI Governance workspace at:

```text
/ai-governance
```

This page shows:

- AI audit logging status.
- Runtime provider, model, streaming, RAG, and storage posture.
- RAG index coverage and manual refresh controls.
- Supported safe action capabilities.
- Current guardrails.
- Operational AI summary cards for event volume, degraded responses, failure/fallback rates, latency, LLM calls, token usage, provider errors, safe-action health, audit storage, top tools, domain coverage, cost tracking, and recent failures.
- Recent AI audit events with event-type filtering.
- A team insight inbox with persisted records, summary counts, status filters, assignment, snooze/dismiss, and convert-to-task controls.
- A safe action composer for preparing confirmed task or draft-email actions during QA/admin review.

## Enterprise Domain Grounding

The assistant can now retrieve live data from the newer enterprise modules instead of treating them as generic search terms.

Covered read-only domains:

- Campaigns and marketing performance through `search_campaigns` and `get_campaign_statistics`.
- Support cases, SLA state, and assignment queues through `search_cases`, `get_case_statistics`, and `get_case_assignment_queue`.
- Contracts and renewals through `search_contracts`.
- Field service work orders and technician workload through `search_work_orders` and `get_work_order_statistics`.
- Workspace integrations through `get_integrations`.
- Revenue operations through `get_revenue_ops_summary`.

These tools still run through the Java backend using the authenticated user's JWT, so backend RBAC and tenant isolation remain the enforcement point. Phase 5 adds only low-risk task and draft-email writeback for these domains; richer status-changing actions should be added later only with explicit confirmation, audit logging, and domain-specific guardrails.

## Remaining Enterprise AI Work

The next maturity steps are:

- Expand the governance workspace with provider/model administration and alerting thresholds.
- Expand safe actions beyond low-risk task and draft-email creation only where the product needs richer status-changing workflows.
- Add confirmed safe writeback actions for integrations where the product needs them.
- Add deeper persistent insight inbox views with convert-to-task actions and team assignment flows.
- Add scheduled/background RAG refresh jobs and extend indexing to notes and call transcripts when those modules are available.
- Add token usage, provider-specific error monitoring, and cost attribution per workspace.
- Replace webhook user-token payloads with signed internal service events.
