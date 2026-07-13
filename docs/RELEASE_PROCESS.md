# Release Process, Canary & Rollback (Phase 069)

Date: 2026-07-06 · Branch `Phase-Imp`

## Branch model
- `Phase-Imp` (active work) → PR → `staging` → `main`.
- `Phase-Imp` branched from `staging` (`1b78ed6`).

## Versioning
- Semantic version in `package.json` (`app.getVersion()` surfaces it via
  `system.appInfo` and `/api/health`).
- Tag releases `vX.Y.Z`; the release CI job (build.yml) publishes on tags.

## Pre-release quality gates (Phase 068 CI)
1. `tsc` server + main — must pass (blocking).
2. `npx vitest run` — must pass (blocking).
3. `npm run doctor` — no prod-critical issues.
4. `npm audit` triaged (docs/SUPPLY_CHAIN.md).
5. Confirm no secrets committed; `.env` not bundled.

## Canary / staged rollout
- **Feature flags (Phase 058)** are the canary mechanism. Risky features ship
  **off** (e.g. `outreach.send.enabled=false`) and are enabled per-install /
  per-operator via `featureFlags.set` or `FEATURE_*` env, then widened.
- No blast radius: flags gate behaviour without redeploying.

## Rollback
- **App**: revert to the previous tagged build/installer.
- **Database**: restore from a backup — `scripts/backup.ts` / `npm run db:backup`
  and `restoreDatabase()` (Phase 033/053). A `.bak-<ts>` of the live DB is kept on
  restore.
- **Config**: rotate secrets by deleting `userData/laro-secrets.json` (regenerated
  on next launch — Phase 030).

## Post-release verification
- Hit `/api/live`, `/api/ready`, `/api/health`; run the critical-path smoke
  (docs/ACCEPTANCE_TESTS.md); confirm `admin.invariants` is clean.
