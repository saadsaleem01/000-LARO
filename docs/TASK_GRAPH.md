# Task Graph & Dependency Map (Phase 086)

Date: 2026-07-06 · Branch `Phase-Imp`

The real dependency ordering behind the phase program — what must be true before a
later piece of work is anything other than vanity (Phase 090).

## Critical-path spine (each depends on the prior)
```
006 config fail-safe ─┐
008 ownership/IDOR ───┤→ safe to expose real data
025 classification ───┴→ 011 matching ──→ 026 approval gate ──→ 062 pre-send review
                                                   │
                                                   └─(gated)→ [D3 real send] → reply tracking
```

## Support clusters (enable the spine, not on it)
- **Data trust:** 053 backup ← 054 reconcile ← 061 invariants ← 060 domain model.
- **Safety/consent:** 028/078 GDPR ← 065 DPIA ← 064 threat model.
- **Operability:** 035 observability ← 036 admin diag ← 070 runbook ← 069 release.
- **Verification:** 040 backend suite ← 043 e2e ← 045–048 security ← 081 user sim ←
  085 traceability ← 089 stabilization gate ← 068 CI.

## Dependency rules enforced
1. No phase touching real user data ships before 006 + 008 (fail-safe + ownership).
2. No "send" work is real until the approval gate (026) + flag (058) + review (062)
   exist — they do; the send itself (D3) is the only missing spine node.
3. Verification phases (040–049, 081, 089) gate advancement — `npm run gate`
   refuses to proceed on red (Phase 089).

## Current frontier
Spine is complete **except D3 (real send)**. The highest-leverage next node is
either finishing D3 (unlocks reply-tracking) or remediating D1 (dead UI routers)
so the renderer stops implying unbuilt features. Everything else is support work.
