# Red-Team Review — Loops 1–3 (Phases 078–080)

Date: 2026-07-06 · Branch `Phase-Imp`

Three adversarial passes, each with a lens; findings were fixed (not just noted)
and covered by tests where applicable.

## Loop 1 (Phase 078) — data isolation & erasure
- **FINDING (High): GDPR erasure incomplete.** `deleteUserData` deleted
  userId-scoped rows + the user, but rows keyed only by `caseId` (outreach_status,
  email_activity, communication_gaps, expected_documents, suspicious_patterns,
  legal_inferences, case_strength_analysis) were left orphaned. → **FIXED**: collect
  the user's case ids and purge caseId-scoped children first. Test:
  `tests/backend/phase071_080.test.ts` (outreach rows gone after erasure).
- Verified cross-user isolation holds (existing `tests/security/isolation.test.ts`).
- **Residual (tracked):** evidence blobs in storage are not deleted on erasure
  (DB rows are) — add best-effort `storageDelete` sweep (→ D3/102).

## Loop 2 (Phase 079) — info disclosure & auth surface
- **FINDING (Low): `system.providerChecklist` was public**, revealing which
  integrations are configured to unauthenticated callers. → **FIXED**: now
  `protectedProcedure`. Test asserts UNAUTHORIZED for anon.
- Confirmed `admin.*` is admin-gated; sensitive reads are owner-scoped; no secret
  values are returned by diagnostics/checklists (booleans only).

## Loop 3 (Phase 080) — input abuse, DoS, supply chain
- Adversarial inputs (malformed/oversized/injection-style) are rejected cleanly
  (`tests/security/adversarial.test.ts`); rate limits fire on abuse.
- Path traversal is confined to the storage base (`tests/security/fileSafety.test.ts`).
- Illegal state transitions rejected (`tests/backend/stateMachines.test.ts`).
- **Findings (tracked, not fixed here):** weak OAuth-token crypto (D4), no CSRF /
  permissive dev CORS (D5), 46 npm-audit advisories (D7). These are documented in
  THREAT_MODEL/SECURITY/SUPPLY_CHAIN with owners and next phases.

## Net result
2 real bugs fixed (1 High privacy, 1 Low disclosure) + confirmation the existing
guards hold. Remaining items are tracked with severity in docs/TECH_DEBT.md.
