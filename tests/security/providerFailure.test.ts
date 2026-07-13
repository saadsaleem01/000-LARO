/**
 * Phase 048 — provider failure simulation.
 *
 * The app must degrade gracefully when external providers/data are unavailable:
 * no lawyers -> empty matches (not a crash), unconfigured S3 -> local storage,
 * unclassifiable text -> "Other", and the fake-provider lab is blocked in prod.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { bootTestApp, sqliteAvailable, type TestApp } from '../helpers/app';
import { buildUser } from '../factories';

const suite = sqliteAvailable ? describe : describe.skip;

suite('Phase 048 — provider/degradation', () => {
  let app: TestApp;
  const U = { id: 'USER_PF', name: 'PF', role: 'user', email: 'pf@example.com' };

  beforeAll(async () => {
    app = await bootTestApp();
    await app.db.insert(app.schema.users).values(buildUser({ id: U.id, email: U.email }));
  });
  afterAll(() => app?.cleanup());

  it('matching returns [] when there are no lawyers (no crash)', async () => {
    const caller = app.makeCaller(U);
    const c = await caller.cases.create({
      clientName: 'PF', clientEmail: 'c@x.com', caseType: 'Employment', caseSummary: 'ontslag', urgency: 'High',
    });
    const list = await caller.cases.list({});
    const matches = await caller.matching.findLawyers({ caseId: list.cases[0].id });
    expect(Array.isArray(matches)).toBe(true);
    expect(matches.length).toBe(0);
    void c;
  });

  it('classification degrades to Other for unrecognizable text', async () => {
    const { classifyLegalAreas } = await import('../../server/classification');
    expect(classifyLegalAreas('zzz qqq nonsense').areas).toEqual(['Other']);
  });

  it('GDPR export for a user with no data does not crash', async () => {
    const exp = await app.makeCaller({ id: 'USER_EMPTY', role: 'user', name: 'e', email: 'e@x.com' }).gdpr.exportData();
    expect(exp.success).toBe(true);
    expect(exp.data._meta).toBeTruthy();
  });
});

describe('Phase 038/048 — fake provider lab is production-guarded', () => {
  it('constructing a fake email provider throws in production', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const { FakeEmailProvider } = await import('../../server/testing/fakeProviders');
      expect(() => new FakeEmailProvider()).toThrow();
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('records "sent" mail in test mode instead of transmitting', async () => {
    process.env.NODE_ENV = 'test';
    const { FakeEmailProvider } = await import('../../server/testing/fakeProviders');
    const p = new FakeEmailProvider();
    await p.send({ to: 'x@x.com', subject: 's', body: 'b' });
    expect(p.sent).toHaveLength(1);
  });
});
