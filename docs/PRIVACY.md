# Privacy Controls & Data Deletion (Phase 028)

Date: 2026-07-06 · Branch `Phase-Imp`

The GDPR data-subject rights are now **implemented** (they were empty `{}` stubs).

## Right of access — data export

- `gdpr.exportData` (protected): returns a complete JSON dump of every row owned
  by the authenticated user, produced by `server/gdpr.ts:exportUserData`. It
  introspects `sqlite_master` for tables with a `userId` column and selects the
  user's rows, plus the user's own `users` record with `password`/`resetCodeHash`
  redacted. The action is audit-logged.

## Right of erasure — account deletion

- `gdpr.deleteData` (protected, requires `confirm: true`): permanently deletes all
  user-owned rows across every user-scoped table and the `users` row itself,
  inside a single transaction (`server/gdpr.ts:deleteUserData`). The action is
  audit-logged before deletion and the session cookie is cleared afterward (the
  account no longer exists).

## Consent

- `gdpr.getConsent` / `gdpr.updateConsent` (protected): data-processing consent is
  implied by holding an account; there is no separate marketing/analytics tracking
  yet, so these return/accept an honest minimal structure and audit changes.

## Verification

- `tests/smoke/phase021_030.smoke.test.ts` asserts the stubs are gone and the
  real export/erasure functions exist.

## Remaining (tracked)

- Data-retention/auto-archival policy → Phase 102.
- Privacy impact assessment → Phase 065.
- UI to trigger export/delete with a clear confirmation step → Phase 037/UI work.
