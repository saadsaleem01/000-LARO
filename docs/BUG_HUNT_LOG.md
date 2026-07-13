# Bug Hunt Log (Phase 077)

Date: 2026-07-06 · Branch `Phase-Imp`

Bugs found and fixed during the implementation program (most caught by the real
test suite). Newest first.

| # | Bug | Found by | Severity | Fix |
|---|---|---|---|---|
| B1 | **GDPR erasure incomplete** — caseId-scoped child rows (outreach, gaps, patterns…) were left orphaned after account deletion | Red-team loop 1 (078) + test | High (privacy) | `deleteUserData` now purges caseId-scoped children for the user's cases first (server/gdpr.ts) |
| B2 | **`system.providerChecklist` exposed integration config to unauthenticated callers** | Red-team loop 2 (079) | Low (info disclosure) | Changed to `protectedProcedure` |
| B3 | **SQL `LIKE '__%'` treated `_` as a wildcard**, excluding every table → GDPR delete + cases.delete cascade + tableCounts silently skipped tables | Phase 040 backend suite | High (data/erasure) | Filter internal tables in JS (gdpr.ts, admin.ts, cases.ts) |
| B4 | **Classification confidence** counted distinct areas, not keyword hits → strong single-area matches reported "medium" | Phase 025 test | Low | Confidence from total keyword hits (classification.ts) |
| B5 | **State-machine guard crashed on null `caseId`** (nullable column) | Phase 059 tsc | Low | Guard `!row.caseId` before ownership check (workflow.ts) |
| B6 | **`storage.ts` control-char regex** was mangled to a printable-range strip | Phase 015 review | Med (sanitization) | Explicit `/[\x00-\x1f\x7f]/` |
| B7 | **`.env` bundled into the installer** (shipped secrets) | Phase 030 | High (secrets) | Removed from electron-builder extraResources |

## Method
- Real DB-backed tests (22 files) + adversarial/isolation suites.
- Three red-team loops (docs/RED_TEAM.md).
- `admin.invariants` + reconciliation for data-integrity drift.
