/**
 * Phase 053 — backup and restore procedures.
 *
 * Real SQLite backup/restore for the server database:
 *  - backupDatabase(destPath): uses better-sqlite3's online `.backup()` (a
 *    consistent copy that is safe while the DB is in use).
 *  - restoreDatabase(srcPath): validates the source is a readable SQLite DB with
 *    the core tables, then replaces the live DB file (a `.bak` of the current DB
 *    is kept). The caller must restart the app so the new DB is opened.
 *
 * See docs/BACKUP_RESTORE.md for the operator procedure.
 */
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { getDb } from "./db";

function rawClient(db: any): any {
  return db?.$client ?? db?.session?.client ?? null;
}

function currentDbPath(): string {
  return process.env.DATABASE_URL || "laro.sqlite";
}

/** Create a consistent backup of the live database at `destPath`. */
export async function backupDatabase(destPath: string): Promise<{ path: string; bytes: number }> {
  const db = await getDb();
  const sqlite = rawClient(db);
  if (!sqlite) throw new Error("Database not available for backup");

  fs.mkdirSync(path.dirname(path.resolve(destPath)), { recursive: true });
  // better-sqlite3: db.backup(destination) returns a Promise.
  await sqlite.backup(destPath);
  const bytes = fs.statSync(destPath).size;
  return { path: destPath, bytes };
}

/** Validate that a file is a SQLite DB containing the core LARO tables. */
export function validateBackup(srcPath: string): { valid: boolean; reason?: string; tables?: string[] } {
  if (!fs.existsSync(srcPath)) return { valid: false, reason: "File does not exist" };
  let probe: InstanceType<typeof Database> | null = null;
  try {
    probe = new Database(srcPath, { readonly: true, fileMustExist: true });
    const rows = probe.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
    const names = rows.map((r) => r.name);
    const required = ["users", "cases"];
    const missing = required.filter((t) => !names.includes(t));
    if (missing.length > 0) return { valid: false, reason: `Missing core tables: ${missing.join(", ")}`, tables: names };
    return { valid: true, tables: names };
  } catch (e) {
    return { valid: false, reason: e instanceof Error ? e.message : String(e) };
  } finally {
    try { probe?.close(); } catch { /* ignore */ }
  }
}

/**
 * Restore the live DB from `srcPath`. Keeps a `.bak` of the previous DB. The app
 * must be restarted afterward to reopen the database.
 */
export function restoreDatabase(srcPath: string): { restored: true; backupOfPrevious: string } {
  const check = validateBackup(srcPath);
  if (!check.valid) throw new Error(`Refusing to restore: ${check.reason}`);

  const live = path.resolve(currentDbPath());
  const prevBak = `${live}.bak-${Date.now()}`;
  if (fs.existsSync(live)) fs.copyFileSync(live, prevBak);
  fs.copyFileSync(path.resolve(srcPath), live);
  // Remove WAL/SHM sidecars so the restored DB is opened cleanly.
  for (const ext of ["-wal", "-shm"]) {
    try { if (fs.existsSync(live + ext)) fs.unlinkSync(live + ext); } catch { /* ignore */ }
  }
  return { restored: true, backupOfPrevious: prevBak };
}
