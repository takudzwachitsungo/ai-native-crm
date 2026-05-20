# Phase 11 AI Enterprise Hardening QA

Phase 11 turns the remaining AI maturity items into testable platform capabilities.

## What This Phase Covers

- RAG scheduler can use either a static JWT or service-account login with token refresh.
- Scheduler status and capabilities expose auth mode and token rotation state without exposing secrets.
- Prometheus-style `/metrics` endpoint exports AI audit, latency, provider error, token, and scheduler metrics.
- High-risk AI actions are routed into an approval queue instead of direct execution.
- RAG indexing stores chunk metadata and semantic search returns an adjusted score for ranking.
- A real-user question eval suite covers sales performance, top deals, and operational attention prompts.

## Run The Eval

```bash
npm run eval:ai-enterprise
```

Optional environment overrides:

```bash
CRM_AI_ENTERPRISE_EVAL_EMAIL=takudzwa@gmail.com
CRM_AI_ENTERPRISE_EVAL_PASSWORD=@ukta0022.
CRM_AI_ENTERPRISE_EVAL_WORKSPACE=
CRM_API_URL=http://localhost:8080
CRM_AI_URL=http://localhost:8000
npm run eval:ai-enterprise
```

## Service-Account Scheduler Mode

Static JWT mode remains supported for development:

```bash
AI_RAG_SCHEDULER_AUTH_MODE=jwt
AI_RAG_SCHEDULER_ACCESS_TOKEN=<jwt>
AI_RAG_SCHEDULER_TOKEN_EXPIRES_AT=2026-06-30T00:00:00Z
```

Service-account mode is preferred for production-like refresh:

```bash
AI_RAG_SCHEDULER_AUTH_MODE=service_account
AI_RAG_SERVICE_ACCOUNT_EMAIL=ai-indexer@example.com
AI_RAG_SERVICE_ACCOUNT_PASSWORD=<secret>
AI_RAG_SERVICE_ACCOUNT_WORKSPACE=<optional-workspace-slug>
AI_RAG_SERVICE_ACCOUNT_REFRESH_BUFFER_SECONDS=300
```

Use a real secret store for the password in production. The service caches the token and refreshes it before expiry.

## Approval Workflow

High-risk proposals such as `bulk_update_records` are not directly executable. They can be submitted to:

```http
POST /actions/approvals
GET /actions/approvals
POST /actions/approvals/{approval_id}/approve
POST /actions/approvals/{approval_id}/reject
```

This is intentionally a gate before enabling broader writeback power.

## Observability

External monitoring can scrape:

```http
GET /metrics
```

The endpoint emits Prometheus text metrics for recent AI events, failures, degraded responses, provider errors, latency P95, token usage, and scheduler configuration.

External monitoring assets are available under `ops/observability`:

- Prometheus scrape config and AI alert rules.
- Grafana provisioning and a starter AI service dashboard.
- Local compose stack via `npm run observability:up`.

See `docs/AI_OBSERVABILITY_RUNBOOK.md` for operational instructions.
