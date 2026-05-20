# Phase 5 AI Domain Actions

Phase 5 adds confirmed, low-risk writeback actions for the newer enterprise modules. These actions intentionally create only CRM tasks or draft emails. They do not send external emails, delete records, or directly change case, campaign, contract, work-order, integration, or revenue-ops state.

## Supported Confirmed Domain Actions

- `create_case_followup_task`: creates a support-case follow-up task.
- `draft_case_response_email`: creates a support response email draft only.
- `create_campaign_followup_sequence`: creates up to five campaign follow-up tasks.
- `draft_contract_renewal_email`: creates a contract renewal email draft only.
- `create_work_order_followup_task`: creates a field-service work-order follow-up task.
- `create_revenue_ops_review_task`: creates a revenue-ops review task.

## Guardrails

- Every action requires `confirmed: true`.
- No destructive actions.
- No external email sending.
- Domain actions create only tasks or draft emails.
- Follow-up sequences are capped to five tasks.
- Every proposal and execution is audit logged.
- Java backend permissions still enforce record access and tenant isolation.

## How To Run

Start the backend and AI service first. Then run:

```powershell
cmd /c npm run eval:ai-domain-actions
```

To run against a specific account/workspace:

```powershell
$env:CRM_DOMAIN_ACTION_EVAL_EMAIL="takudzwa@gmail.com"
$env:CRM_DOMAIN_ACTION_EVAL_PASSWORD="@ukta0022."
$env:CRM_DOMAIN_ACTION_EVAL_WORKSPACE="dala-inc"
cmd /c npm run eval:ai-domain-actions
```

Optional environment variables:

- `CRM_API_URL`: Java backend URL. Default: `http://localhost:8080`.
- `CRM_AI_URL`: Python AI service URL. Default: `http://localhost:8000`.
- `CRM_DOMAIN_ACTION_EVAL_EMAIL`: Eval login email.
- `CRM_DOMAIN_ACTION_EVAL_PASSWORD`: Eval login password.
- `CRM_DOMAIN_ACTION_EVAL_WORKSPACE`: Optional workspace slug.
- `CRM_DOMAIN_ACTION_EVAL_TIMEOUT_MS`: Per-request timeout. Default: `45000`.

## Expected Result

The command should finish with:

```text
Phase 5 AI domain action evals completed: <n> passed, <n> skipped, 0 failed.
```

The eval verifies domain action discovery, unconfirmed execution blocking, confirmed task/sequence creation with cleanup, draft-only case/contract emails, and audit summary capture.
