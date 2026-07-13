# Architecture Decision & Current-Stack Validation — 000-LARO (Phase 004)

Date: 2026-07-06 · Branch `staging` @ `1b78ed6`

Purpose: record the **real** architecture, validate the current stack against the
product goal, decide whether to keep it, and list the fail-safe / labelling gaps
that the current architecture leaves open (which later phases must close).

---

## 1. The stack, as it actually is

| Concern | Reality | Evidence |
|---|---|---|
| Shell | Single-process Electron 29 | `src-main/index.ts:169-199` |
| Backend | Express 4 + tRPC 10 **in the Electron main process** (not a separate service) | `src-main/index.ts:198-199`, `server/index.ts:49-121` |
| Database | Local SQLite via Drizzle + better-sqlite3 (2 DBs: server + scanner) | `server/db.ts:17-19,232-233`, `src-main/database.ts:16-19` |
| Frontend | React 18 + Vite + Tailwind + Radix + TanStack Query + tRPC client + wouter | `src/renderer/main.tsx`, `src/renderer/DashboardApp.tsx` |
| File storage | AWS S3 (presigned URLs), no-op local fallback | `server/storage.ts:7-35` |
| Scheduler | `node-cron`, started on server listen | `server/cronScheduler.ts`, `server/index.ts:176` |
| AI | Pluggable LLM (`server/llm.ts`, Manus Forge), labelled mock without a key | `server/llm.ts:212-321` |

**Contradiction resolved:** the previous `PROJECT_INFO.md` claimed Docker + MySQL 8.0
+ Redis + an `electron/` directory. None exist in the repo (no Dockerfile,
docker-compose, MySQL/Redis client, or `electron/` dir). `PROJECT_INFO.md` has been
corrected (Phase 075).

## 2. Architecture Decision Record

**Decision:** Keep the Electron + in-process Express/tRPC + local-SQLite architecture.

**Context:** LARO is delivered as a desktop app for a single operator/claimant
workflow. The heavy "microservice" framing in old docs was never implemented and
adds no value to a desktop deliverable.

**Rationale for keeping it:**
- The in-process server means one artifact, no container runtime dependency, and a
  genuine "unzip and run" desktop experience.
- SQLite is appropriate for a single-user desktop scope and is already the real
  persistence layer with a working (if fragile) migration system.
- tRPC gives end-to-end typed calls between the renderer and the in-process backend.

**Consequences / accepted trade-offs:**
- No horizontal scaling / multi-tenant server. Acceptable for the desktop scope; if
  a hosted multi-tenant SaaS is later required, the server is already an Express app
  and can be extracted to run standalone (`npm run dev:server` already does this).
- SQLite integrity must be enforced deliberately (FKs/uniques/indexes are currently
  missing — Phase 005/061).

**Rejected alternative:** resurrecting the Docker/MySQL/Redis stack — rejected as
unimplemented, unnecessary for the desktop deliverable, and a source of doc drift.

## 3. Stack validation against the product goal

| Goal need | Does the stack support it? | Note |
|---|---|---|
| Case + evidence persistence | ✅ | SQLite/Drizzle; needs constraints (Phase 005) |
| Evidence blobs | ✅ | S3; must fix silent-drop fallback (Phase 015) |
| External providers (Gmail/Drive/Outlook/Trello) | ✅ | Real clients present |
| Background outreach jobs | ✅ (capability) | `node-cron` present; outreach job body is commented out (Phase 016) |
| AI classification/matching/rating | ✅ (capability) | LLM layer exists; classification/matching not wired to it (Phases 011/025) |
| Desktop distribution | ✅ | electron-builder; must stop bundling `.env` (Phase 030/100) |

**Verdict:** the stack is adequate for the product goal. The problem is not the
architecture — it is that the **critical-path business logic on top of it is
fake/dead/missing** (see `docs/CRITICAL_PATH.md`).

## 4. Fail-safe & labelling gaps this architecture currently leaves open

Phase 004's special-attention theme: *production config must fail safe;
dev/demo/test modes must be visibly labelled and impossible to confuse with prod.*
The current architecture **does not** meet this yet:

- **Fails open, not safe:** `server/_core/env.ts` defaults every var (incl.
  `JWT_SECRET='change-this-secret'`) and never validates — the app boots in a
  predictable-secret state. `NODE_ENV` even defaults to `'production'`. → Phase 006.
- **Demo/mock reachable in production, unlabelled:** random matching
  (`server/routers/matching.ts:34`), fake OCR (`server/routers/index.ts:381-390`),
  LLM mock on missing key (`server/llm.ts:268-300`), and a URL-param public demo
  mode (`src/renderer/_core/hooks/useAuth.ts`). → Phases 014/037.
- **Auth bypass baked in:** `local-default`/`local-dev-token` bearer tokens in
  `server/context.ts:29-52`. → Phase 007.

These are recorded here so the architecture record is honest about what it does
**not** yet guarantee. They are not fixed in Phase 004 (which is
decision/validation only); they are the first work items of Stage A.

## 5. Entry-point flow (for operators)

`electron dist/main/src-main/index.js`
→ `app.whenReady()` sets `DATABASE_URL=userData/laro-server.sqlite`, pins `NODE_ENV`
→ `import('../server/index').startServer(3000)` (runs migrations, listens, starts cron)
→ `BrowserWindow` loads `http://localhost:3000`
→ renderer boots the React SPA → tRPC client calls `/api/trpc`.

Port `3000` is hardcoded (`src-main/index.ts:16`).
