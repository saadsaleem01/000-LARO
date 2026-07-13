# LARO: Legal Case Ledger

LARO is a local-first legal case operating system. It keeps a persistent, source-linked record of a case: documents, extracted text, timeline suggestions, claims, evidence links, contradictions, deadlines, obligations, open loops, outreach drafts, approvals, and audit history.

It organizes and prepares legal material. It is not a lawyer, does not provide definitive legal advice, and never sends legal communication or shares evidence externally without an explicit approval record.

## Repository Runtimes

This repository currently contains two supported application runtimes:

- The Electron/React/tRPC desktop application in `src-main/`, `src/renderer/`, and `server/`. Use `npm run setup`, `npm run dev`, or `npm run dev:server` for this runtime.
- The Flask Case Command Center in `app.py`, `legal_ledger.py`, and `frontend/`. Use `run_local.ps1` for the source-linked legal ledger, Google evidence intake, Papertrail, matching, and approval-gated bundle workflow described below.

They coexist during the platform migration and currently use separate databases. The desktop runtime defaults to `PORT=3000`; the Flask command center defaults to `LARO_FLASK_PORT=8768`. Shared OAuth values can live in the same `.env` file.

## What Runs Locally

- Case Command Center: create and operate cases with progressive Focus, Guided, and Expert views.
- Document intelligence: read local text, PDF, DOCX, HTML, email-shaped, and Drive-shaped records; preserve source metadata and content hashes.
- Document Inbox: stage a local file or pasted source before its case is known, review deterministic case suggestions, then explicitly link it without deleting or moving the original source record.
- Evidence timeline and papertrail: connect who said or did what and when back to the underlying document.
- Review workbench: confirm or reject suggested events, claims, evidence links, contradictions, deadlines, obligations, and open loops.
- Who-did-what chronology: timeline events persist the actor, action, affected party, and event type beside the exact source passage; story, horizontal, and vertical views can be filtered by person and event type.
- Obligation register: track who must do what, for whose benefit, by which date, and from which source; extracted duties remain unconfirmed until reviewed.
- Generated briefs: create source-linked case summaries, lawyer briefings, and red-line drafts without copying ledger data into a separate tool.
- Reviewable case bundles: download a source-linked ZIP only after approval of the exact current case snapshot; any later case change expires that approval.
- Approval-gated outreach: create lawyer/media/organization matches and drafts, but do not send external messages.

Core case data is stored in a local SQLite ledger under `instance/laro_ledger.sqlite3`. Authenticated case, approval, audit, and matching routes are scoped to the owning local user. Runtime databases, uploads, OAuth tokens, and local secrets are ignored by Git.

The dashboard's convenience session bootstrap only accepts requests from loopback and only for `LARO_LOCAL_ACCOUNT_EMAIL` (default: `robert.local@laro`). It is not a remote login mechanism; the existing password route remains available for additional accounts.

## Windows Quick Start

1. Install Python 3.11+.
2. In PowerShell from this repository, install dependencies:

```powershell
python -m pip install -r requirements.txt
```

3. Create local configuration:

```powershell
Copy-Item .env.example .env
```

4. Start LARO:

```powershell
.\run_local.ps1
```

5. Open [http://127.0.0.1:8768/case_command_center.html](http://127.0.0.1:8768/case_command_center.html).

The launcher uses `LARO_FLASK_PORT=8768` by default so it does not collide with the desktop server on `3000`. It binds to `127.0.0.1` only. Pass `-Port` to `run_local.ps1` or set `LARO_FLASK_PORT` to use another free local port.

## Google Evidence Sources

Optional Gmail and Drive read-only intake requires these values in `.env`:

```text
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://127.0.0.1:8768/api/google/oauth/callback
```

LARO stores connection status and a token fingerprint in the ledger, never raw OAuth tokens. Raw credentials are encrypted in the ignored local `tokens/` vault. Once connected, use the Documents tab in a case to run an explicit Gmail search or Drive query; LARO imports only those matching records, including supported Gmail attachments, preserves the original URI, deduplicates them, and records the read in the audit log.

## Case-Neutral Document Inbox

Use **Guided > Document Inbox** to paste legal text or stage a local file before deciding which case owns it. LARO reads the source without case context, compares explicit case references, named parties, institutions, legal topics, and shared terms against only the authenticated user's cases, and presents up to three review-only suggestions with reasons. A score is a deterministic ranking signal, not a probability.

Nothing is assigned automatically. Linking requires a user-selected case, preserves the original source URI, hash, extracted text, and local file, then creates the normal reviewable timeline and evidence artifacts. Dismissal removes an item from the active queue but retains its local record and audit history.

## Optional Local Deep Reading

The default reader performs a full-source deterministic comparison of every readable case document. It can flag literal differences in payment amounts or deadline dates, shared case references, and deadline wording without a recognizable date. It also proposes a chronological source passage for every unambiguous date it finds; each proposal must be explicitly added to the reviewable timeline. Every result is review-only and opens the cited source document.

For deeper local-language analysis on your own machine, configure a local Ollama model in `.env`:

```text
LARO_ANALYSIS_PROVIDER=ollama
LARO_OLLAMA_BASE_URL=http://127.0.0.1:11434
LARO_OLLAMA_MODEL=<your-local-model>
```

LARO refuses non-loopback analysis URLs. Long sources are divided at sentence boundaries and every bounded batch is sent only to the configured loopback model. Model output is retained only as review-only observations with literal source quotes; uncited output is discarded. If a batch fails, no partial case-wide findings are stored. It never becomes a confirmed fact, claim, deadline, or external communication automatically.

Case-wide readings run as durable local jobs through `/api/cases/<id>/case-analysis/jobs`. The Case Command Center polls persisted document, source-chunk, word, character, elapsed-time, and ETA progress and refreshes automatically when the cited review run is ready. `LARO_LOCAL_ANALYSIS_MAX_CHARS` controls the maximum source characters in one local-model batch, not the total amount of case evidence that can be read.

## Approved Case Bundles

The Bundle tab can create an in-memory ZIP containing the case record, source-linked timeline and review items, outreach history, approval and audit records, extracted text, and locally stored source files. Each entry is listed with a SHA-256 digest in `manifest.json`; machine-local paths and credential-shaped fields are removed from structured exports.

External sharing remains a separate human action. LARO permits a download only when an approved `CaseBundle` record matches the current persisted case snapshot. Adding or changing evidence, analysis, outreach, drafts, or case details makes that approval stale and requires a new review. `LARO_BUNDLE_MAX_BYTES` limits the archive's total uncompressed size; oversized source files are omitted and identified in the manifest.

## Tests

Run the Electron/tRPC verification gate:

```powershell
npm run gate
```

Run the legal-ledger verification suite:

```powershell
python -m unittest test_legal_ledger test_case_bundle_export test_document_intelligence test_document_case_matching test_local_semantic_analysis test_google_oauth test_google_evidence test_lawyer_matching test_outreach_discovery test_outreach_targets test_outreach_analytics
```

The test suite uses temporary SQLite files and does not require a real Google account or contact any external lawyers.
