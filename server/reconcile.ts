/**
 * Phase 054 — data reconciliation and repair.
 *
 * Detects and (optionally) repairs data-integrity problems that can accumulate
 * because most referential integrity is enforced in application code rather than
 * by declared foreign keys:
 *   - orphaned child rows (caseId / userId pointing at a missing parent),
 *   - duplicate users by email.
 *
 * `reconcileReport()` is read-only (safe to run anytime). `repairOrphans()`
 * deletes orphaned rows inside a transaction and returns the counts.
 */
import { getDb } from "./db";

function rawClient(db: any): any {
  return db?.$client ?? db?.session?.client ?? null;
}

function tableColumns(sqlite: any, table: string): string[] {
  try {
    return (sqlite.prepare(`PRAGMA table_info("${table}")`).all() as Array<{ name: string }>).map((c) => c.name);
  } catch {
    return [];
  }
}

function listTables(sqlite: any): string[] {
  return (sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>)
    .map((t) => t.name)
    .filter((n) => !n.startsWith("sqlite_") && !n.startsWith("__"));
}

export interface ReconcileReport {
  orphanedByCaseId: Record<string, number>;
  orphanedByUserId: Record<string, number>;
  duplicateEmails: Array<{ email: string; count: number }>;
  totalOrphans: number;
}

export async function reconcileReport(): Promise<ReconcileReport> {
  const db = await getDb();
  const sqlite = rawClient(db);
  const report: ReconcileReport = { orphanedByCaseId: {}, orphanedByUserId: {}, duplicateEmails: [], totalOrphans: 0 };
  if (!sqlite) return report;

  const tables = listTables(sqlite);
  for (const table of tables) {
    if (table === "cases" || table === "users") continue;
    const cols = tableColumns(sqlite, table);

    if (cols.includes("caseId")) {
      try {
        const n = (sqlite.prepare(
          `SELECT count(*) AS c FROM "${table}" t WHERE t.caseId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM cases c WHERE c.id = t.caseId)`
        ).get() as any).c as number;
        if (n > 0) { report.orphanedByCaseId[table] = n; report.totalOrphans += n; }
      } catch { /* skip */ }
    }
    if (cols.includes("userId")) {
      try {
        const n = (sqlite.prepare(
          `SELECT count(*) AS c FROM "${table}" t WHERE t.userId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = t.userId)`
        ).get() as any).c as number;
        if (n > 0) { report.orphanedByUserId[table] = n; report.totalOrphans += n; }
      } catch { /* skip */ }
    }
  }

  try {
    const dups = sqlite.prepare(
      `SELECT email, count(*) AS c FROM users WHERE email IS NOT NULL GROUP BY email HAVING c > 1`
    ).all() as Array<{ email: string; c: number }>;
    report.duplicateEmails = dups.map((d) => ({ email: d.email, count: d.c }));
  } catch { /* skip */ }

  return report;
}

export async function repairOrphans(): Promise<{ deleted: Record<string, number> }> {
  const db = await getDb();
  const sqlite = rawClient(db);
  if (!sqlite) return { deleted: {} };

  const deleted: Record<string, number> = {};
  const tables = listTables(sqlite);
  const tx = sqlite.transaction(() => {
    for (const table of tables) {
      if (table === "cases" || table === "users") continue;
      const cols = tableColumns(sqlite, table);
      if (cols.includes("caseId")) {
        try {
          const info = sqlite.prepare(
            `DELETE FROM "${table}" WHERE caseId IS NOT NULL AND caseId NOT IN (SELECT id FROM cases)`
          ).run();
          if (info.changes) deleted[`${table}.caseId`] = info.changes;
        } catch { /* skip */ }
      }
      if (cols.includes("userId")) {
        try {
          const info = sqlite.prepare(
            `DELETE FROM "${table}" WHERE userId IS NOT NULL AND userId NOT IN (SELECT id FROM users)`
          ).run();
          if (info.changes) deleted[`${table}.userId`] = info.changes;
        } catch { /* skip */ }
      }
    }
  });
  tx();
  return { deleted };
}
