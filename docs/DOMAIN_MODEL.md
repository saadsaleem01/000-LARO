# Domain Model Specification (Phase 060)

Date: 2026-07-06 · Branch `Phase-Imp`

The canonical domain model for LARO — entities, relationships, ownership,
invariants, and state — as actually implemented (`server/schema.ts` + the
routers/services). This is the source-of-truth spec; the full 47-table inventory
is in `docs/DATA_MODEL.md` and `docs/phase-audit.md`.

## Core entities

| Entity | Table | Owner | Purpose |
|---|---|---|---|
| **User** | `users` | — (is the owner) | Account, auth, role. `email` UNIQUE (Phase 005). |
| **Case** | `cases` | `userId` | The legal matter. Has classification (`legalAreas`), `status`, `urgency`, client PII. |
| **Lawyer** | `lawyers` | global | Directory + match-scoring stats. Not user-owned. |
| **Evidence** | `evidence` / `evidence_files` | `userId` (+`caseId`) | Collected/uploaded materials; provenance via sha256 (Phase 015). |
| **Outreach** | `outreach_status` | via `caseId` | One row per (case, lawyer) — UNIQUE (Phase 017). Carries the approval/response state. |
| **Notification** | `notifications` | `userId` | User-facing events (Phase 027). |
| **AuditLog** | `audit_logs` | `userId` | Event history (Phase 019). |

## Relationships

```
User (1) ──< Case (N) ──< Evidence (N)
                     └──< Outreach (N) >── Lawyer (1)   [unique (caseId, lawyerId)]
User (1) ──< Notification (N)
User (1) ──< AuditLog (N)
```

## Ownership & authorization invariants

- Every user-owned read/write is scoped by `ctx.user.id` (protected procedures).
- Case-scoped resources are guarded by `assertCaseOwnership(caseId, userId)`
  (`server/_core/authz.ts`) — no cross-tenant access (verified by
  `tests/security/isolation.test.ts`).
- The desktop scanner authenticates as a per-install local identity (Phase 007).

## Data invariants

- `users.email` is unique (partial index).
- `outreach_status(caseId, lawyerId)` is unique → outreach is idempotent (Phase 017).
- `cases.legalAreas` is always valid JSON of canonical areas (`sanitizeLegalAreas`).
- Storage keys are sanitized; evidence bytes never escape the storage base (Phase 015/047).
- Referential drift is detectable/repairable (`server/reconcile.ts`, Phase 054).

## State (see docs/STATE_MACHINES.md)

- **Case**: `Intake → Matching → Outreach → Matched → Closed` (Closed terminal).
- **Outreach**: `PendingApproval → Approved|Rejected → Sent → Interested|Declined|NoResponse`.
  A draft cannot skip approval; the real send is additionally flag-gated
  (`outreach.send.enabled`, default off) — safety boundary.

## Critical-path mapping

account → **case intake** (`cases.create`) → **classification** (`classification.ts`)
→ **matching** (`matching.ts`) → **outreach draft** (`workflow.prepareDrafts`) →
**human approval** (`workflow.approveDraft`) → *send (not yet implemented)* →
response tracking → outcome → **export** (`cases.export`, GDPR export).

## Known model gaps

- No declared foreign keys yet (integrity is app-enforced + reconcilable).
- Money/counts stored as text (typed columns are a later refinement).
- The real outreach **send** and inbound response tracking are not yet wired.
