# Acceptance Test Matrix (Phase 044)

Date: 2026-07-06 · Branch `Phase-Imp`

Acceptance criteria for the critical path and safety boundary, each mapped to an
automated test (or an honest manual step). Automated criteria run in
`tests/acceptance/acceptance.test.ts` and the e2e/isolation suites.

| # | Acceptance criterion | Verified by | Status |
|---|---|---|---|
| AC1 | A user can create a case (intake) | `acceptance.test.ts` AC1; `e2e` | ✅ Automated |
| AC2 | The case is classified into legal areas | `acceptance.test.ts` AC2; `classification.smoke` | ✅ Automated |
| AC3 | Matching returns suitable lawyers with real scores | `acceptance.test.ts` AC3; `backend`, `e2e` | ✅ Automated |
| AC4 | **No outreach is sent without human approval** | `acceptance.test.ts` AC4; `e2e` (`sent:false`) | ✅ Automated |
| AC5 | Generated legal content carries a disclaimer | `acceptance.test.ts` AC5; `noFakeSuccess.smoke` | ✅ Automated |
| AC6 | A user can export and erase their data (GDPR) | `acceptance.test.ts` AC6; `backend` | ✅ Automated |
| AC7 | A user cannot access another user's data (isolation) | `security/isolation.test.ts` | ✅ Automated |
| AC8 | Hostile input is rejected cleanly (no crash/leak) | `security/adversarial.test.ts` | ✅ Automated |
| AC9 | Uploaded files cannot escape the storage dir | `security/fileSafety.test.ts` | ✅ Automated |
| AC10 | Providers/data missing → graceful degradation | `security/providerFailure.test.ts` | ✅ Automated |
| AC11 | Background jobs are isolated + retried + observable | `backend/worker.test.ts` | ✅ Automated |
| AC12 | Config fails safe (prod refuses insecure secrets) | `smoke/configGuard.test.ts` | ✅ Automated |

## Manual acceptance (not yet automatable)

| # | Criterion | Manual step | Expected | Actual |
|---|---|---|---|---|
| M1 | Real outreach **send** to a lawyer | Approve a draft, trigger send | Lawyer receives email | ❌ Not implemented (send path is Phase 026 follow-up) |
| M2 | Evidence collection from Gmail/Drive | Connect OAuth, run auto-collect | Attachments stored w/ provenance | ⚠️ Requires real Google OAuth creds |
| M3 | Desktop packaging | `npm run dist:*` | Installer runs, app boots | ⚠️ Not exercised in CI |

## How to run

```bash
npx vitest run tests/acceptance tests/e2e tests/security tests/backend
# or the whole suite:
npx vitest run
```

Current result: **18 test files, 117 passed, 9 todo, 0 failed** (2026-07-06).
