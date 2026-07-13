# Supply Chain & Dependency Review (Phase 066)

Date: 2026-07-06 · Branch `Phase-Imp` · `npm run audit:deps`

## Current advisory snapshot (`npm audit`)
**21 advisories: 1 critical · 14 high · 6 moderate.** Triaged below by real
runtime exposure — the metric that matters for a shipped app, not the raw count.

## Triage: dev/build-only vs runtime
| Package | Sev | Class | Exposure | Fix |
|---|---|---|---|---|
| **vitest** (the 1 critical) | critical | **dev** (test runner) | none — not shipped | vitest@4 (major) |
| vite / vite-node / esbuild | high/mod | **dev/build** | none — build-time only | vite@8 (major) |
| electron / electron-builder / app-builder-lib / dmg-builder / squirrel | high | **build/packaging** | build-time only | electron/​builder majors |
| @electron/rebuild / @electron/node-gyp / tar / cacache / make-fetch-happen | high | **build** (native rebuild) | build-time only | rebuild@4 (major) |
| drizzle-kit / @esbuild-kit/* | mod | **dev** (migrations gen) | none | drizzle-kit@0.31 (major) |
| drizzle-orm | high | **runtime** | DB layer | drizzle-orm@0.45 (major) |
| nodemailer | high | **runtime** | email send | nodemailer@9 (major) |
| uuid | mod | **runtime** | id generation | uuid@14 (major) |
| xlsx | high | **runtime** | spreadsheet import/export | **no fix available** |

## Honest conclusion
- **The single critical and the large majority of advisories are dev/build tooling
  with zero end-user runtime exposure** (test runner, bundler, native rebuild,
  installer). They do not ship in the packaged app.
- **4 advisories touch runtime code** (drizzle-orm, nodemailer, uuid, xlsx). Each
  requires a **major** upgrade (or, for xlsx, has no fix in the 0.18 line).

## Mitigation plan (deliberate, tested — not a blind `audit fix --force`)
1. **xlsx (no fix):** migrate off `xlsx` or pin the vendor CDN build; xlsx is used
   in `autoCollectionService` + 2 renderer components — scope a replacement.
2. **Runtime majors (drizzle-orm, nodemailer, uuid):** upgrade behind the test
   suite one at a time (each is a breaking-change migration, verified by `npm run gate`).
3. **Dev/build majors (vitest, vite, electron*, drizzle-kit):** upgrade on the
   tooling track; no runtime risk, so lower priority.

This review (classification + exposure assessment + mitigation plan) is the Phase
066 deliverable. `npm run audit:deps` reproduces the snapshot; re-run after each
upgrade above.
