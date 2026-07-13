# Changelog

All notable changes to LARO are documented here. This project follows semantic
versioning; dates are ISO. Version is sourced from `package.json` and surfaced by
`system.appInfo` / `admin.debugBundle`.

## [1.3.0] — 2026-07-06
Closing renderer-independent Partials with real code.

### Added
- **14 missing routers (010/D1):** `server/routers/extendedRouters.ts` — adminAnalytics,
  outreachAnalytics, relevanceScoring, evidenceAggregation, enrichment, evidence,
  evidenceExport, bulkFileOperations, caseManagement, legalChecklists, emailMessages,
  syncScheduler, trello, unifiedInbox. Real DB-backed data or honest typed results.
- **Real outreach send (011/026/017):** `server/outreachSend.ts` + `workflow.sendApproved`
  — gated by emergency stop + `outreach.send.enabled` (default OFF) + Approved state +
  ownership + idempotency. Fails honestly with no provider. Tested (3/3).
- **Multi-user teams (106):** `server/teams.ts` + `teams` router; shared case access
  enforced in `assertCaseOwnership`; isolation preserved. Tested (3/3).
- **Supply-chain review (066):** `docs/SUPPLY_CHAIN.md` — 21 advisories triaged by
  runtime exposure (critical is dev-only vitest; 4 runtime deps scheduled).

### Status
- Matrix: **109 Implemented / 7 Partial / 0 Missing**. Tech-debt D1 RESOLVED.
- Remaining 7 Partials are all renderer/UI layer (010/013/021/041/049/050/057).

## [1.2.0] — 2026-07-06
Closing Partial phases with real code (security & data hardening).

### Added / Fixed
- **Authenticated token crypto (007/030/D4):** AES-256-GCM via `server/crypto.ts`
  (was unauthenticated CBC with a weak key); legacy values still decrypt.
- **CSRF + strict CORS (080/D5):** `server/_core/csrf.ts` — origin guard on
  mutations, never `*` with credentials.
- **Session/JWT revocation (007):** `server/sessionRevocation.ts` +
  `auth.logoutAllDevices`; verified in `context.ts`.
- **Evidence provenance (015):** sha256 content hash persisted on evidence writes.
- **ZIP evidence export (023):** `cases.exportZip` (real `archiver` package).
- **Reminders (027):** `notifications.runReminders` + daily cron, idempotent.
- **LICENSE (067):** top-level proprietary license file.

## [1.1.0] — 2026-07-06
Phases 101–115: operator-readiness, safety controls, and lifecycle.

### Added
- **Emergency stop (104):** operator kill switch (`admin.setEmergencyStop`) that
  halts all outreach prepare/approve immediately; backed by system_config.
- **Data retention (102):** `server/retention.ts` + `admin.retentionPreview/Run` —
  purges audit logs older than the retention window (default 365 days).
- **Safe retries (110):** `server/retry.ts` `retryWithBackoff` with `isRetryable`
  gating, cancellation, jitter; the live job runner now delegates to it.
- **Onboarding (105):** `onboarding.steps/state/complete` first-run flow.
- **Roles (106):** `server/_core/roles.ts` role hierarchy + `system.capabilities`.
- **Debug bundle (101):** `admin.debugBundle` redacted diagnostic snapshot (no secrets).
- **Exception dashboard (109):** `dashboard.exceptions` — only cases needing attention.
- **Real clarifications (111):** `clarifications.pending/answer` computed from case state.
- **Honest confidence (107):** `server/confidence.ts` derives confidence from real scores.
- **Operator tooling:** `npm run preflight` (103), `npm run readiness` (115),
  `npm run regression:baseline` (113), plus `CHANGELOG.md` (112).

### Notes
- Real outreach **send** remains intentionally unbuilt and flag-gated (D3).
- 14 renderer-only routers remain unimplemented (D1) — tracked, hidden work.

## [1.0.0] — earlier
Phases 000–100: honest matrix, critical path (classify→match→prepare→approve, no
send), GDPR, security hardening, tests, CI gates, audits, verification tooling.
See docs/CODEX_CHECKPOINTS.md for the full per-batch history.
