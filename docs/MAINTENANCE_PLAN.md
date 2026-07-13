# Post-Completion Maintenance Plan (Phase 098)

Date: 2026-07-06 · Branch `Phase-Imp`

## Cadence
| Interval | Task |
|---|---|
| Each change | `npm run gate` must pass before merge (CI enforces — Phase 068). |
| Weekly | `npm audit` triage (D7); review new advisories; bump criticals. |
| Weekly | Run `node scripts/traceability.mjs` + `no-excuses-scan` to catch drift. |
| Monthly | Review docs/TECH_DEBT.md; burn down highest-severity item. |
| Monthly | Verify backups restore (`server/backup.ts`) + run `admin.invariants`. |
| Per release | docs/RELEASE_PROCESS.md + docs/ACCOUNT_SAFETY.md checklist. |
| Quarterly | Dependency freshness; drop dead deps (D6); rotate provider keys. |

## Ownership & escalation
- Data-integrity drift → `admin.reconcileReport` / `admin.invariants`, then repair.
- Security finding → docs/THREAT_MODEL.md owners; hotfix + release note.
- Incident → docs/OPERATOR_RUNBOOK.md (health, emergency stop, rollback via backup).

## Health signals to watch
- `/api/ready` readiness + job status (Phase 016/035).
- Feature-flag state (`outreach.send.enabled` must stay OFF until D3 is real).
- Gate status in CI (red gate blocks release).

## Debt burn-down order
D1 (dead UI routers) → D3 (real send) → D4 (token crypto) → D7 (audit) →
D11 (LICENSE) → remainder. Rationale in docs/TECH_DEBT.md + docs/TASK_GRAPH.md.
