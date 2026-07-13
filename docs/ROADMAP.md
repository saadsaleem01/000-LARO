# Roadmap & Blocked Items (Phase 099)

Date: 2026-07-06 · Branch `Phase-Imp`

## Remaining phases (101–115) — planned
| Phase | Theme | Depends on |
|---|---|---|
| 101 | Real-provider integration cleanup | 100 account safety |
| 102 | Debug bundle / support export | 035 observability |
| 103 | Data retention & lifecycle | 028/078 GDPR |
| 104 | Production migration strategy | 033 migrations |
| 105 | Emergency stop / kill switch | 058 flags, 016 jobs |
| 106 | Onboarding flow | 071 help |
| 107 | Roles & permissions (teams) | 008 authz |
| 108 | Confidence display for AI/matching | 025 classify, 011 match |
| 109 | Decision minimization / exception dashboard | 020 dashboard |
| 110 | Safe retries & idempotency (send path) | 017, D3 |
| 111 | Ambiguous-action handling | 062 pre-send review |
| 112 | Versioning & compatibility | 009 API contract |
| 113 | Regression baseline | 040–049 suites |
| 114 | Maintenance review | 098 plan |
| 115 | Operator-readiness sign-off | 070 runbook |

## Blocked / gated items (with reason)
| Item | Blocked by | Unblock when |
|---|---|---|
| Real outreach **send** (D3) | safety design + idempotency (110) | approval+flag+review proven, send path built & idempotent |
| 14 renderer screens (D1) | missing backend routers | implement routers OR hide behind flags |
| Teams/roles (107) | single-user authz model today | multi-tenant ownership design |
| Reply tracking | email ingest partial | provider ingest + threading |
| Distribution (D11) | no LICENSE (owner action) | owner adds LICENSE file |

## Nearest high-value work
1. **D1** — stop the renderer implying unbuilt features (hide or implement).
2. **D3** — the real send loop (the core autonomy promise), behind its existing gate.
3. **D4/D7** — token crypto + audit advisories before any real distribution.
