# Dependency & File Audit — 000-LARO (Phase 001)

Date: 2026-07-06 · Branch `staging` @ `1b78ed6`
Method: import-graph grep across `server/ src/ src-main/ scripts/ lib/ shared/`
(`from '<pkg>'` / `require('<pkg>')`), cross-checked against `package.json`.

The point of this audit (per the prompt's "no false completion" rule) is to make
sure no declared capability is implied by a dependency that is never actually used.

---

## 1. File inventory (source roots)

| Root | Files | Purpose |
|---|---|---|
| `server/` | 73 | Express + tRPC backend, services, integrations (runs in-process inside Electron) |
| `src/renderer/` | ~166 | React SPA (dashboard + scanner mini-app) |
| `src-main/` | 7 | Electron main process (entry, agent DB, preload, scanner, uploader, autoUpdater) |
| `shared/` + `src/shared/` | 3 + 3 | Cross-process types/const/exclusions — **duplicated** (divergence hazard, tracked in debt register) |
| `lib/` | 1 | `electronApiShim.ts` |
| `scripts/` | 18 | Dev/one-off utilities (scrapers, matching harnesses, build hooks) — none wired into CI |
| `tests/` | 27 (+1 new smoke) | Vitest tests — legacy 27 have broken imports (Phase 040) |
| `drizzle/` | 2 SQL + meta | Migrations |
| `docs/` | (this set) | Audit / architecture / critical-path artifacts |

Removed in Phase 000 (junk/harmful, unreferenced): `.github/workflows/Untitled`,
`laro-desktop@1.0.0`, `tsc-err-out.txt`, `fix_ts.py`, `patcher.js`.

Notable non-source payload: `assets/` bundles a **second, separate project**
(its own `package.json`/lockfile and a Python FastAPI backend `assets/main.py`
plus Rechtspraak scrapers) — the prior stack, shipped into the desktop app via
electron-builder `extraResources`. Flagged for Phase 066/103 review.

## 2. Dependencies actually used (import count > 0)

| Package | Imports | Used for |
|---|---|---|
| `drizzle-orm` | 44 | ORM — core |
| `zod` | 29 | Input validation — core |
| `wouter` | 17 | Renderer routing |
| `recharts` | 5 | Dashboard charts |
| `googleapis` | 3 | Gmail / Drive |
| `superjson` | 3 | tRPC transformer |
| `better-sqlite3` | 2 | SQLite driver |
| `jsonwebtoken` | 2 | Session JWTs |
| `@aws-sdk/client-s3` | 1 | Evidence storage |
| `@microsoft/microsoft-graph-client` | 1 | Outlook |
| `nodemailer` | 1 | System/SMTP email |
| `papaparse` | 1 | CSV bulk import |
| `node-cron` | 1 | Scheduler |
| `bcryptjs` | 1 | Password hashing |
| `tailwind-merge` | 1 | UI class merging |

(Radix UI, React, Tailwind, TanStack Query, tRPC client packages are used
throughout the renderer; not enumerated line-by-line here.)

## 3. Declared dependencies with ZERO imports (dead weight → unbuilt features)

These are the important finding. Each corresponds to a feature the product
*appears* to offer but does not implement. **Kept for now** (they mark the
intended feature), but must not be presented as working capability.

| Package | Zero-import? | Feature it implies | Phase that must build it (or drop the dep) |
|---|---|---|---|
| `pdf-parse` | yes | Extract text from uploaded PDFs | 015 (evidence parsing) |
| `mammoth` | yes | Extract text from `.docx` | 015 |
| `tesseract.js` | yes | OCR of scanned images | 015 (the wired `ocr.extractText` is a **hardcoded fake**, `server/routers/index.ts:381-390`) |
| `pdfkit` | yes | Render evidence/letters to PDF | 023 (export package) |
| `archiver` | yes | Zip the evidence/export package | 023 |
| `xlsx` | yes | Excel import/export | 023 |
| `stripe` | yes | Billing / subscriptions | 056 (Stripe SDK is **never instantiated**; usage-tracking scaffolding exists but is unwired) |
| `socket.io` / `socket.io-client` | yes | Realtime updates | 035/109 (or drop) |
| `@azure/msal-node` | yes | Microsoft auth via MSAL | 007/012 (Outlook OAuth is done with plain `fetch`, not MSAL) |
| `jose` | yes | JWT/JWE (alt to `jsonwebtoken`) | 007 (redundant — consolidate or drop) |

## 4. Verification (expected vs actual)

- **Expected:** the 10 packages above produce no matches in the import-graph grep.
  **Actual:** confirmed 0 matches each (command re-runnable:
  `grep -rIlE "from ['\"]<pkg>" --include='*.ts' --include='*.tsx' server src src-main scripts`).
- **Expected:** no `.env`, `*.sqlite`, `*.db`, token, or upload files tracked by git.
  **Actual:** confirmed — `git ls-files` returns only source; `.gitignore` covers them.

## 5. Recommended actions (not performed in this phase)

1. Do **not** remove the feature-implying dead deps yet — removing them would erase
   the only marker of the intended feature. Instead, build the feature (Phases 015/023/056)
   or, if a feature is cut, remove the dep in the same change and note it in the roadmap.
2. Remove the genuinely redundant deps (`jose` vs `jsonwebtoken`; MSAL vs the plain
   OAuth path) once auth is consolidated in Phase 007.
3. De-duplicate `shared/` vs `src/shared/` (debt register).
