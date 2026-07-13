# Prototype → Production Migration (Phase 103)

Date: 2026-07-06 · Branch `Phase-Imp`

LARO ships as a local-first Electron app. "Production" means a real installed
deployment for real cases (not the dev/demo environment).

## Preflight (automated: `npm run preflight`)
`scripts/prod-preflight.mjs` blocks go-live unless:
- `JWT_SECRET` and `COOKIE_SECRET` are set and strong (not the shipped placeholders) —
  enforced at runtime too by the config fail-safe (Phase 006).
- Demo mode is OFF (`system.appInfo.demoMode=false`).
- Migrations are present in `drizzle/`.
- No real `.env` is tracked in git (only `.env.example`).
- The current `package.json` version has a `CHANGELOG.md` entry (warn).

## Migration steps
1. `npm ci` on the target (rebuilds the `better-sqlite3` native binding).
2. Provide production credentials via the **environment**, never a bundled file
   (account safety — Phase 100).
3. Run DB migrations (`npm run db:push` / packaged migrations in `drizzle/`).
4. `NODE_ENV=production npm run preflight` — must pass with no blockers.
5. `npm run gate` — full tsc + test suite green.
6. Remove demo/seed + demo-labelled data; verify `admin.invariants` is clean.
7. Confirm the emergency stop is released and `outreach.send.enabled` is set to
   the intended value (default OFF — the real send is not implemented, D3).

## Data migration
Prototype SQLite data can be carried over as-is (same schema). Use
`server/backup.ts` to snapshot before migrating, and `admin.reconcileReport` to
detect drift afterward.
