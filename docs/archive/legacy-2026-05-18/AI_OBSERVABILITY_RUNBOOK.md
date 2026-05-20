# AI Observability Runbook

This runbook covers the external monitoring layer for the CRM AI service. The in-app AI Governance page is useful for operators, but production monitoring should also run outside the application.

## What Is Monitored

- AI service availability through `GET /metrics`.
- Recent AI audit volume through `crm_ai_audit_events_total`.
- Failed AI events through `crm_ai_failed_events_total`.
- Degraded or fallback AI responses through `crm_ai_degraded_events_total`.
- Provider failures through `crm_ai_provider_errors_total`.
- P95 AI operation latency through `crm_ai_latency_p95_ms`.
- Token and LLM call usage through `crm_ai_tokens_total` and `crm_ai_llm_calls_total`.
- RAG scheduler configuration through `crm_ai_rag_scheduler_configured`.
- Java backend metrics through `GET /actuator/prometheus`.

## Local Monitoring Stack

Start the CRM backend and AI service first, then run:

```bash
npm run observability:up
```

Open:

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`
- Grafana login: `admin` / `admin`

Stop the monitoring stack with:

```bash
npm run observability:down
```

## Files

- Prometheus scrape config: `ops/observability/prometheus.yml`
- Alert rules: `ops/observability/alerts/ai-service.rules.yml`
- Grafana provisioning: `ops/observability/grafana/provisioning`
- Starter dashboard: `ops/observability/grafana/dashboards/crm-ai-service-overview.json`
- Local monitoring compose file: `ops/observability/docker-compose.observability.yml`

## Alerts

The starter rules include:

- `CRMAIServiceMissingMetrics`: AI service metrics cannot be scraped.
- `CRMAIProviderErrors`: provider errors were audited recently.
- `CRMAIFailedEventsHigh`: failed AI events are elevated.
- `CRMAILatencyP95High`: P95 AI latency is above 15 seconds.
- `CRMAIRagSchedulerNotConfigured`: the RAG scheduler is not configured.

These are starting thresholds for QA and staging. Production thresholds should be tuned after real usage patterns are observed.

## Notes

- On Docker Desktop, Prometheus scrapes `host.docker.internal:8000` and `host.docker.internal:8080`.
- In a deployed environment, replace those scrape targets with service DNS names or ingress addresses.
- Add Alertmanager or your cloud monitoring integration when deploying beyond local/staging.
