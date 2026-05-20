# Phase 7 AI Provider Operations QA

Phase 7 adds provider-level observability on top of the AI governance foundation. The goal is to make the assistant easier to operate in production without exposing secrets or changing CRM behavior.

## What This Phase Covers

- LLM call accounting across intent understanding, response synthesis, streaming response synthesis, and lead extraction.
- Token usage capture when the provider returns usage metadata.
- Provider/model attribution in chat audit events.
- Sanitized provider error capture for degraded/fallback states.
- Optional cost estimates using configured token rates only.
- Governance UI panels for LLM calls, model usage, provider errors, and cost tracking readiness.

## Run The Eval

```bash
npm run eval:ai-provider-ops
```

Optional environment overrides:

```bash
CRM_PROVIDER_OPS_EVAL_EMAIL=takudzwa@gmail.com
CRM_PROVIDER_OPS_EVAL_PASSWORD=@ukta0022.
CRM_PROVIDER_OPS_EVAL_WORKSPACE=
CRM_API_URL=http://localhost:8080
CRM_AI_URL=http://localhost:8000
npm run eval:ai-provider-ops
```

## Optional Cost Configuration

Cost estimates are disabled by default so the system does not show made-up pricing.

Set these in the AI service environment if you want estimates:

```bash
AI_INPUT_TOKEN_COST_PER_1M=0
AI_OUTPUT_TOKEN_COST_PER_1M=0
```

Use the current provider pricing for your selected model. When both values are zero, the UI shows `Not priced` while still tracking calls and tokens.

## Expected Result

The eval should pass these checks:

- Governance capabilities expose provider/model/cost tracking metadata without exposing API keys.
- A real chat request writes audit metadata with provider, model, usage, cost, and provider error fields.
- Governance summary aggregates token usage, usage by model, cost readiness, and provider error counts.

## QA Notes

- Token counts depend on what the provider returns. The system still records call counts even when token fields are unavailable.
- Provider errors are intentionally summarized and truncated before audit storage.
- Cost values are estimates only when token pricing environment variables are configured.
