# Final Human-Operator Readiness (Phase 115)

Date: 2026-07-06 · Branch `Phase-Imp`

Can a human operator safely run LARO? This is the sign-off checklist, backed by a
runnable script (`npm run readiness`).

## Automated readiness (`scripts/operator-readiness.mjs`)
Composes and must pass: traceability, no-excuses scan, account safety, regression
baseline (required) + production preflight (advisory). Current run: **all green**.

## Manual operator sign-off checklist
- [ ] `npm run gate` green (server+main tsc, traceability, scans, full tests).
- [ ] `NODE_ENV=production npm run preflight` green in the target environment.
- [ ] Strong `JWT_SECRET` / `COOKIE_SECRET`; no `.env` in the bundle (Phase 100).
- [ ] Demo mode OFF; demo/seed data removed from the production DB.
- [ ] `admin.invariants` clean; `admin.reconcileReport` shows no orphans.
- [ ] A backup has been taken and a **restore** was tested (server/backup.ts).
- [ ] Emergency stop is released; `outreach.send.enabled` is the intended value
      (default OFF — the real send is not implemented, D3).
- [ ] Operator knows: how to engage the emergency stop, where the runbook is
      (docs/OPERATOR_RUNBOOK.md), and how to roll back (docs/RELEASE_PROCESS.md).

## Honest readiness verdict
LARO is **operator-ready as a triage/match/prepare tool** with working safety
controls (emergency stop, approval gate, retention, GDPR). It is **not** ready to
be represented as an end-to-end autonomous outreach system: the send loop (D3) is
unbuilt and the renderer has dead-router screens (D1). Operate it for what is real;
keep send disabled until D3 is implemented and re-reviewed.
