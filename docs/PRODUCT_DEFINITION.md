# Product Definition & User Outcome Contract — 000-LARO (Phase 002)

Date: 2026-07-06 · Branch `staging` @ `1b78ed6`

This document defines what LARO is *for*, who uses it, the outcome it promises,
and — per the prompt's "no false completion" rule — an **honest** statement of
which parts of that promise the code delivers today.

---

## 1. Product purpose

LARO (Legal AI Reach Out) is a **Dutch legal-assistance and lawyer-outreach
platform**. It helps a person with a legal problem:

1. describe their case,
2. gather and organize supporting evidence,
3. have the case classified into legal area(s),
4. be matched to suitable lawyers,
5. prepare outreach to those lawyers,
6. **review and approve** that outreach before anything is sent,
7. send it through a configured provider,
8. track responses and outcomes, and
9. export a complete evidence/outcome package.

It also surfaces an investor/operator dashboard.

It ships as an **Electron desktop application** (not a hosted web app).

## 2. Primary users & their outcome contract

| User | Wants | "Done" for them means |
|---|---|---|
| **Claimant / case owner** (primary) | Get their case in front of the right lawyers with minimal manual effort, without losing evidence | A case can go from intake to a set of contacted lawyers and an exportable package, with every external action shown truthfully and approved by them first |
| **Operator** (Noodzakelijk Online / Sir Velhorst) | Run the platform safely, see real metrics, intervene when needed | Dashboards reflect real data; every outreach is auditable, rate-limited, idempotent, and stoppable |
| **Lawyer** (recipient) | Receive relevant, well-prepared outreach | Receives a real message with the case summary and evidence references |

## 3. Non-negotiable safety boundary (must hold in UI, API, jobs, tests, docs)

- **No final legal advice.** LARO assists and prepares; it must not present itself
  as giving definitive legal advice. (Today: only one disclaimer exists in the
  whole UI — a gap tracked in Phase 013.)
- **Evidence provenance preserved.** Every piece of evidence must keep its source
  and integrity metadata. (Today: source metadata is captured for Gmail/Drive
  collection; **content integrity hashes are missing** — Phase 015.)
- **Personal data protected.** PII is stored (case names, emails, addresses; OAuth
  tokens). (Today: tokens are weakly "encrypted"; no data deletion/export — Phases 007/028.)
- **Human approval before contacting third parties.** No lawyer/third party is
  contacted without explicit user approval. (Today: nothing is actually sent to
  lawyers, and there is **no approval gate** — Phase 026. The absence of a real
  send currently prevents the boundary from being *violated*, but the gate must
  exist before send is built.)

## 4. Honest capability contract (what works vs what does not)

Legend: ✅ real & wired · ⚠️ partial/conditional · ❌ fake / dead / missing.
Evidence lives in `docs/CRITICAL_PATH.md` and `docs/phase-audit.md`.

| Capability | Status | Truth |
|---|---|---|
| Account signup / login / password reset | ✅ | Real bcrypt + JWT; reset flow is solid |
| Create a case / edit / delete (owner-scoped) | ✅ | Real, ownership-enforced CRUD |
| Bulk-import cases from CSV | ✅ | Real Papa.parse + insert |
| Collect evidence from Gmail / Google Drive | ⚠️ | Real API + S3 **when configured**; no integrity hash |
| Upload local files as evidence | ❌ | Desktop uploader **simulates** S3 and never sends bytes |
| Parse/OCR documents (PDF/docx/images) | ❌ | Deps present, **never used**; OCR returns a hardcoded document |
| Classify case into legal area(s) | ❌ | Just echoes the case type the user picked |
| Match lawyers to a case | ❌ | UI shows **randomized** data; the real engine is dead code |
| Lawyer directory data | ❌ | No working seed; table empty unless entered by hand |
| Draft outreach + human approval gate | ❌ | No draft, no gate |
| Send outreach to a lawyer | ❌ | Records a "sent" row but transmits nothing |
| Track lawyer responses | ❌ | Dead code; unread count hardcoded to 0 |
| Rate a lawyer (AI) | ✅ | Real LLM call when an API key is set (mock otherwise) |
| Export an evidence package (PDF/zip) | ❌ | Generates letter *text* only; no PDF/zip |
| Dashboard metrics | ⚠️ | Some real counts; headline KPIs + activity feed are hardcoded fakes |
| GDPR export / delete | ❌ | Empty stubs returning `{}` |

## 5. The contract in one sentence

> Today LARO can **capture a case and (with configuration) collect evidence from
> connected mailboxes**, but it **cannot yet truthfully classify, match, contact a
> lawyer, track a reply, or export a package** — those steps are fake, dead, or
> missing and are the subject of the Stage A–B implementation phases.

Every user-facing control that maps to an ❌ row above must, before any production
claim, either be made real or be hidden/labelled as unavailable (Phases 014/037).
