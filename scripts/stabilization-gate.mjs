#!/usr/bin/env node
/**
 * Phase 089 — progressive stabilization gates.
 *
 * Runs the project's quality gates in a fixed order and STOPS at the first
 * failure, reporting exactly which gate blocked. This is the same ordering the
 * CI workflow enforces, runnable locally with one command (`npm run gate`).
 *
 * Gates (in order, fail-fast):
 *   1. server typecheck   (tsc -p tsconfig.server.json)
 *   2. main typecheck     (tsc -p tsconfig.main.json)
 *   3. traceability       (scripts/traceability.mjs — no broken matrix refs)
 *   4. tests              (vitest run)
 *
 * Renderer typecheck + lint are known-non-blocking debt (docs/TECH_DEBT.md D2)
 * and are reported as warnings, not gates, so this command stays honest about
 * what it does and does not guarantee.
 *
 * Exit code is non-zero if any blocking gate fails.
 */
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const BLOCKING = [
  { name: 'server typecheck', cmd: 'npx', args: ['tsc', '-p', 'tsconfig.server.json', '--noEmit'] },
  { name: 'main typecheck', cmd: 'npx', args: ['tsc', '-p', 'tsconfig.main.json', '--noEmit'] },
  { name: 'traceability', cmd: 'node', args: ['scripts/traceability.mjs', '--write'] },
  { name: 'no-excuses scan', cmd: 'node', args: ['scripts/no-excuses-scan.mjs', '--write'] },
  { name: 'account safety', cmd: 'node', args: ['scripts/account-safety-check.mjs', '--write'] },
  { name: 'tests', cmd: 'npx', args: ['vitest', 'run'] },
];

const WARN = [
  { name: 'renderer typecheck (non-blocking debt D2)', cmd: 'npx', args: ['tsc', '-p', 'tsconfig.renderer.json', '--noEmit'] },
];

function run(step) {
  process.stdout.write(`\n▶ gate: ${step.name}\n`);
  const r = spawnSync(step.cmd, step.args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  return r.status === 0;
}

let failedAt = null;
for (const step of BLOCKING) {
  if (!run(step)) {
    failedAt = step.name;
    break;
  }
  console.log(`✅ ${step.name} passed`);
}

if (failedAt) {
  console.error(`\n❌ STABILIZATION GATE FAILED at: ${failedAt}`);
  console.error('   Fix this gate before proceeding to the next phase (Phase 089: no advancing on red).');
  process.exit(1);
}

console.log('\n— non-blocking warnings —');
for (const step of WARN) {
  const ok = run(step);
  console.log(ok ? `✅ ${step.name}` : `⚠️  ${step.name} has known issues (tracked, not a gate)`);
}

console.log('\n✅ ALL BLOCKING STABILIZATION GATES PASSED');
process.exit(0);
