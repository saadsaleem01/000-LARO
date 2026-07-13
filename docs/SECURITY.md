# Security — 000-LARO

Date: 2026-07-06 · Branch `staging`

Covers the authentication, authorization, configuration, and API-contract work
delivered in Phases 006–009, plus the residual risks still open.

---

## 1. Configuration & secrets (Phase 006)

- **Per-install secrets.** The Electron main process
  ([src-main/index.ts](../src-main/index.ts) `bootstrapSecrets`) generates strong
  random `JWT_SECRET`, `COOKIE_SECRET`, and `LOCAL_AGENT_TOKEN` on first run and
  persists them (mode `0600`) to `userData/laro-secrets.json` (never committed,
  never shipped). They are set in the environment **before** the server is
  imported, so sessions are signed with a per-install secret — the old shared
  `change-this-secret` default can no longer be used to forge tokens.
- **Fail-safe startup guard.** [server/_core/env.ts](../server/_core/env.ts)
  `assertSecurityConfig()` throws in production if `JWT_SECRET`/`COOKIE_SECRET`
  are missing or still the insecure placeholder, and is invoked at the top of
  `startServer()` ([server/index.ts](../server/index.ts)) before any request is
  served. In development it warns instead of throwing. It also logs a truthful
  summary of unconfigured optional integrations (AI key, S3, Google OAuth).
- **Tested:** `tests/smoke/configGuard.smoke.test.ts` (production-throw,
  empty-secret-throw, strong-secret-pass, dev-warn).

## 2. Authentication & session (Phase 007)

- Email/password (bcrypt) + JWT session cookie (httpOnly). Password reset flow
  unchanged (already sound).
- **Session lifetime shortened** from 365 days to **30 days**
  (`SESSION_EXPIRES_IN` / `SESSION_MAX_AGE_MS` in
  [shared/const.ts](../shared/const.ts)) to bound the stolen-token window.
- **Removed the production bearer backdoor.** The desktop scanner previously
  authenticated with the well-known constants `local-default` / `local-dev-token`.
  [server/context.ts](../server/context.ts) now accepts a **per-install**
  `LOCAL_AGENT_TOKEN`, and accepts the legacy constants **only in development**.
  The token is handed to the scanner UI via IPC (`agent:token`) so the desktop
  app keeps working with a strong per-install value.
- **Tested:** `tests/smoke/authz.smoke.test.ts` asserts the legacy tokens are
  gated behind `ENV.isDev`.

## 3. Authorization & resource ownership (Phase 008)

- **Removed the shared `demo-user-123` fallback** from every router that used it
  (`evidenceFiles`, `evidenceAnalytics`, `evidenceTimeline`, `userPreferences`,
  `support`). These are now `protectedProcedure` and use `ctx.user.id`.
- **Closed the IDOR class of bug.** A new guard
  [server/_core/authz.ts](../server/_core/authz.ts) `assertCaseOwnership(caseId,
  userId)` confirms the case belongs to the caller (throws `FORBIDDEN` otherwise,
  without leaking existence). It is applied to every case-scoped procedure that
  was previously public and `caseId`-only:
  - `outreach.byCaseId`
  - `cases.outreachProgress`, `cases.getOutreachByCaseId`, `cases.progress`
  - `gapAnalysis.analyze`, `getGaps`, `getExpectedDocuments`, `getPatterns`,
    `getInferences`, `getCaseStrength`, `getSummary`, `generateDocument`
- **Tested:** `tests/smoke/authz.smoke.test.ts` (no `demo-user-123` remains;
  case-scoped routers call the guard; the guard throws `FORBIDDEN`).

## 4. API contract & error envelope (Phase 009)

- Added a tRPC `errorFormatter` ([server/_core/trpc.ts](../server/_core/trpc.ts))
  that returns a stable shape: `{ code, httpStatus, path, validation }`, where
  `validation` is a flattened Zod field-error object on input-validation failures.
  Internal details/stack are not leaked.
- Consolidated error handling: the dead, unimported `server/error-handler.ts` was
  removed (the tRPC error path is now the single envelope).

## 5. Residual risks (NOT yet fixed — tracked)

Ordered by severity; these belong to later phases and must be closed before any
production claim:

1. ~~**`.env` bundled into the packaged app**~~ — **FIXED (Phase 030)**: removed
   from electron-builder `extraResources`; the installer no longer ships secrets.
   Per-install secrets are generated to `userData/laro-secrets.json`.
2. **OAuth-token encryption is weak** (`Buffer.alloc(32, JWT_SECRET)` ≈ 1 byte of
   key entropy, unauthenticated CBC). → Phase 007 follow-up. **STILL OPEN.**
3. **Security headers** — **FIXED (Phase 029)**: CSP, X-Frame-Options, X-Content-
   Type-Options, Referrer-Policy, Permissions-Policy, COOP, and HSTS (prod HTTPS)
   are now set on every response in `server/index.ts`. CSRF/permissive-dev-CORS
   hardening is a follow-up.
4. **Unauthenticated OAuth-connect** binds a mailbox to any `userId` from the
   query string; Trello callback reflects token into HTML. → Phase 012/029. **STILL OPEN.**
5. **JWT has no server-side revocation** (logout clears the cookie only). → Phase 007 follow-up. **STILL OPEN.**

### Secret rotation (Phase 030)

Per-install secrets (`JWT_SECRET`, `COOKIE_SECRET`, `LOCAL_AGENT_TOKEN`) live in
`userData/laro-secrets.json`. To rotate: delete that file and relaunch — new
random values are generated on next start. Rotating `JWT_SECRET` invalidates all
existing sessions (users must log in again), which is the intended effect.

## 6. How to verify

```bash
npx tsc -p tsconfig.server.json --noEmit     # server typechecks
npx vitest run tests/smoke                    # 24 pass, 9 todo (incl. config + authz guards)
```
