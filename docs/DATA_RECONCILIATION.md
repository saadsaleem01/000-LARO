# Data Reconciliation & Repair (Phase 054)

Date: 2026-07-06 · Branch `Phase-Imp`

Because most referential integrity is enforced in application code (few declared
FKs), `server/reconcile.ts` detects and repairs drift.

## Detect (read-only)
`reconcileReport()` returns:
- `orphanedByCaseId` — child rows whose `caseId` has no matching case,
- `orphanedByUserId` — rows whose `userId` has no matching user,
- `duplicateEmails` — users sharing an email (should be none post-Phase-005),
- `totalOrphans`.

## Repair
`repairOrphans()` deletes orphaned rows inside a transaction and returns per-table
counts. Safe to run; only removes rows pointing at missing parents.

## Verification
`tests/backend/phase051_060.test.ts` inserts an orphaned outreach row, asserts
the report finds it, repairs it, and confirms it's gone.
