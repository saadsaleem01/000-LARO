# Backend Endpoint Usage Audit (Phase 074)

Date: 2026-07-06 · Branch `Phase-Imp`
Method: enumerate mounted procedures vs renderer references.

## Surface
- **46** top-level routers, **187** procedures mounted (`appRouter`).
- Renderer references **~55** distinct top-level routers, **217** distinct
  `router.method` call sites.

## Auth posture (sampled)
- Sensitive/user-data procedures are `protectedProcedure` with ownership checks
  (verified by `tests/security/isolation.test.ts`).
- `adminProcedure` gates `admin.*` (diagnostics, invariants, reconcile, flags.set).
- Genuinely public: `auth.me/login/signup/reset`, `health`, `system.health/appInfo`,
  `help.*`. `system.providerChecklist` moved to protected (Phase 079).

## Called-but-missing (renderer → no backend procedure)
14 routers (see docs/UI_ACTION_AUDIT.md) + method-level gaps on `billing.*` and
`agent.*`. These are the priority reconciliation items.

## Mounted-but-unused (backend → not referenced by renderer)
Some procedures exist without a current UI caller (e.g. `cases.classify`,
`cases.saveDraft/getDraft/clearDraft`, `workflow.preSendReview`,
`featureFlags.*`, `analytics.getOverallStats`). These are **intentionally
backend-ready** for UI work in later phases — not dead code — and are covered by
tests.

## Stubs returning empty (honest, not fabricated)
`analytics.getOutreachTrends/getLawyerPerformance/getLawyerCapacity/getWorkloadMetrics`,
`clarifications.*`, `agent.listDevices` — return `[]`/`{}` explicitly (Phase 014),
pending real data sources.

## Recommendation
Wire the UI to the real endpoints (rename `caseManagement`→`cases`,
`evidenceExport`→`cases.export`, etc.) or hide the screens; add an endpoint-usage
lint to CI to catch future drift.
