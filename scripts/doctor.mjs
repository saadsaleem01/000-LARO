#!/usr/bin/env node
/**
 * Phase 034 — CLI doctor / self-diagnostic command.
 *
 * Prints a health report of the environment and configuration. Exits non-zero
 * when a production-critical problem is found (insecure/missing secrets), so it
 * can gate a deploy. Run via `npm run doctor`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const isProd = (process.env.NODE_ENV || 'production') === 'production';

const results = [];
const ok = (m) => results.push(['ok', m]);
const warn = (m) => results.push(['warn', m]);
const fail = (m) => results.push(['fail', m]);

// Node
const major = Number(process.versions.node.split('.')[0]);
major >= 20 ? ok(`Node ${process.versions.node}`) : fail(`Node ${process.versions.node} (need 20+)`);

// Secrets
const INSECURE_JWT = 'change-this-secret';
const INSECURE_COOKIE = 'change-this-cookie-secret';
const jwt = process.env.JWT_SECRET || '';
const cookie = process.env.COOKIE_SECRET || '';
const jwtBad = !jwt || jwt === INSECURE_JWT;
const cookieBad = !cookie || cookie === INSECURE_COOKIE;
if (isProd) {
  jwtBad ? fail('JWT_SECRET missing/insecure (production)') : ok('JWT_SECRET set');
  cookieBad ? fail('COOKIE_SECRET missing/insecure (production)') : ok('COOKIE_SECRET set');
} else {
  jwtBad ? warn('JWT_SECRET using dev default') : ok('JWT_SECRET set');
  cookieBad ? warn('COOKIE_SECRET using dev default') : ok('COOKIE_SECRET set');
}

// Database driver + file
try {
  require('better-sqlite3');
  ok('better-sqlite3 native binding loads');
} catch {
  fail('better-sqlite3 native binding not built (run: npm rebuild better-sqlite3)');
}
const dbPath = process.env.DATABASE_URL || 'laro.sqlite';
fs.existsSync(dbPath) ? ok(`Database file present (${dbPath})`) : warn(`Database file not created yet (${dbPath})`);

// Migrations folder
fs.existsSync(path.resolve('drizzle', 'meta', '_journal.json'))
  ? ok('Migrations folder present')
  : warn('Migrations folder not found');

// Optional integrations
const has = (k) => !!process.env[k];
(has('OPENAI_API_KEY') || has('ANTHROPIC_API_KEY') || has('GOOGLE_GEMINI_API_KEY'))
  ? ok('AI provider configured')
  : warn('No AI provider key — LLM features run in deterministic/mock mode');
has('AWS_S3_BUCKET') ? ok('S3 storage configured') : warn('S3 not configured — evidence stored on local disk');
(has('GOOGLE_CLIENT_ID') && has('GOOGLE_CLIENT_SECRET'))
  ? ok('Google OAuth configured')
  : warn('Google OAuth not configured — Gmail/Drive disabled');

// Report
const icon = { ok: '✓', warn: '!', fail: '✗' };
console.log(`\nLARO doctor — env=${process.env.NODE_ENV || 'production'}\n`);
for (const [level, msg] of results) console.log(`  ${icon[level]} ${msg}`);
const fails = results.filter((r) => r[0] === 'fail').length;
const warns = results.filter((r) => r[0] === 'warn').length;
console.log(`\n${results.length} checks — ${fails} failed, ${warns} warnings.\n`);
process.exit(fails > 0 ? 1 : 0);
