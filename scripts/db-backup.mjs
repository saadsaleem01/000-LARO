#!/usr/bin/env node
/**
 * Phase 033 — database migrations and rollback safety.
 *
 * Migrations run automatically at boot (server/db.ts). The rollback strategy is
 * a file-level snapshot: back up the SQLite database BEFORE a schema change, and
 * restore it if the migration goes wrong.
 *
 *   node scripts/db-backup.mjs              # create a timestamped backup
 *   node scripts/db-backup.mjs --restore <backupFile>   # restore a backup
 *
 * The DB path is taken from DATABASE_URL, else ./laro.sqlite.
 */
import fs from 'node:fs';
import path from 'node:path';

const dbPath = process.env.DATABASE_URL || path.resolve('laro.sqlite');
const args = process.argv.slice(2);

function ts() {
  // Avoid Date-in-tests concerns; this is a CLI, real time is fine here.
  return new Date().toISOString().replace(/[:.]/g, '-');
}

if (args[0] === '--restore') {
  const src = args[1];
  if (!src || !fs.existsSync(src)) {
    console.error('[db-backup] --restore requires an existing backup file.');
    process.exit(1);
  }
  fs.copyFileSync(src, dbPath);
  // Copy WAL/SHM siblings back too, if the backup captured them.
  for (const ext of ['-wal', '-shm']) {
    if (fs.existsSync(src + ext)) fs.copyFileSync(src + ext, dbPath + ext);
  }
  console.log(`[db-backup] Restored ${src} -> ${dbPath}`);
  process.exit(0);
}

if (!fs.existsSync(dbPath)) {
  console.error(`[db-backup] No database at ${dbPath} (set DATABASE_URL). Nothing to back up.`);
  process.exit(1);
}

const backupDir = path.join(path.dirname(dbPath), 'db-backups');
fs.mkdirSync(backupDir, { recursive: true });
const dest = path.join(backupDir, `${path.basename(dbPath)}.${ts()}.bak`);
fs.copyFileSync(dbPath, dest);
for (const ext of ['-wal', '-shm']) {
  if (fs.existsSync(dbPath + ext)) fs.copyFileSync(dbPath + ext, dest + ext);
}
console.log(`[db-backup] Backed up ${dbPath} -> ${dest}`);
console.log(`[db-backup] Rollback with: node scripts/db-backup.mjs --restore "${dest}"`);
