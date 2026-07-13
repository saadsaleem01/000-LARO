# Feature-Level Definition of Done (Phase 091)

Date: 2026-07-06 · Branch `Phase-Imp`

A feature counts as **Done** only when every item below is true. "Visibly
incomplete" features must be hidden behind a feature flag (Phase 058), not shipped
looking finished (Phase 014/037/090).

## DoD checklist (per feature)
1. **Real backend** — a real tRPC procedure with real logic (no stub returning a
   success shape). Unbuilt behaviour throws `NOT_IMPLEMENTED`, never fakes success.
2. **Ownership & auth** — `protectedProcedure` + `assertCaseOwnership` where user
   data is involved; admin-only via `adminProcedure`.
3. **Validation** — inputs validated with zod; illegal state transitions rejected.
4. **Test** — at least one real (DB-backed) test proving the happy path AND a
   failure/authz path.
5. **Honest status** — a row in docs/GOAL_COMPLETION_MATRIX.md; Partial/Missing
   name their residual.
6. **UI truthfulness** — if surfaced in the renderer, the action maps to a real
   endpoint (no dead-router buttons — docs/UI_ACTION_AUDIT.md).
7. **Gate green** — `npm run gate` passes (tsc, traceability, scans, tests).

## DoD applied to the core features (real status)
| Feature | 1 real | 2 authz | 3 valid | 4 test | 5 honest | 6 UI | Done? |
|---|---|---|---|---|---|---|---|
| Auth (signup/login/reset) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **Done** |
| Case CRUD + classify | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **Done** |
| Lawyer matching | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **Done** |
| Outreach prepare + approval gate | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **Done** (no send by design) |
| GDPR export/erase | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **Done** |
| Help / error catalog | ✅ | n/a | ✅ | ✅ | ✅ | ✅ | **Done** |
| Outreach **send** | ❌ | — | — | — | ✅(Partial) | — | **Not done** (D3, flag OFF) |
| Evidence auto-collect | ⚠️ | ✅ | ✅ | ⚠️ | ✅(Partial) | ⚠️ | **Partial** (provider-gated) |
| 14 renderer-only screens | ❌ | — | — | — | ✅(documented) | ❌ | **Not done** (D1; hide) |

## Rule
No feature is marked Implemented in the matrix unless columns 1–5 are ✅. Columns
6–7 gate release, not the matrix status.
