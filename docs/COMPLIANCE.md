# Compliance & Platform Policy Boundaries (Phase 013)

Date: 2026-07-06 · Branch `Phase-Imp`

The prompt's primary safety boundary: **high-stakes legal domain — the app must
not pretend to provide final legal advice, must preserve evidence provenance,
must protect personal data, and must require approval before contacting lawyers
or third parties.**

---

## 1. Legal-advice disclaimer (Phase 013 change, applied)

- Added `LEGAL_DISCLAIMER` (NL + EN) in `shared/const.ts`.
- Every AI-generated legal document from `gapAnalysis.generateDocument` now has
  the disclaimer appended to its `content`, and the response includes a
  `disclaimer` field. So no generated letter can be mistaken for definitive legal
  advice. Verified by `tests/smoke/noFakeSuccess.smoke.test.ts`.

**Disclaimer text (NL):** "Let op: LARO biedt juridische ondersteuning en
voorbereiding, geen definitief juridisch advies. Laat gegenereerde documenten en
analyses altijd controleren door een bevoegd advocaat voordat u ze gebruikt."

## 2. Evidence provenance

- Evidence collected from Gmail/Drive records its source metadata.
- Phase 015 adds a **sha256 content hash** (`hashBuffer`) returned by
  `storagePut`, so ingested files can carry an integrity hash for provenance.
  (Wiring the hash into every evidence-write path is tracked for Phase 015/019.)

## 3. Approval before contacting third parties

- No lawyer/third party is contacted automatically: the outreach send path is not
  wired (see `docs/PROVIDERS.md`). A human approval gate must exist **before** a
  real send is built — Phase 026. This ordering keeps the boundary intact.

## 4. Personal data protection

- Auth, ownership, and IDOR fixes landed in Phases 007/008 (`docs/SECURITY.md`).
- Residual: OAuth-token encryption is weak, and there is no data export/deletion
  (GDPR) yet — Phases 028/030.

## 5. Remaining compliance gaps (tracked, not done here)

| Gap | Phase |
|---|---|
| Disclaimer shown on case analysis / matching results in the UI | 037 (UI labelling) |
| GDPR data export + account deletion | 028 |
| i18n framework (NL/EN toggle) instead of hardcoded strings | 057 |
| Data-retention policy | 102 |
| Privacy impact assessment | 065 |

## 6. Honest status

Phase 013 makes generated legal content carry a disclaimer and documents the
boundaries; it does **not** claim full compliance. The UI-wide disclaimer, GDPR
tooling, and i18n remain open and are scheduled above.
