# License & Third-Party Service Review (Phase 067)

Date: 2026-07-06 · Branch `Phase-Imp`

## Project license
The repository does not currently declare a top-level `LICENSE`. **Action:** the
owner (Noodzakelijk Online / Sir Velhorst) should add an explicit license before
distribution.

## Key dependencies & licenses (permissive)
| Package | License |
|---|---|
| react, react-dom | MIT |
| express, tRPC (@trpc/*) | MIT |
| drizzle-orm, drizzle-kit | Apache-2.0 / MIT |
| better-sqlite3 | MIT |
| electron | MIT |
| tailwindcss, @radix-ui/* | MIT |
| zod, superjson, nanoid | MIT |
| @aws-sdk/* | Apache-2.0 |
| googleapis, google-auth-library | Apache-2.0 |
| vite, vitest | MIT |

All primary runtime deps are permissive (MIT/Apache-2.0) — compatible with a
proprietary desktop distribution. Run `npx license-checker --summary` for the full
transitive breakdown before release.

## Third-party services (terms apply)
| Service | Use | Terms note |
|---|---|---|
| Google (Gmail/Drive API) | Evidence collection | Google API Services User Data Policy; OAuth verification may be required |
| Microsoft Graph | Outlook/OneDrive | Microsoft APIs Terms of Use |
| AWS S3 | Evidence storage | AWS Customer Agreement |
| SendGrid / SMTP | System email | Provider ToS; anti-spam obligations |
| KvK / Rechtspraak open data | Dutch business/court data | Public open-data terms |
| Stripe (optional) | Billing | Stripe Services Agreement |

## Compliance note
Outreach to lawyers is human-approved and rate-limited (no automated bulk
contact), which aligns with provider anti-spam and platform policies.
