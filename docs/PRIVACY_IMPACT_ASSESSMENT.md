# Privacy Impact Assessment (DPIA) — Phase 065

Date: 2026-07-06 · Branch `Phase-Imp` · Jurisdiction: Netherlands / EU (GDPR)

## Purpose of processing
Match a claimant's legal case to suitable lawyers, aggregate supporting evidence,
prepare (human-approved) outreach, and track outcomes.

## Personal data categories
| Category | Examples | Sensitivity | Store |
|---|---|---|---|
| Client identity/contact | name, email, phone, address | Personal | `cases` |
| Case content | free-text description, legal areas | Potentially special-category (legal matters) | `cases` |
| Evidence | documents, emails, attachments | Potentially special-category | `evidence`, S3/local |
| Account | email, password hash, role | Personal + credential | `users` |
| Connected-account tokens | OAuth access/refresh | Credential | `email_accounts`, `evidence_sources` |
| Audit | actions, timestamps, IP/UA | Personal | `audit_logs` |

## Lawfulness & data-subject rights
- **Access**: `gdpr.exportData` — full JSON of the user's data (028).
- **Erasure**: `gdpr.deleteData` — transactional deletion of all user rows + user (028).
- **Consent**: implied for data processing; no marketing/analytics tracking; all
  analytics are local-first (055) — **no third-party telemetry**.

## Data flow & storage
- Local-first: data lives in the on-device SQLite DB and (optionally) S3.
- External egress only to explicitly-configured providers (Google/Microsoft/S3/
  SMTP) over TLS; **no lawyer is contacted without approval** (026/062).

## Risks & mitigations
| Risk | Mitigation | Residual |
|---|---|---|
| PII exposure across users | ownership guards + isolation tests (008/046) | — |
| Token theft | encrypted at rest (weak — upgrade to GCM) | **Open** |
| Secrets in shipped app | `.env` no longer bundled (030) | — |
| Over-retention | erasure available; **retention policy pending (102)** | Open |
| Evidence integrity | sha256 provenance hash (015) | wire into all writes |

## Necessity & proportionality
Only data needed for matching/outreach is collected. Evidence collection is
user-initiated and provider-scoped. High-stakes legal domain → the app never
provides final legal advice (disclaimer, 013).

## Outstanding for full compliance
Data-retention/auto-archival (102), stronger token crypto, a formal DPA with each
processor (S3/Google/Microsoft), and a UI to trigger export/erase (037).
