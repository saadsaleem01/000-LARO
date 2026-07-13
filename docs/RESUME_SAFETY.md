# Context-Loss Resume Safety (Phase 088)

Date: 2026-07-06 · Branch `Phase-Imp`

If work is interrupted (context loss, new session, different operator), how does the
next run resume **safely** without redoing or corrupting prior work? This documents
the real mechanism already in use across this program.

## The resume protocol (what actually happens)
1. **Read `docs/CODEX_CHECKPOINTS.md`** — the latest checkpoint states the branch,
   what was done, what was verified, and the single "next safe action". This is the
   resume entry point.
2. **Read `docs/CODEX_WORKLOG.md`** — per-batch record of real changes + honest
   residuals, so the next run knows what is done vs deferred.
3. **Read `docs/GOAL_COMPLETION_MATRIX.md`** — authoritative per-phase status.
   Never trust memory over this table.
4. **Run `npm run gate`** (Phase 089) — reestablishes ground truth: server+main
   tsc, traceability, and the full test suite must be green before *any* new work.
   If red, the first task is to make it green, not to add features.
5. **Run `node scripts/traceability.mjs`** — verifies the matrix's claims still
   match the files on disk (catches half-applied edits after an interruption).

## Why this is safe
- **Idempotent checkpoints:** each says the *next* action, so re-running the last
  step is either a no-op or caught by the gate.
- **No silent divergence:** traceability fails loudly if a cited artifact vanished.
- **Git is the backstop:** work is committed per batch to `Phase-Imp`; an
  interrupted, uncommitted change is visible in `git status` and can be discarded.
- **No destructive resume:** the protocol reads state before writing; it never
  assumes a phase is done without the matrix + gate confirming it.

## Anti-patterns explicitly avoided
- Do **not** `git stash` mid-task (once reverted a working tree — recovered via
  `git stash pop`); prefer commit-per-batch.
- Do **not** mark a phase done from memory; the matrix + traceability are truth.
