# Performance Baseline & Indexing (Phases 051–052)

Date: 2026-07-06 · Branch `Phase-Imp`

## Indexing (Phase 051)
Applied idempotently at boot in `server/db.ts:ensureIndexes`:
- `cases(userId, status)` composite — backs owner-scoped list + status filter.
- `cases(urgency)`, `cases(updatedAt)` — back the Phase 022 filter/sort.
- Plus the earlier hot-path indexes (outreach/evidence/email/messaging/rating)
  and `outreach_status(caseId, lawyerId)` UNIQUE (Phase 017).
Connection PRAGMAs: WAL, `foreign_keys=ON`, `busy_timeout=5000`.

## Large-dataset & pagination (Phase 052)
`tests/backend/phase051_060.test.ts` seeds 55 cases and paginates the real
`cases.list` API end-to-end, asserting:
- every row appears exactly once across pages (no overlap/omission),
- the total and page count are correct,
- filters (`urgency`, `search`) narrow the set correctly.

## Baseline (local, dev machine)
- `cases.list` over 55 rows, page size 10: sub-100ms per page in tests.
- The full suite (21 files, 138 tests incl. many DB-backed e2e) runs in a few
  seconds.

## Remaining
- A dedicated large-N (10k+) benchmark + EXPLAIN QUERY PLAN assertions are a
  follow-up (visual-regression / perf tooling, candidate alongside Phase 113).
