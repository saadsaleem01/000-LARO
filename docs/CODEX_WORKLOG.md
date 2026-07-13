# Codex Worklog — 000-LARO

A running, append-only log of implementation work against the Giant Codex Goal Prompt.
Newest entries at the top. Each entry: date, phase(s), what changed, evidence, what remains.

Convention: this log records **what was actually done**, not intentions. If a phase
is only partially done, that is stated here and reflected in
`docs/GOAL_COMPLETION_MATRIX.md`.

---

## 2026-07-06 — Phases 061–070 (invariants, pre-action review, provider checklist, threat model, DPIA, supply chain, licenses, CI gates, release, runbook)

**Branch:** `Phase-Imp`.

- **061 Data invariants**: `server/invariants.ts` (`verifyInvariants` — email
  uniqueness, ownership, outreach uniqueness, orphans, legalAreas validity),
  exposed via `admin.invariants` (+ `admin.reconcileReport`/`repairOrphans`). Tested.
- **062 Pre-action safety review**: `workflow.preSendReview` returns the review
  payload (recipient, case, disclaimer, `reversible:false`, `requiresExplicitApproval`,
  `sendEnabled` flag, what-remains-manual) — ownership-checked; never sends. Tested.
- **063 Provider credential checklist**: `system.providerChecklist` reports which
  integrations are configured (booleans + required env names, **no secret values**).
  Tested. `docs/PROVIDERS.md` cross-ref.
- **064 Threat model**: `docs/THREAT_MODEL.md` (STRIDE over the real surface).
- **065 Privacy impact assessment**: `docs/PRIVACY_IMPACT_ASSESSMENT.md` (DPIA).
- **066 Supply chain**: `docs/SUPPLY_CHAIN.md` (npm audit snapshot: 46 advisories —
  2 critical/22 high, mostly transitive/dev; triage plan) + `npm run audit:deps`.
- **067 Licenses/third-party**: `docs/LICENSES.md` (permissive deps; services + terms;
  flags that the repo lacks a top-level LICENSE).
- **068 CI/CD quality gates**: `.github/workflows/ci.yml` — blocking `tsc`
  (server+main) + `vitest`, non-blocking lint/renderer-tsc (pre-existing debt).
- **069 Release/canary/rollback**: `docs/RELEASE_PROCESS.md` (flags as canary,
  backup/restore as rollback, quality gates).
- **070 Operator runbook**: expanded `docs/OPERATOR_RUNBOOK.md` (health, integrity,
  backup/restore, flags, secret rotation, provider checklist, incident response).

### Verification
- `tsc` server + main → clean.
- `npx vitest run` → **22 files, 143 passed, 9 todo, 0 failed** (added
  `tests/backend/phase061_070.test.ts`).

### What remains
- Runtime security residuals (OAuth-token crypto, CSRF, JWT revocation) — tracked
  in THREAT_MODEL/SECURITY.
- The real outreach **send** (fully scaffolded + gated).

---

## 2026-07-06 — Phases 051–060 (perf/indexing, pagination, backup/restore, reconciliation, analytics, SaaS, i18n, flags, state machines, domain model)

**Branch:** `Phase-Imp` (not pushed).

- **051 Performance/indexing**: added `cases(userId,status)`, `cases(urgency)`,
  `cases(updatedAt)` indexes in `ensureIndexes`; `docs/PERFORMANCE.md`.
- **052 Large-dataset pagination**: `tests/backend/phase051_060.test.ts` seeds 55
  cases and asserts complete, non-overlapping pagination + filter narrowing.
- **053 Backup/restore**: `server/backup.ts` (online `.backup()`, validate,
  restore-with-`.bak`) + `scripts/backup.ts` CLI + `docs/BACKUP_RESTORE.md`.
- **054 Reconciliation**: `server/reconcile.ts` (`reconcileReport`/`repairOrphans`
  for orphaned caseId/userId rows + duplicate emails) + `docs/DATA_RECONCILIATION.md`.
- **055 Analytics (local-first)**: `server/analytics.ts` real metrics wired into
  `analytics.*` (were `{}`/`[]`); no third-party telemetry; `docs/ANALYTICS.md`.
- **056 SaaS without forced billing**: `billing.status` endpoint (free tier, no
  paywall); `docs/SAAS_READINESS.md`.
- **057 i18n**: `shared/i18n.ts` NL+EN catalog + `t()`/fallback/interpolation;
  `docs/I18N.md`. **Partial** (renderer string migration is a follow-up).
- **058 Feature flags**: `server/featureFlags.ts` (env → system_config → default),
  `featureFlags` router, `outreach.send.enabled` default OFF gating the future
  send; `docs/FEATURE_FLAGS.md`.
- **059 Formal state machines**: `server/stateMachines.ts` for case + outreach;
  enforced in `cases.update` and the approval gate; `docs/STATE_MACHINES.md`.
- **060 Domain model spec**: `docs/DOMAIN_MODEL.md`.

### Verification
- `tsc` server + main → clean.
- `npx vitest run` → **21 files, 138 passed, 9 todo, 0 failed** (added
  `stateMachines.test.ts`, `i18n.test.ts`, `phase051_060.test.ts`).

### What remains
- Renderer i18n string migration (057) + component tests (041).
- The real outreach **send** (now flag-gated + state-machine-ready).
- Large-N (10k+) perf benchmark + EXPLAIN assertions (113).

---

## 2026-07-06 — Phases 041–050 (test suites, e2e, acceptance, adversarial, isolation, file-safety, provider-failure, a11y, responsive)

**Branch:** `Phase-Imp` (not pushed).

Built a real test harness `tests/helpers/app.ts` (`bootTestApp` + `makeCaller` via
`appRouter.createCaller`) that drives the **actual API** against a temp DB.

### Phase 041 — Frontend/component test suite
- `tests/frontend/frontendLogic.test.ts`: validates the form/validation/legal-area
  LOGIC the UI relies on (`caseIntakeSchema`, `phoneSchema`, `sanitizeLegalAreas`).
  **Partial**: component-render tests need jsdom + @testing-library/react (not a
  dependency) — deferred and documented.

### Phase 042 — Worker/job test suite
- `tests/backend/worker.test.ts`: `runJob` error isolation (never throws), bounded
  retry+backoff, recover-after-retry, observable status.

### Phase 043 — End-to-end workflow tests
- `tests/e2e/workflow.e2e.test.ts`: signup → create case (auto-classified) →
  matching → prepareDrafts → reviewQueue → approve (**sent:false**), all through
  the real tRPC API.

### Phase 044 — Acceptance test matrix
- `docs/ACCEPTANCE_TESTS.md` + `tests/acceptance/acceptance.test.ts` (AC1–AC6),
  plus honest manual items (real send, OAuth collection, packaging).

### Phase 045 — Adversarial break-the-app tests
- `tests/security/adversarial.test.ts`: unauth → UNAUTHORIZED, malformed/oversized
  input rejected, SQL-injection-style search is safe, non-existent case forbidden,
  and the case-create **rate limit** triggers TOO_MANY_REQUESTS.

### Phase 046 — Cross-user isolation tests
- `tests/security/isolation.test.ts`: user B cannot read/list/delete/match/export
  user A's case (real ownership guards enforced).

### Phase 047 — File safety & path-traversal tests
- `tests/security/fileSafety.test.ts`: traversal/absolute keys are sanitized and
  confined under the storage base; content round-trips with a sha256 hash.

### Phase 048 — Provider failure simulation
- `tests/security/providerFailure.test.ts`: no lawyers → empty matches; gibberish
  → "Other"; empty-user GDPR export; and the fake-provider lab throws in production.

### Phase 049 — Accessibility review
- `tests/a11y/accessibility.test.ts` (contrast + id generation) + `docs/ACCESSIBILITY.md`.

### Phase 050 — Responsive & browser compatibility
- `docs/RESPONSIVE_COMPAT.md`: single-Chromium desktop target; Tailwind responsive
  approach; honest "manual QA / visual-regression pending" note.

### Verification
- `tsc` server + main → clean.
- `npx vitest run` → **18 test files, 117 passed, 9 todo, 0 failed** (up from 76).
- Legacy `tests/*.test.ts` remain excluded (broken imports) — replaced by the new
  real suites rather than repaired in place.

### What remains
- jsdom/component-render tests (041 follow-up).
- The real outreach **send** (still the one critical-path gap).
- Visual-regression / large-dataset perf tooling (051/052).

---

## 2026-07-06 — Phases 031–040 (dev experience, Docker, migrations, doctor, observability, admin, demo labelling, fake-provider lab, factories, backend test suite)

**Branch:** `Phase-Imp` (not pushed).

### Phase 031 — Local dev one-command
- `scripts/setup.mjs` + `npm run setup`: Node check, creates `.env` from `.env.example`, prints next steps.

### Phase 032 — Docker & deployment readiness
- `Dockerfile` (runs the **server backend**, rebuilds better-sqlite3 for Node, `/data` volume, healthcheck), `.dockerignore`, `docker-compose.yml`, `npm run docker:build|run`, `serve` script. `docs/DEPLOYMENT.md`.

### Phase 033 — Migrations & rollback safety
- `scripts/db-backup.mjs` + `npm run db:backup` (+ `--restore`): file-snapshot rollback capturing `-wal`/`-shm`. `docs/MIGRATIONS.md`.

### Phase 034 — CLI doctor
- `scripts/doctor.mjs` + `npm run doctor`: environment self-diagnostic; **exits non-zero** on production-critical problems (insecure secrets, missing DB driver).

### Phase 035 — Observability, health, readiness
- `server/index.ts`: `GET /api/live` (liveness), `GET /api/ready` (DB check, 503 if down), and `/api/health` now reports dbReady/version/env/uptime.

### Phase 036 — Admin/operator diagnostics
- `server/routers/admin.ts` (mounted): `admin.diagnostics` (system/db/jobs/integration booleans, **no secret values**) and `admin.tableCounts`, gated by the now-used `adminProcedure`.

### Phase 037 — Demo mode with explicit labelling
- `ENV.DEMO_MODE`/`ENV.isDemo` (forced off in production); `system.appInfo` returns `{env, isProduction, demoMode, banner}` for an unmistakable UI banner.

### Phase 038 — Fake provider lab (tests only)
- `server/testing/fakeProviders.ts`: `FakeEmailProvider`/`FakeStorage`/`fakeLLM`, **hard-guarded** to throw if `NODE_ENV==='production'`.

### Phase 039 — Test-data factories
- `tests/factories.ts`: `buildUser/buildCase/buildLawyer/buildEvidence` with defaults that pass the matcher's mandatory filters.

### Phase 040 — Backend test suite (REAL DB integration)
- Rebuilt `better-sqlite3` for Node so real DB tests run here.
- `tests/backend/criticalPath.backend.test.ts`: boots the real DB against a temp SQLite file (migrations run), seeds via factories, and asserts **classification → real matching engine → ownership → GDPR export/erasure** end to end. `vitest.config.ts` now includes `tests/backend/**`.
- **This suite caught a real bug**: a `sqlite_master` filter using `LIKE '__%'` (where `_` is a SQL wildcard) excluded *every* table — silently breaking GDPR export/delete AND the `cases.delete` cascade. Fixed in `gdpr.ts`, `admin.ts`, and `cases.ts` (filter internal tables in JS).

### Verification
- `tsc` server + main → clean.
- `npx vitest run` → **9 files, 76 passed, 9 todo, 0 failed** (incl. the real backend suite).
- `npm run doctor`, `npm run setup`, `npm run db:backup` all run.

### What remains
- Legacy `tests/*.test.ts` (broken imports) still not repaired — that's Phase 041 (and they remain excluded from the vitest include).
- Full Docker image build not executed in this environment (no Docker daemon); the Dockerfile is written and the compose/healthcheck are defined.

---

## 2026-07-06 — Phases 021–030 (forms, search, export, templates, AI classifier, approval gate, notifications, privacy, security headers, secrets)

**Branch:** `Phase-Imp` (not pushed).

### Phase 021 — Forms, validation, autosave
- `shared/validation.ts`: canonical `caseIntakeSchema` (+ phone/urgency schemas), applied to `cases.create`.
- `cases.saveDraft/getDraft/clearDraft`: per-user intake autosave persisted in `system_config`.

### Phase 022 — Search, filters, sorting, pagination
- `cases.list` now supports `status`/`urgency`/`search` filters, `sortBy`/`sortDir`, owner-scoped, still paginated.

### Phase 023 — Import & export
- `cases.export` (full JSON package: case + evidence + outreach, ownership-checked) and `cases.exportCsv` (user's case list as CSV). Import (CSV) already existed (`bulkImport`).

### Phase 024 — Templates
- `messageTemplates` gained real per-user CRUD (`create`/`update`/`delete`), owner-scoped; was read-only.

### Phase 025 — AI/provider abstraction & deterministic fallback
- New `server/classification.ts`: a **deterministic** NL+EN keyword classifier mapping case text → `VALID_LEGAL_AREAS` (no API key needed). Wired into `cases.create` (auto-classify) and a `cases.classify` re-run endpoint. **This unblocks Phase 011 matching**, which needs legal areas. Tested behaviourally in `tests/smoke/classification.smoke.test.ts`.

### Phase 026 — Human review queue & approval gate
- `workflow.prepareDrafts` runs matching and creates outreach drafts in `PendingApproval` (idempotent via the Phase 017 unique index); `workflow.reviewQueue` lists pending; `approveDraft`/`rejectDraft` set the state. **Nothing is sent** — approval only marks ready (`sent:false`), preserving the safety boundary.

### Phase 027 — Notifications & reminders
- `server/notifications.ts:createNotification` writes real rows to the `notifications` table (read by the existing router); wired to case-created and outreach approve/reject events.

### Phase 028 — Privacy controls & data deletion
- `server/gdpr.ts`: real `exportUserData` (right of access — full JSON dump of owner rows via table introspection, password/token redacted) and `deleteUserData` (right of erasure — transactional delete across all user-scoped tables + the user). Replaced the empty `{}` stubs in `gdpr.*` with protected, audited endpoints; deletion clears the session cookie.

### Phase 029 — Security headers & web security
- `server/index.ts`: security-headers middleware on every response — CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP, and HSTS over real HTTPS in production.

### Phase 030 — Secrets management & credential rotation
- Removed `.env` from electron-builder `extraResources` — the installer **no longer ships secrets** (closes the top residual from `docs/SECURITY.md` §5). Added `.env.example`. Per-install secret generation was already added in Phases 006/007; rotation = delete `userData/laro-secrets.json` (regenerated on next launch; invalidates existing sessions).

### Verification
- `tsc -p tsconfig.server.json` and `tsconfig.main.json` → clean.
- `npx vitest run tests/smoke` → **72 passed, 9 todo, 0 failed** (added `classification.smoke.test.ts` and `phase021_030.smoke.test.ts`).

### What remains
- Real **send** of approved outreach through a configured provider (still the key gap; approval gate is ready for it).
- LLM refinement of classification when a key is present (deterministic path is authoritative and always on).
- UI wiring for filters/drafts/templates/review-queue (renderer; pre-existing tsc debt — Phase 041).

---

## 2026-07-06 — Phases 016–020 (jobs, idempotency, rate limits, audit, dashboard)

**Branch:** `Phase-Imp` (not pushed — owner pushes separately)

### Phase 016 — Background jobs, schedulers & workers ([docs/OPERATOR_RUNBOOK.md](OPERATOR_RUNBOOK.md))
- Rewrote [server/cronScheduler.ts](../server/cronScheduler.ts) with `runJob()`: error isolation, retry+exponential backoff, and observable status (`getJobStatus()`). The hourly outreach job is now an **honest heartbeat** (logs that follow-ups are disabled until the send path/approval gate exist — Phase 026) instead of a commented-out dead body.
- Exposed status via `health.readiness` ([server/routers/health.ts](../server/routers/health.ts)) with a real DB check.

### Phase 017 — Idempotency & duplicate-action prevention
- UNIQUE index `outreach_status(caseId, lawyerId)` in `ensureIndexes` ([server/db.ts](../server/db.ts)).
- `workflow.initiateOutreach` is idempotent — returns `{ alreadyInitiated: true }` when the case is already in Outreach; no re-write/re-audit.

### Phase 018 — Rate limits, cooldowns & provider quotas
- Added `enforceRateLimit(ctx, scope, config)` ([server/rateLimit.ts](../server/rateLimit.ts)) and applied the previously-unused named configs to `auth.login`, `cases.create`, `matching.findLawyers`, `workflow.initiateOutreach`.

### Phase 019 — Audit logging & event history
- `getAuditLogs` now actually filters by userId/entity/action (previously ignored) ([server/audit.ts](../server/audit.ts)).
- Added a user-scoped read path `audit.list` ([server/routers/audit.ts](../server/routers/audit.ts)), mounted in `appRouter`.
- Wired `createAuditLog` into reachable actions: case create/update/delete, `outreach.initiated`, `user.login`.

### Phase 020 — User-facing dashboard & next-action design
- Added `dashboard.nextActions` ([server/routers/dashboard.ts](../server/routers/dashboard.ts)): derives concrete next steps from real case state (no evidence → "Add evidence"; Matching → "Review lawyer matches"; Outreach → "Review outreach"), prioritized by urgency.

### Tests & verification
- Added `tests/smoke/opsHardening.smoke.test.ts` (rate limiter behaviour, cron runner retry/status, + source guards for 017/019/020).
- `tsc` server + main → clean. `npx vitest run tests/smoke` → **53 passed, 9 todo, 0 failed**.

### What remains (out of scope for 016–020)
- Idempotency keys + audit on the **real** outreach send (once 026 wires it).
- Distributed rate-limit store (Redis) — currently in-memory per process.
- Surface `nextActions`/audit history in the renderer UI (037/109) and add retention (102).

---

## 2026-07-06 — Phases 011–015 (core slice, providers, compliance, no-fake, storage)

**Branch:** `Phase-Imp` (not pushed — owner pushes separately)

### Phase 011 — Core workflow vertical slice
- Rewrote [server/routers/matching.ts](../server/routers/matching.ts) to call the **real** `findMatchingLawyers` engine (mandatory filters + LARO scoring + keyword/AI boosts) instead of `Math.random()` distances and hardcoded scores. Both procedures are `protectedProcedure` + `assertCaseOwnership`. Empty (honest) result when the case has no legal areas yet or no lawyers exist.

### Phase 012 — External provider reality review ([docs/PROVIDERS.md](PROVIDERS.md))
- [server/routers/enhancedConnections.ts](../server/routers/enhancedConnections.ts): `getOAuthUrl` no longer returns a blanket dummy auth URL. It reports real availability via `providerAvailability()` — configured Google/Microsoft providers return a real connect path; Slack + unconfigured providers return `{ available:false, reason }`.

### Phase 013 — Compliance & policy boundaries ([docs/COMPLIANCE.md](COMPLIANCE.md))
- Added `LEGAL_DISCLAIMER` (NL+EN) in [shared/const.ts](../shared/const.ts); appended to every generated legal document in `gapAnalysis.generateDocument` (+ `disclaimer` field on the response).

### Phase 014 — No fake success / no mock production behavior
- **OCR** ([server/routers/index.ts](../server/routers/index.ts)): removed the hardcoded Dutch "arbeidsovereenkomst" with `confidence 0.98`; `extractText` now throws `NOT_IMPLEMENTED`; `supportsOcr`→false, status→"unavailable".
- **Dashboard** ([server/routers/dashboard.ts](../server/routers/dashboard.ts)): `enhancedStats` and `activityFeed` now compute from the user's real cases/outreach (protected). Removed the hardcoded `{15,85,92,78}` and the "Mr. Janssen" sample feed.
- **Case progress** ([server/routers/cases.ts](../server/routers/cases.ts)): `outreachProgress` computes real aggregates from `outreach_status` instead of the fabricated `count:5/contacted:2/responded:1`.

### Phase 015 — Storage, files, uploads & media safety
- Rewrote [server/storage.ts](../server/storage.ts): `sanitizeStorageKey`/`sanitizeFilename` (path-traversal defence), a **real local-disk fallback that persists bytes** (fixing the silent data loss), a directory-confinement check, and a `hashBuffer` sha256 provenance helper. `storagePut` now returns a `sha256`.
- [src-main/index.ts](../src-main/index.ts) sets `LOCAL_STORAGE_DIR` to `userData/uploads`; `.gitignore` ignores `laro-uploads/`.

### Tests & verification
- Added `tests/smoke/storage.smoke.test.ts` (sanitize + hash) and `tests/smoke/noFakeSuccess.smoke.test.ts` (anti-regression guards for 011–014).
- `tsc -p tsconfig.server.json` and `tsconfig.main.json` → clean. `npx vitest run tests/smoke` → **43 passed, 9 todo, 0 failed**.

### What remains (out of scope for 011–015)
- Real classification (Phase 025) — matching returns empty until a case has legal areas.
- Outreach draft + approval gate + real send (Phases 026/012) — still not wired; no lawyer is contacted.
- Wire the sha256 hash into every evidence-write path + PDF/zip export (Phases 015/023).
- UI-wide disclaimer + GDPR + i18n (Phases 037/028/057).

---

## 2026-07-06 — Phases 005–010 (data model, config, auth, authz, API contract, frontend)

**Branch:** `staging` · **Base commit:** `1b78ed6`

### Phase 005 — Data model, ownership, persistence ([docs/DATA_MODEL.md](DATA_MODEL.md))
- [server/db.ts](../server/db.ts): added `applyConnectionPragmas` (WAL, `foreign_keys=ON`, `busy_timeout=5000`) and `ensureIndexes` (unique `users.email`, plus 10 hot-path indexes on outreach/evidence/email/messaging/rating). Idempotent, applied at boot; defensive unique-email creation that warns instead of crashing on legacy duplicates.
- Verified: `tsc -p tsconfig.server.json --noEmit` clean.

### Phase 006 — Config validation & startup guards ([docs/SECURITY.md](SECURITY.md) §1)
- [server/_core/env.ts](../server/_core/env.ts): added `assertSecurityConfig()` — **throws in production** if `JWT_SECRET`/`COOKIE_SECRET` are missing/insecure; warns in dev; reports unconfigured integrations. Wired into `startServer()` ([server/index.ts](../server/index.ts)).
- [src-main/index.ts](../src-main/index.ts): `bootstrapSecrets()` generates per-install random secrets to `userData/laro-secrets.json` (mode 0600) and sets them before importing the server → secure-by-default, no bricking.
- [package.json](../package.json): `dev:server` now runs with `NODE_ENV=development` so the guard doesn't fail-fast in local dev.
- Verified: `tests/smoke/configGuard.smoke.test.ts` — 4 passing (prod-throw, empty-throw, strong-pass, dev-warn).

### Phase 007 — Authentication & session security ([docs/SECURITY.md](SECURITY.md) §2)
- [server/context.ts](../server/context.ts): replaced the well-known `local-default`/`local-dev-token` **production backdoor** with a per-install `LOCAL_AGENT_TOKEN`; legacy constants accepted **only in development**.
- Session lifetime cut 365d → 30d (`SESSION_EXPIRES_IN`/`SESSION_MAX_AGE_MS` in [shared/const.ts](../shared/const.ts)); applied to signup/login/getApiToken.
- Wired the per-install token to the scanner: IPC `agent:token` ([src-main/index.ts](../src-main/index.ts)), preload `getAgentToken` ([src-main/preload.ts](../src-main/preload.ts)), and [AuthPage.tsx](../src/renderer/pages/AuthPage.tsx) uses it (falls back to `local-default` only outside Electron/dev).
- Note: the desktop uploader's `agent.addFile/*` endpoints do not exist server-side (already-dead path), so this change breaks no working feature.

### Phase 008 — Authorization & resource ownership ([docs/SECURITY.md](SECURITY.md) §3)
- New guard [server/_core/authz.ts](../server/_core/authz.ts) `assertCaseOwnership` (throws `FORBIDDEN`, no existence leak).
- Converted IDOR-prone public procedures to `protectedProcedure` + ownership check: `outreach.byCaseId`; `cases.outreachProgress/getOutreachByCaseId/progress`; all `gapAnalysis` case-scoped procedures.
- Removed the shared `demo-user-123` identity from `evidenceFiles`, `evidenceAnalytics`, `evidenceTimeline`, `userPreferences`, `support` (now protected + `ctx.user.id`).
- Verified: `tests/smoke/authz.smoke.test.ts` — 13 passing guards.

### Phase 009 — API contract & error envelope ([docs/SECURITY.md](SECURITY.md) §4)
- [server/_core/trpc.ts](../server/_core/trpc.ts): added an `errorFormatter` producing a stable `{ code, httpStatus, path, validation }` envelope (flattened Zod errors; no stack leakage).
- Removed the dead, unimported `server/error-handler.ts` (consolidated on the tRPC error path).

### Phase 010 — Frontend architecture & navigation ([docs/FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md))
- Documented the two renderer surfaces, wouter route inventory, and auth gating.
- The real navigation-safety fix is server-side (Phase 008): `?demo=true` no longer exposes a shared bucket — it now renders as a logged-out, dataless view. Visible demo labelling deferred to Phase 037.

### Verification for this batch
- `npx tsc -p tsconfig.server.json --noEmit` → clean. `tsconfig.main.json` → clean.
- `npx vitest run tests/smoke` → **24 passed, 9 todo, 0 failed**.
- Renderer `tsc` has ~425 **pre-existing** errors (built via Vite, no typecheck gate); the only renderer file changed here (`AuthPage.tsx`) is clean.

### What remains (deliberately out of scope for 005–010)
- Residual security items (bundled `.env`, weak OAuth-token crypto, CSRF/headers) tracked in `docs/SECURITY.md` §5 for Phases 029/030/100.
- Full DB-backed authz behavioural tests need a SQLite harness — Phase 040. Current authz tests are source-level anti-regression guards.
- The mocked `cases.outreachProgress` values remain (now ownership-guarded) — real data is Phase 014/011.

---

## 2026-07-06 — Phases 000–004 (foundation / ground-truth)

**Branch:** `staging` · **Starting commit:** `1b78ed6`

### Phase 000 — Repository integrity and true starting point
- Recorded true starting point: branch `staging`, HEAD `1b78ed6`, default branch `main`, 63 commits, first commit 2025-05-11. Working tree was clean before this change.
- Verified **no secrets, databases, uploads, or runtime files are committed** (`git ls-files` shows only source; `.gitignore` covers `.env*`, `*.sqlite`, `release/`). The real secret-exposure risk is the **packaged** `.env` (electron-builder `extraResources`), addressed later in Phases 030/100 — not the git repo.
- Removed committed junk that was misleading the tree:
  - `.github/workflows/Untitled` — 10-byte file containing only `ialihaider` (not a workflow).
  - `laro-desktop@1.0.0` — 0-byte file from an accidental shell redirect.
  - `tsc-err-out.txt` — stale build log (one npm warning line).
  - `fix_ts.py`, `patcher.js` — scripts that bulk-suppress TypeScript errors (cast to `any`, prepend `// @ts-nocheck`) against files that **do not exist in this repo**; unreferenced by any npm script or CI. They actively hide type errors and were dead. Removal recorded in the technical-debt register.
- Created the documentation trail required by the prompt appendix: this worklog, `CODEX_CHECKPOINTS.md`, `GOAL_COMPLETION_MATRIX.md`, and (from the audit task) `phase-audit.md`.

### Phase 001 — Complete file and dependency audit
- Produced `docs/DEPENDENCY_AUDIT.md` from real import-graph evidence (grep of `server/ src/ src-main/ scripts/ lib/ shared/`).
- Confirmed **10 declared dependencies have zero imports**: `pdf-parse`, `pdfkit`, `archiver`, `mammoth`, `tesseract.js`, `xlsx`, `stripe`, `socket.io`(+client), `@azure/msal-node`, `jose`. These map directly to unbuilt features (document parsing/OCR, PDF/zip export, billing, realtime). Kept (not removed) pending the phases that will implement those features; flagged in the technical-debt register so they cannot masquerade as working capability.

### Phase 002 — Product definition and user outcome contract
- Produced `docs/PRODUCT_DEFINITION.md`: who the user is, the outcome contract, and an **honest capability table** separating what works today from what is fake/dead/missing, plus the enforced safety boundaries.

### Phase 003 — Critical path definition and smoke test
- Produced `docs/CRITICAL_PATH.md`: the canonical step list, per-step status with `file:line` evidence, and **manual end-to-end verification steps** (with expected vs actual) for the steps that cannot yet be automated.
- Added a **runnable** smoke test `tests/smoke/criticalPath.smoke.test.ts` and a standalone `vitest.config.ts` (the repo previously had none, so `vitest` failed to start by loading the renderer's `vite.config.ts`). The smoke suite asserts the genuinely-wired pure units (legal-area normalization) and marks every not-yet-wired step as `todo` naming its implementing phase — so it can never be mistaken for full-path coverage.
- **Verification result:** `npx vitest run tests/smoke` → **7 passed, 9 todo, 0 failed** (2026-07-06).

### Phase 004 — Architecture decision and current stack validation
- Produced `docs/ARCHITECTURE.md`: the real architecture (Electron + in-process Express/tRPC + local SQLite via Drizzle), an architecture decision record, and the fail-safe/labelling gaps that later phases (006/014/037) must close.
- Corrected `PROJECT_INFO.md`, which described a **non-existent** Docker + MySQL 8.0 + Redis + `electron/` architecture. It now describes the actual shipped stack, with the aspirational stack moved to a clearly-labelled "Future / not implemented" section (Phase 075 truthfulness).

### What remains after this batch
- Phases 000–004 are documentation-and-integrity phases; the **product-behaviour** gaps they document (fake matching, missing classification, no real send, IDOR, default secrets, secrets-in-installer) are scheduled for Stage A–B phases (006, 007, 008, 011, 012, 014, 025, 026). No behaviour was changed in this batch beyond repo cleanup, the new smoke test, and truthful docs.
- Changes are **not yet committed** — awaiting owner review (per repository policy, commits happen on request).

## Batch: Phases 071–080 — docs, audits & two red-team fixes (2026-07-06)

Real code:
- **071** `server/help.ts` + `server/routers/help.ts` (`help.topics/topic`) — ordered
  in-app help topics incl. the not-legal-advice disclaimer.
- **072** `server/errorCatalog.ts` (`help.errorCatalog`) — code→message/cause/remedy.
- **078 (red-team, High):** fixed incomplete GDPR erasure in `server/gdpr.ts` —
  caseId-scoped children (outreach_status, communication_gaps, expected_documents,
  suspicious_patterns, legal_inferences, case_strength_analysis, email_activity)
  were orphaned; now purged for the user's cases before deleting userId rows + user.
- **079 (red-team, Low):** `system.providerChecklist` → `protectedProcedure`.
- Tests: `tests/backend/phase071_080.test.ts` (4/4) — help ordering, error catalog,
  providerChecklist auth, GDPR-erasure child cleanup.

Audits/docs: USER_GUIDE, TROUBLESHOOTING, UI_ACTION_AUDIT (14 broken renderer
routers), API_USAGE_AUDIT (46 routers/187 procedures), DOC_TRUTHFULNESS_AUDIT,
TECH_DEBT (14 ranked), BUG_HUNT_LOG (7 bugs), RED_TEAM (3 loops).

Verified: server tsc clean; targeted vitest 4/4. Honest residuals: 080 loop-3
findings (token crypto, CSRF/CORS, npm audit) documented+tracked, not fixed.

## Batch: Phases 081–090 — user sim, reviews, traceability & stabilization gate (2026-07-06)

Real code:
- **081** `tests/sim/nonTechnicalUser.test.ts` (+ `tests/sim` added to vitest include).
- **085** `scripts/traceability.mjs` (+ `npm run traceability`) → `docs/TRACEABILITY.md`.
- **089** `scripts/stabilization-gate.mjs` (+ `npm run gate` / `verify`).

Grounded reviews/process docs: AUTONOMY_REVIEW (082), VALUE_REVIEW (083),
PRODUCT_REALISM (084), TASK_GRAPH (086), RESUME_SAFETY (088), PROCESS_RULES (087/090).

Verified: `npm run gate` green (server+main tsc, traceability 0 broken, vitest 24
files / 154 passed / 9 todo). Honest note: renderer tsc still carries known debt
(D2) and the gate reports it as a non-blocking warning — which surfaces the D1
dead-router references (unifiedInbox, billing.createCheckoutSession, …).

## Batch: Phases 091–100 — final verification, scanners & fresh-clone (2026-07-06)

Real code:
- **094** `scripts/no-excuses-scan.mjs` — actionable vs review marker split; 0
  actionable in runtime; wired into `npm run gate` (+ `scan:no-excuses`).
- **100** `scripts/account-safety-check.mjs` — 0 HIGH; wired into gate (+ `scan:safety`).
- **092** performed a real git clone into an isolated dir and verified build/test
  of the tracked source (server tsc + user-sim + e2e green; no `.env` leak).

Docs: DEFINITION_OF_DONE (091), FRESH_CLONE (092), MANUAL_VERIFICATION (093),
NO_EXCUSES_SEARCH (094, generated), FINAL_VERIFICATION_REPORT (096), FINAL_RESPONSE
(097), MAINTENANCE_PLAN (098), ROADMAP (099), ACCOUNT_SAFETY (100, generated).

Verified: `npm run gate` → 6 blocking gates green (added no-excuses + account-safety
gates this batch). vitest 24 files / 154 passed / 9 todo. Honest residuals unchanged
and tracked (D1 dead routers, D3 send, D4 token crypto); renderer tsc still D2 debt.

## Batch: Phases 101–115 — operator controls, safety & lifecycle (2026-07-06)

Real code (server): systemState.ts (emergency stop, 104), retention.ts (102),
retry.ts (110, wired into cronScheduler.runJob), onboarding.ts (105), _core/roles.ts
(106), confidence.ts (107); routers: admin.debugBundle/retention/emergencyStop,
dashboard.exceptions (109), real clarifications (111), onboarding router,
system.capabilities. Emergency stop wired into workflow prepare/approve.

Scripts: prod-preflight.mjs (103), regression-baseline.mjs (113), operator-readiness.mjs
(115); CHANGELOG.md + version 1.1.0 (112). Docs: DATA_RETENTION, PROD_MIGRATION,
DECISION_MINIMIZATION (108), MAINTENANCE_REVIEW (114), OPERATOR_READINESS (115).

Tests: tests/backend/phase101_115.test.ts (11/11) — retry semantics, confidence,
roles, onboarding, emergency-stop halts outreach + admin-gating, retention purges
only old audit logs, debug bundle redacted/admin-only, exceptions, clarifications.

Verified: `npm run gate` 6/6 green; vitest 25 files / 165 passed / 9 todo.
Honest residuals tracked (D3 send, D1 renderer, D4 crypto, teams). NOT end-to-end send.

## Batch: Closing Partials with real code (2026-07-06)

007/030/D4 GCM token crypto (server/crypto.ts); 007 JWT revocation
(server/sessionRevocation.ts + auth.logoutAllDevices); 080/D5 CSRF+CORS
(server/_core/csrf.ts); 015 evidence sha256 provenance; 023 zip export
(server/evidenceExport.ts + cases.exportZip); 027 reminders (server/reminders.ts +
notifications.runReminders + cron); 067 LICENSE.

Tests: tests/backend/partials_hardening.test.ts (10/10). Gate 6/6 green; 26 files /
175 passed. Matrix 95→102 Implemented, 21→14 Partial. Tech-debt D4/D5/D11 RESOLVED.
Version 1.2.0 + CHANGELOG. Remaining Partials: renderer (D1/D2), send (D3), teams/external.
