#!/usr/bin/env node
/**
 * Phase 103 — migration from prototype to production: preflight checks.
 *
 * Verifies the conditions that must hold before running LARO in production.
 * Runnable; exits non-zero if any BLOCKER is present. Reads the environment and
 * repo config only — it never prints secret values (only whether they are set and
 * non-default).
 *
 * Usage: NODE_ENV=production node scripts/prod-preflight.mjs
 */
import { readFileSync, existsSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const results = [];
function check(level, name, ok, detail) { results.push({ level, name, ok, detail }); }

const isProd = process.env.NODE_ENV === 'production';
check('INFO', 'NODE_ENV', true, `NODE_ENV=${process.env.NODE_ENV || '(unset)'}`);

// Secrets must be set and not the shipped insecure placeholders.
const INSECURE = new Set(['', undefined, 'change-me', 'changeme', 'secret', 'dev', 'development', 'insecure']);
for (const key of ['JWT_SECRET', 'COOKIE_SECRET']) {
  const v = process.env[key];
  const strong = !!v && v.length >= 16 && !INSECURE.has(v);
  check('BLOCKER', `${key} strong`, strong || !isProd,
    strong ? 'set and strong' : isProd ? 'MISSING/weak in production' : 'not set (ok outside prod)');
}

// Demo mode must be off in production.
const demoOff = !(process.env.DEMO_MODE === 'true' || process.env.FEATURE_DEMO_MODE === 'true');
check('BLOCKER', 'demo mode off', demoOff || !isProd, demoOff ? 'demo off' : 'DEMO must be off in production');

// Migrations present.
const hasMigrations = existsSync(join(ROOT, 'drizzle')) && readdirSync(join(ROOT, 'drizzle')).length > 0;
check('BLOCKER', 'migrations present', hasMigrations, hasMigrations ? 'drizzle/ has migrations' : 'no migrations found');

// No secret .env tracked in git.
let tracked = '';
try { tracked = execSync('git ls-files', { cwd: ROOT }).toString(); } catch { /* not a repo */ }
const leaked = tracked.split('\n').filter((f) => /^\.env($|\.)/.test(f) && f !== '.env.example');
check('BLOCKER', 'no tracked .env', leaked.length === 0, leaked.length ? `tracked: ${leaked.join(', ')}` : 'clean');

// Version has a CHANGELOG entry.
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const changelog = existsSync(join(ROOT, 'CHANGELOG.md')) ? readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8') : '';
const versioned = changelog.includes(`[${pkg.version}]`);
check('WARN', 'CHANGELOG has version', versioned, versioned ? `[${pkg.version}] present` : `no entry for ${pkg.version}`);

// Print report.
const blockers = results.filter((r) => r.level === 'BLOCKER' && !r.ok);
console.log('\nProduction preflight');
console.log('────────────────────');
for (const r of results) {
  const mark = r.ok ? '✅' : r.level === 'BLOCKER' ? '❌' : '⚠️ ';
  console.log(`${mark} [${r.level}] ${r.name} — ${r.detail}`);
}
if (blockers.length) {
  console.error(`\n❌ ${blockers.length} blocker(s) — NOT production-ready.`);
  process.exit(1);
}
console.log('\n✅ No blockers. (Warnings, if any, are advisory.)');
process.exit(0);
