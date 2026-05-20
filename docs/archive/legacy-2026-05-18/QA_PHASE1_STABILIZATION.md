# Phase 1 QA Stabilization

Phase 1 is the fast handoff gate for the newest platform work. It is not a replacement for full UAT, but it catches the regressions we have already seen during development: successful login followed by 403s, realtime authorization failures, report generation/export failures, AI chat persistence issues, insight/governance wiring gaps, and missing tenant/user context.

## What The Gate Covers

- Backend health through Spring Boot actuator.
- AI service health unless explicitly skipped.
- Login response shape, including token, tenant, permissions, and data scopes.
- Anonymous access blocking for protected APIs.
- Authenticated access for dashboard stats, tasks, deals, events, and account notification preferences.
- Realtime SSE authorization, including anonymous access rejection.
- Standard report template discovery, report generation, and PDF export.
- AI chat with authenticated CRM context.
- AI conversation persistence for the same account.
- AI spoofing protection by rejecting another `user_id`.
- AI insights endpoint.
- AI governance capabilities and summary.
- AI safe action proposal requiring confirmation.

## How To Run

Start the backend, AI service, and dependencies first. Then run:

```powershell
cmd /c npm run qa:phase1
```

To run against a specific account/workspace:

```powershell
$env:CRM_QA_EMAIL="takudzwa@gmail.com"
$env:CRM_QA_PASSWORD="@ukta0022."
$env:CRM_QA_WORKSPACE="dala-inc"
cmd /c npm run qa:phase1
```

To skip AI checks while only validating Java backend readiness:

```powershell
$env:CRM_QA_SKIP_AI="true"
cmd /c npm run qa:phase1
```

Optional environment variables:

- `CRM_API_URL`: Java backend URL. Default: `http://localhost:8080`.
- `CRM_AI_URL`: Python AI service URL. Default: `http://localhost:8000`.
- `CRM_QA_EMAIL`: QA login email.
- `CRM_QA_PASSWORD`: QA login password.
- `CRM_QA_WORKSPACE`: Optional workspace slug.
- `CRM_QA_TIMEOUT_MS`: Per-request timeout. Default: `30000`.
- `CRM_QA_SKIP_AI`: Set to `true` to skip AI service checks.

## Expected Result

The command should finish with:

```text
Phase 1 QA completed: <n> passed, <n> skipped, 0 failed.
```

Any failure should be treated as a release-blocking stabilization issue for Phase 1.

## Still Manual In Phase 1

The automated gate confirms API wiring and core authorization, but QA should still manually verify:

- Onboarding only appears for new or incomplete accounts.
- Dashboard time filtering updates visible metrics.
- Chat answer formatting is readable with realistic CRM questions.
- Report PDFs look professional visually, not just technically downloadable.
- Browser notifications require permission and behave correctly across supported browsers.
- Realtime updates appear in the UI after a record changes.
