# Frontend Architecture & Navigation Model — 000-LARO (Phase 010)

Date: 2026-07-06 · Branch `staging`

Documents the renderer's structure, routing/navigation model, auth gating, and
the current state of placeholder routes.

---

## 1. Two renderer surfaces

The renderer ([src/renderer/main.tsx](../src/renderer/main.tsx)) selects one of
two apps at boot:

- **Dashboard** (`DashboardApp`) — the main product. Chosen by default.
- **Scanner mini-app** (`App`) — the desktop evidence scanner. Chosen when the
  URL has `?mode=scanner`. Uses manual `useState` page switching, not a router.

## 2. Navigation model (dashboard)

- Router: **wouter** (`<Switch>`/`<Route>`), switching to `useHashLocation` when
  running under `file://` ([src/renderer/DashboardApp.tsx](../src/renderer/DashboardApp.tsx)).
- Data: **tRPC + TanStack Query v4**, cookie session (`credentials: 'include'`).
- Auth state: `useAuth` ([src/renderer/_core/hooks/useAuth.ts](../src/renderer/_core/hooks/useAuth.ts))
  reads `auth.me`; with `redirectOnUnauthenticated` it sends the user to `/login`.

### Route inventory

| Route | Page | Status |
|---|---|---|
| `/` | Home/dashboard | Real (some KPI cards still mocked — Phase 014) |
| `/cases`, `/cases/:id` | Cases | Real, owner-scoped |
| `/lawyers`, `/lawyers/:id` | Lawyers / profile | Real list; matching data still stubbed (Phase 011) |
| `/evidence` | Evidence | Partial |
| `/messages`, `/email` | Messages | Partial |
| `/settings`, `/email-settings`, `/privacy` | Settings/privacy | Partial (GDPR stubs — Phase 028) |
| `/admin`, `/admin-analytics` | Admin | Partial; **not role-gated** (Phase 036/106) |
| `/help` | Help | Present |
| `/email-automation`, `/analytics`, `/billing`, `/reports` | — | **Placeholder routes** (Phase 014/056) |

## 3. Auth gating (updated by Phase 008)

The important navigation-safety change this phase depends on is **server-side**:
data procedures are now `protectedProcedure` and enforce ownership. Consequences
for the frontend:

- **Demo mode (`?demo=true`)** only skips the client-side redirect-to-login; it
  never forged authentication. Previously it read a shared `demo-user-123` bucket
  via public procedures. With Phase 008 those procedures require a session, so
  demo mode now renders as a **logged-out view with no data** — honest, not a
  data-exposing bypass. (A visible "Demo — not signed in" label is a follow-up UI
  task under Phase 037.)
- The scanner authenticates with the per-install agent token (Phase 007), so its
  tRPC calls carry a real identity instead of the `local-default` constant.

## 4. Known frontend debt (tracked, not in scope for 005–010)

- The renderer does **not** currently pass `tsc` (≈425 pre-existing type errors
  across many components incl. `components/ui/*`); it is built with Vite, which
  does not typecheck. Cleaning this up is Phase 041 (frontend test/type suite).
  The only renderer file changed in this batch, `pages/AuthPage.tsx`, typechecks
  clean.
- Placeholder routes and mocked dashboard cards must be made real or hidden
  before any production claim (Phases 011/014).
- Duplicated `shared/` vs `src/shared/` (debt register).

## 5. Navigation decision

Keep wouter + the two-surface model. It is lightweight and already works; the
priority is not restructuring navigation but making the **destinations** real
(critical-path phases) and gating them with the now-enforced server auth.
