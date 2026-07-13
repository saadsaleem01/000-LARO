# Data Model, Ownership & Persistence — 000-LARO (Phase 005)

Date: 2026-07-06 · Branch `staging`

Records the persistence design and the Phase 005 hardening applied to it.

---

## 1. Engine & topology

- **SQLite** via Drizzle ORM + better-sqlite3, running in-process inside Electron.
- Two databases: `laro-server.sqlite` (app data, 47 tables, Drizzle) and
  `laro-agent.db` (desktop scanner state, raw SQL).

## 2. Phase 005 changes (applied)

Implemented in [server/db.ts](../server/db.ts) as idempotent, boot-time steps so
they apply to existing on-disk databases without a destructive migration
(consistent with the codebase's existing `ensureAllTablesColumns` pattern):

- **Connection PRAGMAs** (`applyConnectionPragmas`): `journal_mode = WAL`,
  `foreign_keys = ON`, `busy_timeout = 5000`. These are per-connection settings
  SQLite does not persist, so they are set every time the DB is opened.
- **Unique constraint on `users.email`** (`CREATE UNIQUE INDEX IF NOT EXISTS
  users_email_unique ... WHERE email IS NOT NULL`) — one account per address.
  Created defensively: if a legacy DB already holds duplicate emails the CREATE
  fails and we log a reconcile-then-retry warning instead of crashing boot.
- **Hot-path indexes** on the highest-traffic lookup columns that were previously
  unindexed: `outreach_status(caseId|lawyerId|status)`, `email_messages(accountId)`,
  `email_activity(caseId)`, `lawyer_interactions(lawyerId)`, `evidence_items(userId)`,
  `unified_messages(userId)`, `notifications(userId)`, `audit_logs(userId)`.

Verification: `npx tsc -p tsconfig.server.json --noEmit` passes; indexes are
created with `IF NOT EXISTS` and guarded against "no such table" on
partially-migrated DBs.

## 3. Ownership model

- User-owned tables carry a `userId` column and are filtered by
  `ctx.user.id` in their routers (enforced — see Phase 008 / `docs/SECURITY.md`).
- Case-scoped child tables (`communication_gaps`, `expected_documents`,
  `outreach_status`, etc.) are keyed by `caseId` and are now guarded at the API
  layer by `assertCaseOwnership(caseId, userId)` before any read/write.

## 4. Known remaining gaps (future phases)

- **Declared foreign keys**: `foreign_keys` is now ON, but the schema still
  declares few explicit FK constraints. Introducing them requires reconciling
  existing orphan rows first (Phase 054 reconciliation) — tracked, not done here.
- **Numeric-as-text columns** (money, counts) remain `text`; typed columns are a
  later data-model refinement (Phase 060/061).
- **Two `shared/` copies** and the boot-time auto-`TEXT` column backfill remain;
  see the technical-debt notes in `docs/phase-audit.md`.
- **Whole-account deletion / export** (GDPR) is still missing — Phase 028.

## 5. Design decision: runtime ensure vs generated migration

The unique index and hot indexes are applied at runtime (idempotently) rather
than via a new drizzle migration, because the existing migration 0001 performs
destructive table rebuilds and the repo already relies on a runtime
schema-reconciliation layer. `schema.ts` remains the declarative source of truth;
a consolidated, non-destructive migration baseline is planned for Phase 033.
