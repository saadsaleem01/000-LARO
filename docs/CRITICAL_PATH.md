# Critical Path Definition & Smoke Test — 000-LARO (Phase 003)

Date: 2026-07-06 · Branch `staging` @ `1b78ed6`

The critical path is the spine of the product. Per the prompt it must remain
functional (or, where it is not yet, that must be stated truthfully and not
masked). This document defines the path, records each step's real status with
`file:line` evidence, and gives the smoke test + manual verification steps.

---

## 1. Canonical critical path

```
User account
  -> case intake
    -> document/evidence ingestion
      -> legal-area classification
        -> lawyer matching
          -> outreach draft
            -> human review / approval
              -> send through configured provider
                -> response tracking
                  -> case/lawyer outcome
                    -> evidence/export package
```

## 2. Per-step status (evidence-based)

Legend: ✅ Implemented · ⚠️ Partial · ❌ Missing/fake/dead.

| # | Step | Status | Evidence (`file:line`) |
|---|---|---|---|
| 1 | User account | ✅ | `server/routers/index.ts:143-223` (signup/login), reset `:234-306` |
| 2 | Case intake | ✅ | `server/routers/cases.ts:59-92`; bulk `server/routers/bulkImport.ts:102,166` |
| 3 | Evidence ingestion | ⚠️ | Gmail/Drive real `server/gmailService.ts:327-435`; local upload **fake** `src-main/uploader.ts:206-208`; no integrity hash |
| 4 | Legal-area classification | ❌ | Echoes caseType: `server/db.ts:419`; no classifier |
| 5 | Lawyer matching | ❌ | UI calls random stub `server/routers/matching.ts:20-44`; real engine `server/matching.ts:206` is uncalled |
| 6 | Outreach draft | ❌ | No draft generation; `server/routers/workflow.ts:8-20` only flips status |
| 7 | Human review / approval | ❌ | No approval gate exists |
| 8 | Send via provider | ❌ | Fake "sent" row `server/workflow.ts:88-97`; real senders limited to reset/usage email |
| 9 | Response tracking | ❌ | Dead code `server/workflow.ts:268-351`; `getUnreadCount` returns 0 `server/routers/messages.ts:80-83` |
| 10 | Case/lawyer outcome | ⚠️ | Free-form status strings; no enforced state machine (`cases.ts:98`) |
| 11 | Evidence/export package | ❌ | Letter text only `server/legalDocumentGenerator.ts`; `pdfkit`/`archiver` unused |

**Conclusion:** the path is real from steps 1–2 (and conditionally 3), then
**broken** from step 4 onward. No case can currently traverse the full path.

## 3. Automated smoke test

- File: `tests/smoke/criticalPath.smoke.test.ts`
- Config: `vitest.config.ts` (standalone; before it existed `vitest` could not
  start because it fell back to the renderer's `vite.config.ts`).
- Run: `npx vitest run tests/smoke`
- What it does: asserts the genuinely-wired **pure** units (legal-area
  normalization/validation used by intake + matching) and marks every not-yet-wired
  step as a `todo` naming its implementing phase. It is deliberately **not**
  green-by-construction: a pass means "the wired units still behave", not "the
  path works".
- **Last result (2026-07-06):** `Test Files 1 passed` · `Tests 7 passed | 9 todo` · 0 failed.

As steps 3–11 become real in later phases, their `todo` entries convert to real
assertions (and, for steps that need a DB, a better-sqlite3 test harness is added
in Phase 040).

## 4. Manual end-to-end verification (expected vs actual)

Because steps 4–11 are not automatable yet, here are the exact manual steps and
the **actual** current outcome, so no one mistakes the UI for a working path.

| Step | Manual action | Expected (target) | Actual (2026-07-06) |
|---|---|---|---|
| 1 | Sign up, then log in | Session established, `auth.me` returns the user | ✅ Works |
| 2 | Create a case with a description | Case persists with your `userId` and a status | ✅ Works |
| 3 | Upload a local PDF as evidence | File bytes stored; row references a retrievable object | ❌ Uploader logs a fake `s3.example.com` URL; bytes never leave the machine |
| 3b | Connect Gmail and auto-collect | Attachments stored in S3 with source metadata | ⚠️ Works **only** if Google OAuth + S3 env are configured; no integrity hash |
| 4 | Open the case's classification | Legal area(s) inferred from the description | ❌ Shows exactly the caseType you picked |
| 5 | View matched lawyers | Ranked real lawyers by expertise/distance | ❌ Distances/scores are random; list empty unless lawyers hand-entered |
| 6–8 | Approve and send outreach | A draft you approve is emailed to the lawyer | ❌ Status flips to "Outreach"; **no email is sent**, nothing to approve |
| 9 | Check for replies | Lawyer replies appear against the case | ❌ Unread count is always 0; no inbound polling |
| 11 | Export the package | Download a PDF/zip of the case + evidence | ❌ Only letter *text* can be generated |

Per Phase 003's UI-clarity requirement, each of these ❌ actions must, before any
production claim, tell the user plainly what happened, whether retry is safe, and
whether human/external action remains — or be hidden until real (Phases 014/037).

## 5. How to run

```bash
npm install            # full install (runs electron-rebuild for better-sqlite3)
# or, for tests only, without the native rebuild:
npm install --ignore-scripts
npx vitest run tests/smoke
```
