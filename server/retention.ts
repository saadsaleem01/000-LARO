/**
 * Phase 102 — data retention & archival policy.
 *
 * A real, runnable retention sweep. Audit-log rows older than the retention
 * window are the primary target: they accumulate indefinitely and hold IP/user
 * metadata that should not be kept forever (privacy minimization — see DPIA).
 *
 * The policy is conservative and reversible-by-configuration:
 *   - AUDIT_RETENTION_DAYS (default 365): audit_logs older than this are deleted.
 * The sweep is a no-op when nothing is old enough, and reports exactly what it
 * removed. It never touches user-owned business data (cases/evidence/outreach) —
 * that lifecycle is governed by the user (GDPR erasure) not by retention.
 */
import { getDb } from "./db";
import { auditLogs } from "./schema";
import { lt } from "drizzle-orm";

export const RETENTION_POLICY = {
  auditLogDays: Number(process.env.AUDIT_RETENTION_DAYS || 365),
} as const;

export interface RetentionReport {
  cutoffISO: string;
  auditLogsDeleted: number;
  policy: typeof RETENTION_POLICY;
}

/**
 * Run the retention sweep. `now` is injectable so the pure cutoff maths can be
 * tested deterministically (no ambient Date in the hot path).
 */
export async function runRetentionSweep(now: Date = new Date()): Promise<RetentionReport> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const cutoff = new Date(now.getTime() - RETENTION_POLICY.auditLogDays * 24 * 60 * 60 * 1000);

  // Count first (for an honest report), then delete.
  const stale = await db.select({ id: auditLogs.id }).from(auditLogs).where(lt(auditLogs.createdAt, cutoff));
  const auditLogsDeleted = stale.length;
  if (auditLogsDeleted > 0) {
    await db.delete(auditLogs).where(lt(auditLogs.createdAt, cutoff));
  }

  return {
    cutoffISO: cutoff.toISOString(),
    auditLogsDeleted,
    policy: RETENTION_POLICY,
  };
}

/** Report what a sweep WOULD remove, without deleting (dry run). */
export async function previewRetentionSweep(now: Date = new Date()): Promise<RetentionReport> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const cutoff = new Date(now.getTime() - RETENTION_POLICY.auditLogDays * 24 * 60 * 60 * 1000);
  const stale = await db.select({ id: auditLogs.id }).from(auditLogs).where(lt(auditLogs.createdAt, cutoff));
  return { cutoffISO: cutoff.toISOString(), auditLogsDeleted: stale.length, policy: RETENTION_POLICY };
}
