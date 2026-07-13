# Formal State Machines (Phase 059)

Date: 2026-07-06 · Branch `Phase-Imp`

`server/stateMachines.ts` defines allowed transitions and guards; free-form
status strings are no longer accepted where the machine applies.

## Case status
`Intake → Matching → Outreach → Matched → Closed` (with allowed back-edges
Outreach→Matching, Matched→Outreach). `Closed` is terminal.
Enforced in `cases.update` via `assertCaseTransition` (illegal target or edge → BAD_REQUEST).

## Outreach status
`PendingApproval → Approved | Rejected`; `Approved → Sent | Rejected`;
`Sent → Interested | Declined | NoResponse`. `Rejected`/`Declined` terminal.
Enforced in the approval gate (`workflow.approveDraft/rejectDraft`) via
`assertOutreachTransition`. Note: `PendingApproval → Sent` is **forbidden** — a
draft must be approved first (and the send is additionally flag-gated).

Verified in `tests/backend/stateMachines.test.ts` + the API-level rejection test
in `tests/backend/phase051_060.test.ts`.
