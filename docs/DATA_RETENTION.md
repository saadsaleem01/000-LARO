# Data Retention & Archival Policy (Phase 102)

Date: 2026-07-06 · Branch `Phase-Imp`

## Policy (enforced in code: `server/retention.ts`)
| Data | Retention | Action at expiry |
|---|---|---|
| Audit logs (`audit_logs`) | `AUDIT_RETENTION_DAYS` (default 365) | Deleted (holds IP/user metadata — minimize) |
| User business data (cases, evidence, outreach) | For account lifetime | Governed by the **user** (GDPR erasure), not by retention |

Rationale: audit logs accumulate indefinitely and contain identifying metadata
that should not be kept forever (privacy minimization — see DPIA). Business data
belongs to the user; only the user (or account deletion) removes it.

## How it runs
- `admin.retentionPreview` — dry run: reports what WOULD be deleted (no change).
- `admin.retentionRun` — executes the sweep; writes an audit entry with the report.
- Schedulable via the job runner; safe to run repeatedly (no-op when nothing old).

## Guarantees
- The sweep counts before deleting and returns an honest `{ auditLogsDeleted, cutoffISO }`.
- It never touches cases/evidence/outreach — verified by the phase 101–115 test
  (old audit row purged, recent row + business data untouched).
- Configure the window with `AUDIT_RETENTION_DAYS`.
