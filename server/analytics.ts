/**
 * Phase 055 — product analytics, local-first.
 *
 * All metrics are computed from the LOCAL database and scoped to the requesting
 * user. There is NO third-party analytics/telemetry — nothing leaves the device.
 * This replaces the analytics.* endpoints that previously returned {} / [].
 */
import { getDb } from "./db";
import { cases as casesTable, outreachStatus, evidence } from "./schema";
import { and, eq, sql } from "drizzle-orm";

export async function overallStats(userId: string) {
  const db = await getDb();
  const empty = { totalCases: 0, activeCases: 0, closedCases: 0, totalEvidence: 0, totalOutreach: 0, responseRate: 0 };
  if (!db) return empty;

  const count = async (q: any) => Number((await q)[0]?.count || 0);

  const totalCases = await count(db.select({ count: sql<number>`count(*)` }).from(casesTable).where(eq(casesTable.userId, userId)));
  const activeCases = await count(db.select({ count: sql<number>`count(*)` }).from(casesTable).where(and(eq(casesTable.userId, userId), sql`status NOT IN ('Closed')`)));
  const closedCases = totalCases - activeCases;
  const totalEvidence = await count(db.select({ count: sql<number>`count(*)` }).from(evidence).where(eq(evidence.userId, userId)));

  const totalOutreach = await count(
    db.select({ count: sql<number>`count(*)` }).from(outreachStatus).innerJoin(casesTable, eq(outreachStatus.caseId, casesTable.id)).where(eq(casesTable.userId, userId))
  );
  const responded = await count(
    db.select({ count: sql<number>`count(*)` }).from(outreachStatus).innerJoin(casesTable, eq(outreachStatus.caseId, casesTable.id)).where(and(eq(casesTable.userId, userId), sql`outreach_status.status IN ('Interested','Declined')`))
  );
  const responseRate = totalOutreach > 0 ? Math.round((responded / totalOutreach) * 100) : 0;

  return { totalCases, activeCases, closedCases, totalEvidence, totalOutreach, responseRate };
}

export async function legalAreaDistribution(userId: string): Promise<Array<{ area: string; count: number }>> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ legalAreas: casesTable.legalAreas }).from(casesTable).where(eq(casesTable.userId, userId));
  const tally = new Map<string, number>();
  for (const r of rows) {
    let areas: string[] = [];
    try { areas = JSON.parse(r.legalAreas || "[]"); } catch { areas = []; }
    for (const a of areas) tally.set(a, (tally.get(a) || 0) + 1);
  }
  return [...tally.entries()].map(([area, count]) => ({ area, count })).sort((a, b) => b.count - a.count);
}

export async function caseStatusDistribution(userId: string): Promise<Array<{ status: string; count: number }>> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ status: casesTable.status, count: sql<number>`count(*)` })
    .from(casesTable)
    .where(eq(casesTable.userId, userId))
    .groupBy(casesTable.status);
  return rows.map((r) => ({ status: r.status || "Unknown", count: Number(r.count) }));
}
