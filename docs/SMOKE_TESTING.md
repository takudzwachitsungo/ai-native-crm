# Smoke Testing

Run the live smoke suite from the repo root:

```bash
npm run smoke
```

The smoke runner validates:
- backend actuator health
- AI service health
- JWT login
- leads list
- deals list
- documents list
- AI chat
- AI forecasting
- AI report generation
- AI lead scoring when the tenant has at least one lead

Environment variables:
- `CRM_API_URL`
  - default: `http://localhost:8080`
- `CRM_AI_URL`
  - default: `http://localhost:8000`
- `CRM_SMOKE_EMAIL`
  - default: `john@example.com`
- `CRM_SMOKE_PASSWORD`
  - default: `Codex123!`
- `CRM_SMOKE_SKIP_AI`
  - set to `true` to skip AI endpoint checks
- `CRM_SMOKE_TIMEOUT_MS`
  - request timeout in milliseconds

Examples:

```bash
npm run smoke
```

```bash
CRM_SMOKE_EMAIL=admin@example.com CRM_SMOKE_PASSWORD=secret npm run smoke
```

```bash
CRM_SMOKE_SKIP_AI=true npm run smoke
```
