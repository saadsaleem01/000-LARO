/**
 * Phases 071–080 — help/error-catalog endpoints + red-team fix verification.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { bootTestApp, sqliteAvailable, type TestApp } from '../helpers/app';
import { buildUser, buildLawyer } from '../factories';

const suite = sqliteAvailable ? describe : describe.skip;

suite('Phases 071–080', () => {
  let app: TestApp;
  const U = { id: 'USER_78', name: 'U78', role: 'user', email: 'u78@example.com' };

  beforeAll(async () => {
    app = await bootTestApp();
    await app.db.insert(app.schema.users).values(buildUser({ id: U.id, email: U.email }));
    await app.db.insert(app.schema.lawyers).values(buildLawyer({ id: 'LWYR_78', legalAreas: JSON.stringify(['Employment Law']) }));
  });
  afterAll(() => app?.cleanup());

  it('Phase 071 — help topics are served, ordered by step', async () => {
    const topics = await app.makeCaller(null).help.topics();
    expect(topics.length).toBeGreaterThan(3);
    const steps = topics.filter((t: any) => t.step != null).map((t: any) => t.step);
    expect(steps).toEqual([...steps].sort((a, b) => a - b));
    expect(topics.find((t: any) => t.id === 'disclaimer')).toBeTruthy();
  });

  it('Phase 072 — error catalog maps codes to remedies', async () => {
    const cat = await app.makeCaller(null).help.errorCatalog();
    const forbidden = cat.find((e: any) => e.code === 'FORBIDDEN');
    expect(forbidden?.remedy).toBeTruthy();
    expect(cat.find((e: any) => e.code === 'TOO_MANY_REQUESTS')).toBeTruthy();
  });

  it('Phase 079 (red-team) — providerChecklist requires auth', async () => {
    await expect(app.makeCaller(null).system.providerChecklist()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    const ok = await app.makeCaller(U).system.providerChecklist();
    expect(ok.total).toBeGreaterThan(0);
  });

  it('Phase 078 (red-team) — GDPR erasure removes caseId-scoped children too', async () => {
    const caller = app.makeCaller(U);
    // Create a case, prepare outreach drafts (caseId-scoped rows in outreach_status).
    const c = await caller.cases.create({
      clientName: 'Erase Me', clientEmail: 'e@x.com', caseType: 'Employment',
      caseSummary: 'werknemer ontslag', urgency: 'High',
    });
    const caseId = c.id;
    await caller.workflow.prepareDrafts({ caseId });

    // Precondition: outreach rows exist for this case.
    const before = await app.db.select().from(app.schema.outreachStatus).where(
      (await import('drizzle-orm')).eq(app.schema.outreachStatus.caseId, caseId)
    );
    expect(before.length).toBeGreaterThan(0);

    // Erase the account.
    const del = await caller.gdpr.deleteData({ confirm: true });
    expect(del.deleted.users).toBe(1);

    // The caseId-scoped outreach rows must be gone (no orphans left behind).
    const after = await app.db.select().from(app.schema.outreachStatus).where(
      (await import('drizzle-orm')).eq(app.schema.outreachStatus.caseId, caseId)
    );
    expect(after.length).toBe(0);
  });
});
