# External Providers — Reality Review (Phase 012)

Date: 2026-07-06 · Branch `Phase-Imp`

Honest status of every external integration, per the prompt's rule that
providers must be integrated truthfully and never presented as working when they
are not. "Configured" means the required env credentials are present.

---

## Status table

| Provider | Purpose | Real client? | Requires | Status |
|---|---|---|---|---|
| Gmail (Google) | Evidence collection from mailbox | ✅ `server/gmailService.ts` | `GOOGLE_CLIENT_ID/SECRET` + user OAuth | Works when configured |
| Google Drive | Evidence collection from Drive | ✅ `server/googleDriveService.ts` | `GOOGLE_CLIENT_ID/SECRET` + user OAuth | Works when configured |
| Microsoft Outlook | Mailbox evidence | ⚠️ `@microsoft/microsoft-graph-client` client present | `MICROSOFT_CLIENT_ID/SECRET` | Partial |
| OneDrive | File evidence | ⚠️ | `MICROSOFT_CLIENT_ID/SECRET` | Partial |
| Trello | Board/attachment evidence | ✅ `server/trelloService.ts` | `TRELLO_API_KEY` + token | Works when configured |
| Telegram | Message evidence | ✅ `server/telegramService.ts` | `TELEGRAM_BOT_TOKEN` | Works when configured |
| KvK (Dutch business registry) | Company lookup | ✅ `server/kvkIntegration.ts` | public API | Works |
| Rechtspraak (court records) | Case-law lookup | ⚠️ `server/rechtspraakIntegration.ts` | public API | Partial ("simplified") |
| Slack | Message evidence | ❌ not implemented | — | Unavailable |
| Email send (SMTP/SendGrid) | System email (password reset) | ✅ `server/systemEmail.ts` | SMTP or `SENDGRID_API_KEY` | Works when configured |
| Outreach send to lawyers | Send prepared outreach | ❌ not wired | provider | Missing (Phase 012/026) |
| S3 storage | Evidence blobs | ✅ `server/storage.ts` | `AWS_S3_*` (falls back to local disk) | Works; local fallback now persists bytes (Phase 015) |

## Phase 012 change (applied)

`server/routers/enhancedConnections.ts` previously returned a **dummy auth URL for
every provider** (Gmail/Outlook/Drive/OneDrive/Slack), which made a broken connect
button look functional. It now reports **real availability**:

- `getOAuthUrl` returns `{ success: false, available: false, reason }` when a
  provider is unconfigured (missing `GOOGLE_*`/`MICROSOFT_*` credentials) or
  unsupported (Slack). Only genuinely-configured providers return an `authUrl`.
- `getStatus` continues to read real connection state from `evidence_sources`.

Verified: `tests/smoke/noFakeSuccess.smoke.test.ts` asserts the dummy URL is gone.

## Credentials / account approvals required (blocked-by-external)

- Google Cloud project with OAuth consent screen + `GOOGLE_CLIENT_ID/SECRET`.
- Microsoft Entra app registration + `MICROSOFT_CLIENT_ID/SECRET`.
- AWS S3 bucket + IAM keys for cloud evidence storage (optional; local fallback
  works without it).
- An outbound email provider (SMTP or SendGrid) before real lawyer outreach can be
  sent (Phase 026).

These are genuine external prerequisites; the app must not pretend a provider is
connected until the user completes the OAuth flow.
