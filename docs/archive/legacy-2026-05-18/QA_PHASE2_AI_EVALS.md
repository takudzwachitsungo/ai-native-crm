# Phase 2 AI Quality Evals

Phase 2 adds a repeatable AI quality gate. It verifies that the assistant answers common CRM questions from real tenant data instead of producing generic or hallucinated responses.

## What The Eval Covers

- Backend and AI service health.
- Authenticated AI access with the current user's tenant context.
- Top deals grounding against live backend deal records.
- Sales rep performance grounding against live deal ownership and value.
- Lead lifecycle/status grounding against live lead records.
- Follow-up context retention inside the same conversation.
- AI governance audit capture after eval activity.
- Formatting checks for ranked answers, including numbered Markdown lists.

## How To Run

Start the backend and AI service first. Then run:

```powershell
cmd /c npm run eval:ai
```

To run against a specific account/workspace:

```powershell
$env:CRM_EVAL_EMAIL="takudzwa@gmail.com"
$env:CRM_EVAL_PASSWORD="@ukta0022."
$env:CRM_EVAL_WORKSPACE="dala-inc"
cmd /c npm run eval:ai
```

Optional environment variables:

- `CRM_API_URL`: Java backend URL. Default: `http://localhost:8080`.
- `CRM_AI_URL`: Python AI service URL. Default: `http://localhost:8000`.
- `CRM_EVAL_EMAIL`: Eval login email.
- `CRM_EVAL_PASSWORD`: Eval login password.
- `CRM_EVAL_WORKSPACE`: Optional workspace slug.
- `CRM_EVAL_TIMEOUT_MS`: Per-request timeout. Default: `45000`.

## Expected Result

The command should finish with:

```text
Phase 2 AI evals completed: <n> passed, <n> skipped, 0 failed.
```

Skipped checks usually mean the workspace has no matching data, for example no deals or no leads. Failures mean the AI layer is not reliably grounded enough for QA handoff.

## Why This Matters

Phase 1 confirms wiring. Phase 2 confirms answer quality. The assistant can be technically connected but still fail if it:

- Searches for the user's full sentence instead of fetching the relevant CRM records.
- Omits real deal names or owners even though records exist.
- Claims there is no data when the backend has data.
- Loses context on follow-up questions.
- Returns unstructured paragraphs for ranked questions.
