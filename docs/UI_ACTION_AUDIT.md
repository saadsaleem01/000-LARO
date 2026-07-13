# UI Action Audit (Phase 073)

Date: 2026-07-06 · Branch `Phase-Imp`
Method: static scan of `src/renderer` tRPC calls vs the 46 routers / 187
procedures actually mounted in `server/routers/index.ts`.

## Headline finding — broken UI actions
The renderer references **14 top-level routers that do not exist on the backend**.
Any UI action wired to these will error at runtime — they must be **implemented or
hidden** (ties to Phase 010 placeholder routes and Phase 014 no-fake-success):

```
adminAnalytics, bulkFileOperations, caseManagement, emailMessages, enrichment,
evidence, evidenceAggregation, evidenceExport, legalChecklists, outreachAnalytics,
relevanceScoring, syncScheduler, trello, unifiedInbox
```

Plus method-level gaps on existing routers, e.g. `billing.createCheckoutSession /
getSubscription / getUsage …` (backend `billing` only has `status`), and
`agent.getDeviceScans / getScanFiles` (backend `agent` only has `listDevices /
revokeDevice`).

## Wired & working (spot-check)
| UI area | Action | Endpoint | Status |
|---|---|---|---|
| Auth | login/signup/logout/reset | `auth.*` | ✅ real |
| Cases | list/create/update/delete/export | `cases.*` | ✅ real (owner-scoped) |
| Case detail | matched lawyers | `matching.findLawyers` | ✅ real engine |
| Outreach | prepare/approve/reject/review | `workflow.*` | ✅ real (no send) |
| Dashboard | stats / next actions | `dashboard.*` | ✅ real (some fields honest-zero) |
| Privacy | export / delete | `gdpr.*` | ✅ real |
| Help | topics / errors | `help.*` | ✅ real |

## Recommended remediation
1. Hide/disable the 14 dead-router screens behind a feature flag (058) until
   implemented, so no button implies a working action (014/037).
2. Reconcile `billing.*`/`agent.*` method names, or stub them honestly.
3. Track each in the tech-debt register (docs/TECH_DEBT.md).
