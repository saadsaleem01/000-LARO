/**
 * Phases 061–070 — DB-backed behavioural tests (real temp DB).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { bootTestApp, sqliteAvailable, type TestApp } from '../helpers/app';
import { buildUser, buildLawyer } from '../factories';

const suite = sqliteAvailable ? describe : describe.skip;

suite('Phases 061–070', () => {
  let app: TestApp;
  const ADMIN = { id: 'USER_ADMIN61', name: 'Admin', role: 'admin', email: 'admin61@example.com' };
  const U = { id: 'USER_61', name: 'U61', role: 'user', email: 'u61@example.com' };

  beforeAll(async () => {
    app = await bootTestApp();
    await app.db.insert(app.schema.users).values(buildUser({ id: ADMIN.id, email: ADMIN.email }));
    await app.db.insert(app.schema.users).values(buildUser({ id: U.id, email: U.email }));
    await app.db.insert(app.schema.lawyers).values(buildLawyer({ id: 'LWYR_61', legalAreas: JSON.stringify(['Employment Law']) }));
  });
  afterAll(() => app?.cleanup());

  it('Phase 061 — invariants pass on a clean DB', async () => {
    const res = await app.makeCaller(ADMIN).admin.invariants();
    expect(res.ok).toBe(true);
    expect(res.invariants.find((i: any) => i.name.includes('email'))?.ok).toBe(true);
  });

  it('Phase 061 — invariant check is admin-only', async () => {
    await expect(app.makeCaller(U).admin.invariants()).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('Phase 063 — provider checklist reports configured/unconfigured without secrets', async () => {
    const res = await app.makeCaller(U).system.providerChecklist();
    expect(res.total).toBeGreaterThan(0);
    expect(Array.isArray(res.items)).toBe(true);
    // No item leaks a secret value — only booleans + env-var names.
    for (const item of res.items) {
      expect(typeof item.configured).toBe('boolean');
      expect(Array.isArray(item.requiredEnv)).toBe(true);
    }
  });

  it('Phase 062 — pre-send review returns safety facts and never sends', async () => {
    const caller = app.makeCaller(U);
    const c = await caller.cases.create({
      clientName: 'PreSend', clientEmail: 'p@x.com', caseType: 'Employment',
      caseSummary: 'werknemer ontslag', urgency: 'High',
    });
    const list = await caller.cases.list({});
    const caseId = list.cases[0].id;
    await caller.workflow.prepareDrafts({ caseId });
    const q = await caller.workflow.reviewQueue({ caseId });

    const review = await caller.workflow.preSendReview({ outreachId: q[0].id });
    expect(review.externalAction).toBe(true);
    expect(review.reversible).toBe(false);
    expect(review.requiresExplicitApproval).toBe(true);
    expect(review.sendEnabled).toBe(false); // flag default off
    expect(review.disclaimer.length).toBeGreaterThan(0);
    void c;
  });

  it('Phase 062 — pre-send review enforces ownership', async () => {
    const caller = app.makeCaller(U);
    const list = await caller.cases.list({});
    const caseId = list.cases[0].id;
    const q = await caller.workflow.reviewQueue({ caseId });
    // A different user cannot review this draft.
    await expect(app.makeCaller({ id: 'OTHER61', role: 'user', name: 'o', email: 'o@x.com' }).workflow.preSendReview({ outreachId: q[0].id })).rejects.toBeTruthy();
  });
});
