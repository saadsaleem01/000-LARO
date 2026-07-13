# Deployment & Local Development (Phases 031–035)

Date: 2026-07-06 · Branch `Phase-Imp`

## Local dev — one command (Phase 031)

```bash
npm install        # installs deps (+ rebuilds better-sqlite3 for Electron)
npm run setup      # creates .env from .env.example, prints next steps
npm run dev        # Electron desktop app (renderer + main)
# or, API only:
npm run dev:server # standalone server on http://localhost:3000
npm run doctor     # environment self-diagnostic (Phase 034)
```

## Docker — server backend (Phase 032)

The `Dockerfile` builds and runs the **API server** (Express + tRPC + SQLite),
i.e. the same backend the desktop app embeds. It does **not** ship the Electron
desktop UI. SQLite and local evidence persist to the `/data` volume.

```bash
docker compose up --build          # http://localhost:3000
# or:
npm run docker:build && npm run docker:run
```

- Healthcheck: the container polls `/api/health`.
- Configure via `.env` (see `.env.example`). In production the server refuses to
  start without strong `JWT_SECRET`/`COOKIE_SECRET` (Phase 006).

## Health / readiness / liveness (Phase 035)

| Endpoint | Purpose | Touches DB |
|---|---|---|
| `GET /api/live` | Liveness — process is up | No |
| `GET /api/ready` | Readiness — DB reachable (503 if not) | Yes |
| `GET /api/health` | Summary: status, dbReady, version, env, uptime | Yes |

tRPC also exposes `health.check` (public) and `health.readiness` (protected, with
scheduled-job status), and `admin.diagnostics`/`admin.tableCounts` for operators
(Phase 036).

## Doctor (Phase 034)

`npm run doctor` prints a health report (Node version, secrets, DB driver,
migrations, integration config) and **exits non-zero** on production-critical
problems, so it can gate a deploy.

## Notes

- The desktop app is packaged separately with `npm run dist:*` (electron-builder).
- The packaged installer no longer bundles `.env` (Phase 030).
