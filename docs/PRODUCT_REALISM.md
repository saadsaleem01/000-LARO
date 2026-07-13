# Product Realism Review (Phase 084)

Date: 2026-07-06 · Branch `Phase-Imp`

Checks that what the product *presents* matches what it *does* — no capability is
implied that isn't real (ties to Phases 014 no-fake-success, 037 labelling).

## Claims vs reality
| Surface | Implied capability | Real? | Note / mitigation |
|---|---|---|---|
| Case classification | infers legal areas | ✅ | deterministic engine + tests |
| Lawyer matching | ranked, real lawyers | ✅ | engine real; lawyer data must be seeded/real |
| "Send outreach" buttons | contacts lawyers | ❌ not built | gated OFF; approval never triggers a send (D3) |
| 14 renderer routers (evidence, unifiedInbox, …) | working screens | ❌ no backend | UI_ACTION_AUDIT (073); hide behind flag until built (D1) |
| Analytics dashboards | live metrics | ⚠️ partial | some real (`analytics.getOverallStats`), some honest `[]` |
| OCR | extracts text | ❌ | throws NOT_IMPLEMENTED honestly (no fake result) |
| Demo mode | clearly labelled | ✅ | `system.appInfo.banner`, forced off in prod (037) |

## Realism risks (ranked)
1. **D1 — 14 dead-router UI screens** imply working features. Highest realism risk;
   hide or implement before any release.
2. **D3 — send loop** implies delivery the product doesn't perform.
3. **Seed/demo data** must be unmistakably labelled so demo lawyers aren't mistaken
   for real ones (037 banner in place; keep it).

## Verdict
Backend is realistic (unbuilt things fail honestly). The realism gap is in the
**renderer**, which exposes actions the backend doesn't implement. Remediation is
tracked (D1/D3) and the audits are truthful (075).
