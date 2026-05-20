# Phase 3 AI Actions

Phase 3 expands the copilot from read-only and basic task/draft actions into a broader confirmed-action layer. These actions still require explicit confirmation and still go through the Java backend, so backend RBAC, tenant isolation, and validation remain authoritative.

## Supported Confirmed Actions

- `create_task`: creates one CRM task.
- `create_followup_sequence`: creates up to five CRM tasks as a short follow-up cadence.
- `draft_email`: creates a CRM email draft only; it does not send externally.
- `draft_proposal_email`: creates a proposal-style CRM email draft only; it does not send externally.
- `update_deal_stage`: moves a deal to a confirmed pipeline stage.
- `recommend_update`: non-executable structured recommendation for actions not yet supported.

## Guardrails

- No destructive actions.
- No external email sends from AI action execution.
- Deal stage updates require a target deal and explicit stage.
- Follow-up sequences are capped at five tasks.
- Every proposal and execution is audit logged.
- Java backend permissions still enforce record access.

## How To Run

Start the backend and AI service first. Then run:

```powershell
cmd /c npm run eval:ai-actions
```

To run against a specific account/workspace:

```powershell
$env:CRM_ACTION_EVAL_EMAIL="takudzwa@gmail.com"
$env:CRM_ACTION_EVAL_PASSWORD="@ukta0022."
$env:CRM_ACTION_EVAL_WORKSPACE="dala-inc"
cmd /c npm run eval:ai-actions
```

Optional environment variables:

- `CRM_API_URL`: Java backend URL. Default: `http://localhost:8080`.
- `CRM_AI_URL`: Python AI service URL. Default: `http://localhost:8000`.
- `CRM_ACTION_EVAL_EMAIL`: Eval login email.
- `CRM_ACTION_EVAL_PASSWORD`: Eval login password.
- `CRM_ACTION_EVAL_WORKSPACE`: Optional workspace slug.
- `CRM_ACTION_EVAL_TIMEOUT_MS`: Per-request timeout. Default: `45000`.

## Expected Result

The command should finish with:

```text
Phase 3 AI action evals completed: <n> passed, <n> skipped, 0 failed.
```

The eval verifies capabilities, unconfirmed execution blocking, confirmed follow-up sequence creation, proposal email draft safety, deal-stage proposal normalization, and action audit capture.
