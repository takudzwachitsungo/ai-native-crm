# Phase 6 AI Ops and Governance QA

Phase 6 hardens the AI governance surface so admins can see whether the assistant is healthy, what it can access, which tools it is using, and whether operations are degrading.

## What This Phase Covers

- Safe runtime metadata from `/governance/capabilities`, including provider, model, streaming, RAG settings, and non-secret configuration flags.
- Operational audit metrics from `/governance/summary`, including failure rate, fallback rate, action success, top tools, events by day, and latency.
- Chat audit enrichment with latency, model, response size, history size, tool calls, degraded mode, and source counts.
- Governance UI visibility for runtime, ops health, tool coverage, top tools, latency, fallbacks, and audit storage.
- Audit filtering verification for focused QA and support triage.

## Run The Eval

```bash
npm run eval:ai-ops
```

Optional environment overrides:

```bash
CRM_OPS_EVAL_EMAIL=takudzwa@gmail.com
CRM_OPS_EVAL_PASSWORD=@ukta0022.
CRM_OPS_EVAL_WORKSPACE=
CRM_API_URL=http://localhost:8080
CRM_AI_URL=http://localhost:8000
npm run eval:ai-ops
```

## Expected Result

The eval should pass these checks:

- Governance capabilities expose runtime metadata without leaking API keys.
- Governance capabilities expose enterprise AI tool domains and tool names.
- Governance summary exposes health, failure/fallback rates, latency, tool counts, and event trend fields.
- A real chat request creates an audited `chat_completion` event with latency metrics.
- Audit event filtering returns only the requested event type.

## QA Notes

- If the chat check fails but capabilities and summary pass, verify the AI service can reach the Java backend and that the configured model provider is available.
- If latency count is zero, generate a chat response from the app or rerun the eval after the AI service is rebuilt.
- If audit storage shows `jsonl_fallback`, Postgres audit persistence is degraded and should be investigated before UAT.
