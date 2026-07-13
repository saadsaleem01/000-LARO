# Feature Flags & Rollout Controls (Phase 058)

Date: 2026-07-06 · Branch `Phase-Imp`

`server/featureFlags.ts` — boolean flags with three-layer resolution:
1. env override `FEATURE_<UPPER_SNAKE>` (e.g. `FEATURE_OUTREACH_SEND_ENABLED=true`),
2. persisted value in `system_config` (`flag:<key>`),
3. built-in default.

## Flags
| Key | Default | Purpose |
|---|---|---|
| `outreach.send.enabled` | **false** | Gates the future real outreach send. Stays OFF until an operator enables it — upholds the "no contact without approval" boundary during rollout. |
| `analytics.enabled` | true | Local analytics. |
| `demo.mode` | false | Demo labelling. |

## API
- `featureFlags.list` (any authenticated user) — current flags.
- `featureFlags.set` (admin only) — toggle a flag.
- `workflow.approveDraft` returns `sendEnabled` from the flag (currently false).

Verified in `tests/backend/phase051_060.test.ts`.
