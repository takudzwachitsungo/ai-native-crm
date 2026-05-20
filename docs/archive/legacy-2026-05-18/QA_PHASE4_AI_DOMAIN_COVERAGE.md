# Phase 4 AI Domain Coverage

Phase 4 expands the CRM assistant from core sales data into the newer enterprise modules. This phase is read-only: the assistant can retrieve and summarize live data from these modules, but writeback still requires separately designed safe actions and guardrails.

## Covered Domains

- Campaigns and marketing performance.
- Support cases, SLA state, and assignment queue visibility.
- Contracts and renewal visibility.
- Field service work orders and technician workload visibility.
- Workspace integration connection/sync status.
- Revenue operations, quota, attainment, and territory rollups.

## Guardrails

- The AI service still accesses data only through the Java backend with the authenticated user's JWT.
- Backend RBAC, tenant isolation, and record visibility remain authoritative.
- Phase 4 does not add destructive actions or unconfirmed writeback for these domains.
- Chat responses must be grounded in tool calls for the requested module.

## How To Run

Start the backend and AI service first. Then run:

```powershell
cmd /c npm run eval:ai-domains
```

To run against a specific account/workspace:

```powershell
$env:CRM_DOMAIN_EVAL_EMAIL="takudzwa@gmail.com"
$env:CRM_DOMAIN_EVAL_PASSWORD="@ukta0022."
$env:CRM_DOMAIN_EVAL_WORKSPACE="dala-inc"
cmd /c npm run eval:ai-domains
```

Optional environment variables:

- `CRM_API_URL`: Java backend URL. Default: `http://localhost:8080`.
- `CRM_AI_URL`: Python AI service URL. Default: `http://localhost:8000`.
- `CRM_DOMAIN_EVAL_EMAIL`: Eval login email.
- `CRM_DOMAIN_EVAL_PASSWORD`: Eval login password.
- `CRM_DOMAIN_EVAL_WORKSPACE`: Optional workspace slug.
- `CRM_DOMAIN_EVAL_TIMEOUT_MS`: Per-request timeout. Default: `45000`.

## Expected Result

The command should finish with:

```text
Phase 4 AI domain evals completed: <n> passed, <n> skipped, 0 failed.
```

The eval verifies health, governance domain discovery, backend endpoint reachability, and chat tool grounding for campaigns, cases, contracts, field service, integrations, and revenue ops.
