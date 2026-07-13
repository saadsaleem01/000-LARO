/**
 * Phase 046 — cross-user isolation tests.
 *
 * User B must never be able to read, mutate, export, or match on User A's case.
 * Exercised through the real API (createCaller) so the ownership guards and
 * protected procedures are actually invoked.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { bootTestApp, sqliteAvailable, type TestApp } from '../helpers/app';
import { buildUser } from '../factories';

const suite = sqliteAvailable ? describe : describe.skip;

suite('Phase 046 — cross-user isolation', () => {
  let app: TestApp;
  const A = { id: 'USER_A', name: 'A', role: 'user', email: 'a@example.com' };
  const B = { id: 'USER_B', name: 'B', role: 'user', email: 'b@example.com' };
  let caseId: string;

  beforeAll(async () => {
    app = await bootTestApp();
    await app.db.insert(app.schema.users).values(buildUser({ id: A.id, email: A.email }));
    await app.db.insert(app.schema.users).values(buildUser({ id: B.id, email: B.email }));

    const res = await app.makeCaller(A).cases.create({
      clientName: 'A Client', clientEmail: 'ac@example.com',
      caseType: 'Employment', caseSummary: 'ontslag zaak', urgency: 'High',
    });
    caseId = res.id;
  });

  afterAll(() => app?.cleanup());

  it('B cannot read A\'s case by id (returns null)', async () => {
    const got = await app.makeCaller(B).cases.byId(caseId);
    expect(got).toBeNull();
  });

  it('B\'s case list does not include A\'s case', async () => {
    const list = await app.makeCaller(B).cases.list({});
    expect(list.cases.find((c: any) => c.id === caseId)).toBeUndefined();
  });

  it('B cannot delete A\'s case', async () => {
    await expect(app.makeCaller(B).cases.delete({ id: caseId })).rejects.toBeTruthy();
    // A's case still exists.
    const still = await app.makeCaller(A).cases.byId(caseId);
    expect(still?.id).toBe(caseId);
  });

  it('B cannot run matching or read outreach/gap data on A\'s case', async () => {
    await expect(app.makeCaller(B).matching.findLawyers({ caseId })).rejects.toBeTruthy();
    await expect(app.makeCaller(B).outreach.byCaseId(caseId)).rejects.toBeTruthy();
    await expect(app.makeCaller(B).gapAnalysis.getGaps({ caseId })).rejects.toBeTruthy();
    await expect(app.makeCaller(B).cases.progress({ caseId })).rejects.toBeTruthy();
  });

  it('B\'s GDPR export does not contain A\'s case', async () => {
    const exp = await app.makeCaller(B).gdpr.exportData();
    const cases = exp.data?.cases ?? [];
    expect(cases.find((c: any) => c.id === caseId)).toBeUndefined();
  });
});
