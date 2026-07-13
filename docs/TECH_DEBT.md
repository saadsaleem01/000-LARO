# Technical Debt Register (Phase 076)

Date: 2026-07-06 · Branch `Phase-Imp`

| # | Debt | Impact | Ref / next phase |
|---|---|---|---|
| ~~D1~~ | **RESOLVED** — the 14 routers are implemented (`server/routers/extendedRouters.ts`), typed + mounted; UI actions hit real endpoints | — | closed (010) |
| D2 | Renderer `tsc` has ~425 pre-existing type errors | Med — no type safety in UI; built via Vite (no gate) | 041 |
| D3 | Real outreach **send** not implemented | High — critical-path gap | scaffolded + flag-gated (026/058) |
| ~~D4~~ | **RESOLVED** — OAuth-token crypto now authenticated AES-256-GCM (`server/crypto.ts`) | — | closed (007/030/080) |
| ~~D5~~ | **RESOLVED** — CSRF origin guard + strict CORS (`server/_core/csrf.ts`) + JWT revocation (`server/sessionRevocation.ts`) | — | closed (007/080) |
| D6 | Dead heavy deps (pdfkit, archiver, tesseract, stripe, …) | Low — surface/size | DEPENDENCY_AUDIT; build or drop |
| D7 | `npm audit`: 46 advisories (2 critical) | Med — supply chain | SUPPLY_CHAIN (066); triage |
| D8 | Duplicated `shared/` vs `src/shared/` | Low — drift risk | merge |
| D9 | Legacy `tests/*.test.ts` broken imports (excluded) | Low — replaced by new suites | 041 |
| D10 | No declared FKs (integrity app-enforced) | Med — needs reconcile | 054 mitigates; 061 verifies |
| ~~D11~~ | **RESOLVED** — top-level `LICENSE` added (proprietary) | — | closed (067) |
| D12 | PDF/zip evidence export missing (JSON only) | Low | 023 |
| D13 | Money/counts stored as TEXT | Low | 060/061 |
| D14 | i18n: renderer strings not migrated to `t()` | Low | 057 |

Ranked remediation: **D1/D3/D4** first (they touch the critical path and
security), then D7/D11 (release blockers), then the rest.
