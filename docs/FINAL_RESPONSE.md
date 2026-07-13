# Final Response Requirements (Phase 097)

Date: 2026-07-06 · Branch `Phase-Imp`

Rules for how completion of this program must be reported to the user, so the final
response is trustworthy (ties to Phases 014/075/090).

## A truthful final response MUST
1. **State real status per area** using the completion matrix — Implemented /
   Partial / Missing — never round Partial up to Done.
2. **Name the top residuals** explicitly (D1 dead routers, D3 real send, D4 token
   crypto) rather than implying full completion.
3. **Point to reproducible evidence**: `npm run gate`, the test tally, the audit
   docs — not adjectives.
4. **Distinguish backend reality from UI reality**: backend is tested; the renderer
   carries known debt and dead-router screens.
5. **Not claim autonomy that isn't there**: the product prepares outreach; it does
   not send. Say so.
6. **Credit safety boundaries as intentional**, not as missing features (no send
   without approval is a guarantee, not a bug).

## A truthful final response MUST NOT
- Present demo/seed data as real results.
- Describe planned/flag-gated features as working.
- Hide failing checks; if a gate is red, say which and why.

## Template
> Implemented: <areas with tests>. Partial: <areas + named residual>. Not done:
> <areas>. Verify with `npm run gate` (currently: <result>). Top risks before
> release: <D1/D3/D4>. Nothing is sent without user approval.
