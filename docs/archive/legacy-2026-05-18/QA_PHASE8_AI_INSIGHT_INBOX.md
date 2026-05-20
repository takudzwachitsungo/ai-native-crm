# Phase 8 AI Insight Inbox QA

Phase 8 turns generated AI insight pills into a persistent team/admin inbox. Live insights are still generated from current CRM data, but each generated insight is now snapshotted so admins can filter, assign, snooze, dismiss, and review records later.

## What This Phase Covers

- Persist generated insight records with `first_seen_at`, `last_seen_at`, and `seen_count`.
- Keep lifecycle state separate from the underlying insight record.
- Add `/insights/inbox` for persisted insight review with status and assignee filters.
- Add inbox summary counts for total, active, assigned, snoozed, dismissed, severity, and entity type.
- Audit inbox views through AI governance audit events.
- Update AI Governance to show a team insight inbox instead of only a transient live-feed list.

## Run The Eval

```bash
npm run eval:ai-insight-inbox
```

Optional environment overrides:

```bash
CRM_INSIGHT_INBOX_EVAL_EMAIL=takudzwa@gmail.com
CRM_INSIGHT_INBOX_EVAL_PASSWORD=@ukta0022.
CRM_INSIGHT_INBOX_EVAL_WORKSPACE=
CRM_API_URL=http://localhost:8080
CRM_AI_URL=http://localhost:8000
npm run eval:ai-insight-inbox
```

## Expected Result

The eval should pass these checks:

- Dashboard insight generation creates persisted inbox records.
- The inbox returns records and summary counts.
- Assigning an insight persists lifecycle state and can be filtered by status.
- Inbox views are audit logged.

## QA Notes

- The eval expects seeded CRM data to produce at least one insight.
- Assignment is reset back to `active` after the filter check so QA data is not left permanently assigned.
- If the inbox is empty, first call `/insights?context=dashboard&include_inactive=true` for the target account.
