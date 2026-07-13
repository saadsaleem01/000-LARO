# Troubleshooting Guide & Error Catalog (Phase 072)

Date: 2026-07-06 · Branch `Phase-Imp`

The canonical error catalog is code (`server/errorCatalog.ts`) and served by
`help.errorCatalog`. Summary:

| Code | Meaning | Remedy |
|---|---|---|
| UNAUTHORIZED | Not signed in / expired session | Sign in again |
| FORBIDDEN | Item belongs to another user, or needs admin | Use the right account |
| TOO_MANY_REQUESTS | Rate limit hit | Wait for the window, retry |
| BAD_REQUEST | Invalid input or illegal status transition | Fix fields / current status |
| NOT_IMPLEMENTED | Feature not built yet (e.g. OCR) | Use the documented alternative |
| CONFLICT | Uniqueness violation (e.g. duplicate email) | Use different values / sign in |
| INTERNAL_SERVER_ERROR | Unexpected server error | Retry; `npm run doctor`; check logs |
| DB_UNAVAILABLE | Local DB not ready | Restart; check `/api/ready` |
| PROVIDER_NOT_CONFIGURED | Integration missing credentials | See `system.providerChecklist`, docs/PROVIDERS.md |
| STORAGE_OBJECT_NOT_FOUND | Evidence file missing | Re-upload; verify storage config |

## Common situations
- **"Database not available" at first run** → migrations still initializing;
  restart, check `/api/ready`, run `npm run doctor`.
- **No lawyer matches** → the case may be unclassified or no lawyers are seeded;
  re-run classification (`cases.classify`), add lawyers.
- **A connect button does nothing** → the provider isn't configured (checklist)
  OR the screen references an unimplemented endpoint (see docs/UI_ACTION_AUDIT.md).
- **Production won't start** → insecure/missing `JWT_SECRET`/`COOKIE_SECRET`
  (fail-safe guard, Phase 006). Set strong values.

## Operator tools
`npm run doctor`, `admin.diagnostics`, `admin.invariants`, `admin.reconcileReport`.
