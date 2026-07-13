#!/usr/bin/env node
/**
 * Phase 113 — regression baseline.
 *
 * Records the set of test files that constitute the passing suite as a committed
 * baseline (docs/regression-baseline.json). On later runs it fails if any
 * baselined test file has DISAPPEARED — i.e. coverage regressed by deletion.
 * This is a cheap, deterministic guard that does not re-run the suite; the suite
 * itself is run by `npm run gate`.
 *
 * Usage:
 *   node scripts/regression-baseline.mjs --update   # write/refresh the baseline
 *   node scripts/regression-baseline.mjs            # check against the baseline
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = join(ROOT, 'docs', 'regression-baseline.json');
const TEST_DIRS = ['tests'];

function walk(dir, acc) {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, name);
    let st; try { st = statSync(join(ROOT, rel)); } catch { continue; }
    if (st.isDirectory()) walk(rel, acc);
    else if (rel.endsWith('.test.ts')) acc.push(rel.split('\\').join('/'));
  }
  return acc;
}

// Only the directories vitest actually runs (mirror vitest.config include).
const RUN_GLOBS = ['tests/smoke/', 'tests/backend/', 'tests/e2e/', 'tests/security/', 'tests/frontend/', 'tests/a11y/', 'tests/acceptance/', 'tests/sim/'];
const files = walk('tests', []).filter((f) => RUN_GLOBS.some((g) => f.startsWith(g))).sort();

const update = process.argv.includes('--update');
if (update) {
  writeFileSync(BASELINE, JSON.stringify({ generated: 'run scripts/regression-baseline.mjs --update', testFiles: files, count: files.length }, null, 2) + '\n');
  console.log(`regression-baseline: wrote ${relative(ROOT, BASELINE)} with ${files.length} test files.`);
  process.exit(0);
}

if (!existsSync(BASELINE)) {
  console.error('regression-baseline: no baseline found — run with --update first.');
  process.exit(2);
}
const base = JSON.parse(readFileSync(BASELINE, 'utf8'));
const current = new Set(files);
const missing = base.testFiles.filter((f) => !current.has(f));
const added = files.filter((f) => !base.testFiles.includes(f));

console.log(`regression-baseline: baseline ${base.count} files, current ${files.length}.`);
if (added.length) console.log(`  + added (ok): ${added.join(', ')}`);
if (missing.length) {
  console.error(`  ❌ REGRESSION — ${missing.length} baselined test file(s) removed: ${missing.join(', ')}`);
  console.error('  If intentional, refresh the baseline: node scripts/regression-baseline.mjs --update');
  process.exit(1);
}
console.log('  ✅ No coverage regression (no baselined test file removed).');
process.exit(0);
