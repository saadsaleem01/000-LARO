# Autonomy-First Product Review (Phase 082)

Date: 2026-07-06 · Branch `Phase-Imp`

LARO's premise is an *autonomous legal assistant*: describe a case and it does the
legwork. This review states honestly how autonomous the product actually is today,
step by step, grounded in code.

## Autonomy scorecard (real, per critical-path step)
| Step | Ideal (fully autonomous) | Actual today | Autonomy |
|---|---|---|---|
| Classify case → legal areas | automatic | `classifyLegalAreas()` deterministic, real (`server/classification.ts`) | **Full** |
| Find suitable lawyers | automatic | `matching.findLawyers` real scoring engine | **Full** |
| Gather evidence | auto-collect from connected sources | manual upload works; provider auto-collection only when configured, else honest "unavailable" | **Partial** |
| Draft outreach | automatic | `workflow.prepareDrafts` generates real drafts | **Full** |
| **Send outreach** | automatic (with guardrail) | **NOT implemented** — approval + flag gate exist, no send path | **None (by design, safety)** |
| Track replies / follow up | automatic | not implemented (email ingest partial, no reply loop) | **None** |

## The central honesty point
The headline "auto-outreach" is deliberately **half-built**: everything up to a
human approval is real, but **no lawyer is ever contacted automatically**. This is
not an accidental gap — it is the safety boundary (Phases 026/062): a legal tool
must not autonomously contact third parties on a user's behalf. The remaining
autonomy (actual send + reply tracking) is scaffolded and feature-flag-gated
(`outreach.send.enabled`, default OFF) so it can be finished without re-plumbing.

## Verdict
- **Autonomous where it is safe** (classify, match, draft): real and working.
- **Human-gated where it is consequential** (contacting lawyers): intentionally so.
- Do **not** market end-to-end autonomy until the send + follow-up loop is real.
  Tracked as D3 in docs/TECH_DEBT.md; the critical path is documented honestly in
  docs/CRITICAL_PATH.md.
