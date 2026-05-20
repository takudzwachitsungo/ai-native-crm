# Operations Runbook

## Local Runtime

Backend services are normally started with Docker Compose from the backend/runtime compose files. The frontend can be run separately with Vite when developing UI.

Key ports:

- Java backend: `8080`
- Python AI service: `8000`
- Frontend dev server: usually `5175`
- Prometheus: `9090`
- Grafana: `3001`
- MinIO API: configured by compose/env

## Required Secrets

- `JWT_SECRET`
- `DATABASE_PASSWORD`
- `TENANCY_DATABASE_CREDENTIALS_KEY`
- SMTP credentials
- Integration client IDs/secrets
- Integration refresh tokens
- Web push VAPID keys
- AI provider keys
- S3/MinIO credentials

## Observability

- Java health: `/actuator/health`
- Java metrics: `/actuator/prometheus`, restricted by default.
- AI metrics: `/metrics`
- External monitoring assets: `ops/observability`

Start local monitoring:

```bash
npm run observability:up
```

Stop local monitoring:

```bash
npm run observability:down
```

## Deployment Checks

- Confirm production profile is active.
- Confirm public Swagger is disabled.
- Confirm public actuator metrics are disabled.
- Confirm JWT secret is not the default.
- Confirm object storage is configured.
- Confirm database migrations complete.
- Confirm CORS only includes approved frontend origins.
- Confirm email/password reset configuration sends real email.
- Confirm integration credentials are configured through secret management.

## Incident Checks

- Auth failures: inspect login lockout, session revocation, and JWT expiry.
- Tenant data issue: check JWT tenant claim, `TenantContext`, service tenant filters, and RLS policy coverage.
- Realtime issue: inspect SSE subscribers and backend logs.
- Report issue: identify Java standard report vs Python AI custom report path.
- AI issue: check AI service health, `/metrics`, AI governance audit, and provider status.
