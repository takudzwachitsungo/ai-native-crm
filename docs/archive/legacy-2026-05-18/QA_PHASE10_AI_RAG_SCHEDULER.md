# Phase 10 AI RAG Scheduler QA

Phase 10 closes the AI RAG operational loop by proving the same indexing path can be run manually from the product UI and automatically by a background scheduler.

## What This Phase Covers

- Scheduler configuration metadata in AI governance capabilities.
- Runtime alert thresholds for failure rate, fallback rate, latency, and provider errors.
- AI action approval policy metadata for low, medium, high, and destructive risk levels.
- Scheduler token rotation metadata without exposing the token value.
- Scheduler status endpoint with last run, success/failure, counts, configured domains, and interval.
- Manual scheduler run endpoint that uses the authenticated user's JWT and the same job path as the background scheduler.
- AI Governance UI cards for scheduler mode, configured scope, run counts, and last success.
- Audit capture for scheduler-triggered RAG refreshes.

## Run The Eval

```bash
npm run eval:ai-rag-scheduler
```

Optional environment overrides:

```bash
CRM_RAG_SCHEDULER_EVAL_EMAIL=takudzwa@gmail.com
CRM_RAG_SCHEDULER_EVAL_PASSWORD=@ukta0022.
CRM_RAG_SCHEDULER_EVAL_WORKSPACE=
CRM_API_URL=http://localhost:8080
CRM_AI_URL=http://localhost:8000
npm run eval:ai-rag-scheduler
```

## Endpoints

```http
GET /rag/scheduler/status
POST /rag/scheduler/run
GET /governance/capabilities
```

Manual run example:

```json
{
  "domains": ["documents", "emails", "cases", "tasks"],
  "limit": 100
}
```

## Scheduler Environment

The background scheduler is disabled by default so local development stays predictable. Enable it with:

```bash
AI_RAG_SCHEDULER_ENABLED=true
AI_RAG_SCHEDULER_ACCESS_TOKEN=<service-or-admin-jwt>
AI_RAG_SCHEDULER_TOKEN_EXPIRES_AT=2026-06-30T00:00:00Z
AI_RAG_SCHEDULER_TOKEN_ROTATION_WARNING_DAYS=7
AI_RAG_SCHEDULER_INTERVAL_SECONDS=3600
AI_RAG_SCHEDULER_DOMAINS=documents,emails,cases,tasks
AI_RAG_SCHEDULER_LIMIT=100
```

The access token is never returned by status or capability endpoints. Manual refreshes do not require this scheduler token because they use the signed-in user's JWT.

## Expected Result

The eval should pass these checks:

- Governance capabilities expose scheduler endpoints and alert thresholds.
- Governance capabilities expose action approval policy and token rotation metadata.
- Scheduler status reports configuration without secrets.
- Manual scheduler run indexes at least one CRM knowledge record.
- Scheduler status reflects the last run and embedding counts.
- A `rag_index_completed` audit event is recorded with `trigger=manual_scheduler`.

## QA Notes

- The eval expects seeded CRM data in at least one indexed knowledge domain.
- Background scheduling should use a service account token or a rotation strategy before production.
- If background scheduling remains disabled, the manual product refresh path is still available from AI Governance.
