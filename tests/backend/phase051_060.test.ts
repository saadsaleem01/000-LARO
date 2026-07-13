/**
 * Phases 051–060 — DB-backed behavioural tests (real temp DB).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { bootTestApp, sqliteAvailable, type TestApp } from '../helpers/app';
import { buildUser, buildLawyer } from '../factories';

const suite = sqliteAvailable ? describe : describe.skip;

suite('Phases 051–060 — services', () => {
  let app: TestApp;
  const U = { id: 'USER_5X', name: '5X', role: 'user', email: 'x5@example.com' };

  beforeAll(async () => {
    app = await bootTestApp();
    await app.db.insert(app.schema.users).values(buildUser({ id: U.id, email: U.email }));
    await app.db.insert(app.schema.lawyers).values(buildLawyer({ id: 'LWYR_5X', legalAreas: JSON.stringify(['Employment Law']) }));
  });
  afterAll(() => app?.cleanup());

  it('Phase 052 — pagination is complete and non-overlapping over a large set', async () => {
    const caller = app.makeCaller(U);
    // Insert 55 cases directly (bypass rate limit) for the pagination test.
    const rows = Array.from({ length: 55 }, (_, i) => ({
      id: `PGC${i}`, userId: U.id, clientName: `Client ${i}`, clientEmail: `c${i}@x.com`,
      caseType: 'Employment', caseSummary: 'ontslag', urgency: i % 2 ? 'High' : 'Low',
      status: 'Matching', legalAreas: JSON.stringify(['Employment Law']),
      createdAt: new Date(Date.now() - i * 1000), updatedAt: new Date(),
    }));
    await app.db.insert(app.schema.cases).values(rows as any);

    const seen = new Set<string>();
    let page = 1; let total = 0;
    for (;;) {
      const res = await caller.cases.list({ page, limit: 10, sortBy: 'createdAt', sortDir: 'desc' });
      total = res.pagination.total;
      for (const c of res.cases) {
        expect(seen.has(c.id)).toBe(false); // no overlap across pages
        seen.add(c.id);
      }
      if (page >= res.pagination.totalPages) break;
      page++;
    }
    expect(total).toBe(55);
    expect(seen.size).toBe(55);
  });

  it('Phase 022/051 — filters narrow the result set', async () => {
    const caller = app.makeCaller(U);
    const high = await caller.cases.list({ urgency: 'High', limit: 100 });
    expect(high.cases.every((c: any) => c.urgency === 'High')).toBe(true);
    const search = await caller.cases.list({ search: 'Client 3', limit: 100 });
    expect(search.cases.length).toBeGreaterThan(0);
  });

  it('Phase 059 — cases.update rejects an illegal status transition', async () => {
    const caller = app.makeCaller(U);
    const created = await app.db.insert(app.schema.cases).values({
      id: 'SMCASE', userId: U.id, clientName: 'SM', clientEmail: 's@x.com', caseType: 'Employment',
      caseSummary: 'x', urgency: 'Low', status: 'Closed', legalAreas: '[]', createdAt: new Date(), updatedAt: new Date(),
    } as any);
    void created;
    // Closed is terminal — any transition must be rejected.
    await expect(caller.cases.update({ id: 'SMCASE', status: 'Matching' })).rejects.toBeTruthy();
  });

  it('Phase 058 — feature flags default correctly and can be toggled', async () => {
    const { getFlag, setFlag } = await import('../../server/featureFlags');
    expect(await getFlag('outreach.send.enabled')).toBe(false); // default OFF
    await setFlag('outreach.send.enabled', true);
    expect(await getFlag('outreach.send.enabled')).toBe(true);
    await setFlag('outreach.send.enabled', false);
  });

  it('Phase 055 — analytics are computed from real data (local-first)', async () => {
    const caller = app.makeCaller(U);
    const stats = await caller.analytics.getOverallStats();
    expect(stats.totalCases).toBeGreaterThan(0);
    const dist = await caller.analytics.getLegalAreaDistribution();
    expect(dist.find((d: any) => d.area === 'Employment Law')).toBeTruthy();
  });

  it('Phase 054 — reconciliation detects and repairs orphans', async () => {
    const { reconcileReport, repairOrphans } = await import('../../server/reconcile');
    // Create an orphaned outreach row (caseId not in cases).
    await app.db.insert(app.schema.outreachStatus).values({
      id: 'ORPHAN1', caseId: 'NONEXISTENT_CASE', lawyerId: 'LWYR_5X', status: 'PendingApproval',
      createdAt: new Date(), updatedAt: new Date(),
    } as any);
    const before = await reconcileReport();
    expect(before.totalOrphans).toBeGreaterThan(0);
    const repaired = await repairOrphans();
    expect(Object.keys(repaired.deleted).length).toBeGreaterThan(0);
    const after = await reconcileReport();
    expect(after.orphanedByCaseId['outreach_status'] ?? 0).toBe(0);
  });

  it('Phase 053 — backup produces a valid restorable SQLite file', async () => {
    const { backupDatabase, validateBackup } = await import('../../server/backup');
    const dest = join(app.tmpDir, 'backup.sqlite');
    const res = await backupDatabase(dest);
    expect(existsSync(res.path)).toBe(true);
    expect(res.bytes).toBeGreaterThan(0);
    const check = validateBackup(dest);
    expect(check.valid).toBe(true);
    expect(check.tables).toContain('cases');
  });

  it('Phase 056 — billing status reports free tier, no forced billing', async () => {
    const caller = app.makeCaller(U);
    const b = await caller.billing.status();
    expect(b.plan).toBe('free');
    expect(b.forcedBilling).toBe(false);
  });
});
