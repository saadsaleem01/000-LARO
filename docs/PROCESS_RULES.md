# Process Rules — Worklog, Checkpoints & No-Vanity-Work (Phases 087, 090)

Date: 2026-07-06 · Branch `Phase-Imp`

## Phase 087 — Codex worklog & checkpoints (Implemented)
Two living records are maintained every batch and are the source of truth for
resuming work (see docs/RESUME_SAFETY.md, Phase 088):
- **docs/CODEX_WORKLOG.md** — per-batch log of *real* changes and honest residuals.
- **docs/CODEX_CHECKPOINTS.md** — numbered checkpoints (now through Checkpoint 10),
  each recording branch, done, verified, and the single next safe action.

These were created and have been updated across every 10-phase batch (021–080),
so Phase 087 is genuinely satisfied, not aspirational.

## Phase 090 — No vanity work rule (adhered to)
**Rule:** do not build later, flashier features while an earlier critical-path or
safety guarantee is fake or missing. Effort must reduce real risk or add real,
verifiable value — not appearances.

**How it is enforced in this program:**
- The dependency ordering in docs/TASK_GRAPH.md (Phase 086) defines what must be
  real before later work counts. Analytics/SaaS/i18n polish is *not* prioritized
  over the critical-path spine (classify → match → approve → [send]).
- Every phase is marked honestly in the completion matrix; "Partial"/"Missing"
  rows name their residual instead of being dressed up as done (Phase 014/075).
- The stabilization gate (Phase 089, `npm run gate`) blocks advancing on red, so
  work can't *look* finished while tests/typecheck fail.
- Where a phase is inherently a review (082–084) the deliverable is a **grounded**
  review tied to code and the tech-debt register — not decorative prose.

**Evidence of adherence:** the biggest known gaps (D1 dead UI routers, D3 real
send, D4 token crypto) are surfaced and ranked in docs/TECH_DEBT.md rather than
buried under new feature work. The send loop remains deliberately unbuilt behind a
flag instead of faked — the opposite of vanity work.
