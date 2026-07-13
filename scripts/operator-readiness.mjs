#!/usr/bin/env node
/**
 * Phase 115 — final human-operator readiness test.
 *
 * Composes the individual readiness checks into a single operator-facing report:
 * traceability, no-excuses, account safety, regression baseline, and production
 * preflight. Each is a real sub-check; this script runs them and summarizes.
 * Exits non-zero if any REQUIRED sub-check fails.
 *
 * It intentionally does NOT run the full test suite (that is `npm run gate`);
 * this is the lighter "is an operator ready to run this?" gate.
 *
 * Usage: node scripts/operator-readiness.mjs
 */
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const CHECKS = [
  { name: 'traceability', required: true, cmd: 'node', args: ['scripts/traceability.mjs'] },
  { name: 'no-excuses scan', required: true, cmd: 'node', args: ['scripts/no-excuses-scan.mjs'] },
  { name: 'account safety', required: true, cmd: 'node', args: ['scripts/account-safety-check.mjs'] },
  { name: 'regression baseline', required: true, cmd: 'node', args: ['scripts/regression-baseline.mjs'] },
  // Preflight is advisory here (blockers depend on the target env being production).
  { name: 'production preflight', required: false, cmd: 'node', args: ['scripts/prod-preflight.mjs'] },
];

console.log('\nOperator readiness');
console.log('══════════════════');
const failed = [];
for (const c of CHECKS) {
  const r = spawnSync(c.cmd, c.args, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' });
  const ok = r.status === 0;
  console.log(`${ok ? '✅' : c.required ? '❌' : '⚠️ '} ${c.name}${ok ? '' : ` (exit ${r.status})`}`);
  if (!ok && c.required) failed.push(c.name);
}

console.log('\nReminders before going live (see docs/OPERATOR_READINESS.md):');
console.log('  • run `npm run gate` (full tsc + tests) and `npm run preflight` in the prod env');
console.log('  • confirm emergency stop is released and `outreach.send.enabled` is intended');
console.log('  • verify a backup restores (server/backup.ts) and `admin.invariants` is clean');

if (failed.length) {
  console.error(`\n❌ NOT operator-ready — failed: ${failed.join(', ')}`);
  process.exit(1);
}
console.log('\n✅ Operator-readiness checks passed.');
process.exit(0);
