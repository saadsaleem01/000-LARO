# Product Analytics — Local-First (Phase 055)

Date: 2026-07-06 · Branch `Phase-Imp`

All analytics are computed from the **local database** and scoped to the
requesting user. **No third-party telemetry**; nothing leaves the device.

`server/analytics.ts` powers `analytics.*` (previously `{}`/`[]`):
- `getOverallStats` — total/active/closed cases, evidence count, outreach count,
  response rate.
- `getLegalAreaDistribution` — case count per legal area (from stored classification).
- `getCaseDistribution` — case count per status.

Metrics not yet derivable from real data (`getOutreachTrends`,
`getLawyerPerformance`, `getLawyerCapacity`, `getWorkloadMetrics`) return an
explicit empty list rather than fabricated numbers.

Verified in `tests/backend/phase051_060.test.ts`.
