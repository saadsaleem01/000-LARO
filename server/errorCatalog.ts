/**
 * Phase 072 — troubleshooting guide and error catalog.
 *
 * Canonical catalog mapping error conditions to a user-facing message, likely
 * cause, and remedy. Served by `system.errorCatalog` and mirrored in
 * docs/TROUBLESHOOTING.md. Keys align with tRPC error codes + app-specific ids.
 */
export interface CatalogEntry {
  code: string;
  message: string; // safe, user-facing
  cause: string;
  remedy: string;
}

export const ERROR_CATALOG: CatalogEntry[] = [
  { code: "UNAUTHORIZED", message: "You need to sign in to do that.",
    cause: "No valid session / expired token.", remedy: "Sign in again." },
  { code: "FORBIDDEN", message: "You don't have access to this item.",
    cause: "The resource belongs to another user, or requires admin rights.", remedy: "Check you're using the right account." },
  { code: "TOO_MANY_REQUESTS", message: "You're doing that too quickly — please wait a moment.",
    cause: "A rate limit was hit (e.g. creating many cases quickly).", remedy: "Wait for the window to reset and retry." },
  { code: "BAD_REQUEST", message: "Some of the information wasn't valid.",
    cause: "Input failed validation, or an illegal status transition was attempted.", remedy: "Review the highlighted fields / current status and try again." },
  { code: "NOT_IMPLEMENTED", message: "That feature isn't available yet.",
    cause: "The capability (e.g. OCR) is planned but not built.", remedy: "Use the documented alternative; watch the roadmap." },
  { code: "CONFLICT", message: "That already exists.",
    cause: "A uniqueness constraint (e.g. duplicate email) was violated.", remedy: "Use different values or sign in to the existing account." },
  { code: "INTERNAL_SERVER_ERROR", message: "Something went wrong on our side.",
    cause: "Unexpected server error (often the database was unavailable at startup).", remedy: "Retry; if it persists, run `npm run doctor` and check logs." },
  { code: "DB_UNAVAILABLE", message: "The local database isn't ready.",
    cause: "Migrations haven't completed or the DB file is inaccessible.", remedy: "Restart the app; check `/api/ready`; run `npm run doctor`." },
  { code: "PROVIDER_NOT_CONFIGURED", message: "This integration isn't set up.",
    cause: "Required credentials (Google/Microsoft/S3/etc.) are missing.", remedy: "See system.providerChecklist and docs/PROVIDERS.md; add the env vars." },
  { code: "STORAGE_OBJECT_NOT_FOUND", message: "That file couldn't be found.",
    cause: "The evidence object is missing from storage.", remedy: "Re-upload the file; verify storage configuration." },
];

export function errorCatalog(): CatalogEntry[] {
  return ERROR_CATALOG;
}

export function lookupError(code: string): CatalogEntry | null {
  return ERROR_CATALOG.find((e) => e.code === code) ?? null;
}
