# Threat Model & Security Design Review (Phase 064)

Date: 2026-07-06 · Branch `Phase-Imp`

Scope: LARO desktop app (Electron + in-process Express/tRPC + local SQLite). STRIDE
over the real attack surface. Cross-reference: `docs/SECURITY.md`.

## Assets
- Client PII (case names/emails/addresses), evidence files, OAuth tokens, session
  secrets, the local database.

## Trust boundaries
1. Renderer ↔ in-process API (localhost:3000) — same machine, but reachable by any
   local process / a malicious webpage (DNS-rebinding/CSRF class).
2. API ↔ external providers (Google/Microsoft/S3/SMTP) over TLS.
3. Packaged artifact ↔ end user's disk.

## STRIDE

| Category | Threat | Mitigation | Residual |
|---|---|---|---|
| **S**poofing | Forged session / local-agent token | Per-install random `JWT_SECRET`/`LOCAL_AGENT_TOKEN` (006/007); legacy constants dev-only | JWT has no server-side revocation |
| **T**ampering | Path traversal on upload; malformed input | Key/filename sanitization + base-dir confinement (015/047); Zod validation + state machine (021/059) | — |
| **R**epudiation | "Who did what?" | Audit log on case CRUD, outreach, login, GDPR (019) | Audit log is user-scoped only |
| **I**nfo disclosure | Cross-tenant data (IDOR); secrets in artifact | `assertCaseOwnership` + protected procs (008, tested 046); `.env` no longer bundled (030); security headers/CSP (029) | Weak OAuth-token encryption (`Buffer.alloc(32,secret)`); permissive dev CORS |
| **D**enial of service | Request flooding | In-memory rate limits on login/create/matching/outreach (018) | Not distributed (single-process desktop — acceptable) |
| **E**levation | Non-admin hits admin ops | `adminProcedure` role gate (036/061, tested) | Signup can't create admins (by design) |

## Highest-priority residuals (tracked)
1. **OAuth-token encryption** is weak — replace `Buffer.alloc(32, JWT_SECRET)` +
   CBC with AES-256-GCM and a proper key. (`docs/SECURITY.md` §5 item 2.)
2. **CSRF / permissive dev CORS** — add CSRF tokens / strict origin for
   state-changing requests. (029 follow-up.)
3. **JWT revocation** — add a server-side session/deny list.
4. **Unauthenticated OAuth-connect** binds a mailbox to any userId (012 follow-up).

## Design principles enforced
- No third party contacted without human approval (026) + feature flag off by
  default (058) + non-reversible warning (062).
- Fail-safe config: production refuses insecure secrets (006).
- No fake success surfaced as production (014).
