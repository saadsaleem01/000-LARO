# Human Decision Minimization (Phase 108)

Date: 2026-07-06 · Branch `Phase-Imp`

Principle: the operator/user should make the **fewest, highest-value** decisions.
The system does the deterministic work and surfaces only genuine exceptions.

## What LARO decides automatically (no human input)
- **Legal-area classification** of a case (deterministic engine — Phase 025).
- **Lawyer ranking** by the real scoring engine (Phase 011), with an honest
  confidence label (Phase 107) so a human can trust or override.
- **Draft preparation** for outreach (Phase 026).
- **Retry** of transient failures (Phase 110) — no human babysitting.

## What REQUIRES a human decision (and why)
| Decision | Why it stays human |
|---|---|
| Approve each outreach before send | Consequential external action — safety boundary (026/062) |
| Resolve a clarification (Phase 111) | Genuine ambiguity the system cannot safely guess (missing contact, multi-area) |
| Engage/release emergency stop (104) | Operator judgement, not automatable |

## How decisions are minimized in the UI
- `dashboard.exceptions` (Phase 109) shows **only** cases needing attention — a
  healthy pipeline shows an empty list, so the human isn't asked to review nominal
  cases.
- `dashboard.nextActions` gives one clear next step per case, ranked by priority.
- `clarifications.pending` lists only unresolved ambiguities; answered ones vanish.

## Anti-pattern avoided
The product does **not** fabricate a decision it cannot make (no fake auto-send).
Where it cannot proceed safely, it raises a clarification or an exception rather
than guessing — fewer but honest decisions, not zero decisions with hidden risk.
