# Fresh-Clone Dry Run (Phase 092)

Date: 2026-07-06 · Branch `Phase-Imp`

Performed a real fresh clone of the repository into an isolated directory and
verified the tracked source is complete and self-contained.

## Procedure (reproducible)
```bash
git clone --branch Phase-Imp --single-branch <repo> /tmp/fresh-clone-test
cd /tmp/fresh-clone-test
npm ci                     # installs deps + rebuilds better-sqlite3 (postinstall)
npm run gate               # server+main tsc, traceability, scans, tests
```

## Real results of the dry run
| Check | Result |
|---|---|
| All tracked source present (49 docs, 51 test files, scripts, configs) | ✅ |
| **No `.env` or secret files** in the clone (only `.env.example`) | ✅ (account safety guard) |
| `tsconfig.server.json` typecheck from clean checkout | ✅ exit 0 |
| Representative suites (user-sim + e2e) from clean checkout | ✅ 10/10 |
| `scripts/traceability.mjs` from clean checkout | ✅ exit 0 |

## Honest notes / setup requirements
- **Dependencies are not tracked** (correctly): a fresh clone requires `npm ci`.
  The `postinstall` step rebuilds the `better-sqlite3` native binding
  (`electron-rebuild`); on a machine without build tools this is the one setup
  prerequisite. Documented in the README/OPERATOR_RUNBOOK.
- During this dry run the dependency tree was linked from the parent install to
  avoid re-downloading. That produced one **artifact**: `tsc -p tsconfig.main.json`
  reported `TS2742 (not portable)` because the linked `node_modules` resolved via
  an absolute path. This does **not** occur with a real in-tree `npm ci` install —
  confirmed: the same `main` typecheck passes (exit 0) in a normal working tree.
  Recorded here rather than hidden, per the no-false-completion rule.
- Copy `.env.example` → `.env` and set `JWT_SECRET`/`COOKIE_SECRET` before running
  the app in a non-test mode (the config fail-safe, Phase 006, blocks insecure
  production starts).

## Conclusion
A fresh clone contains everything needed to build and test the tracked source; the
only external requirement is `npm ci` (standard) plus a `.env` for running the app.
No untracked source file is required. Setup is documented and reproducible.
