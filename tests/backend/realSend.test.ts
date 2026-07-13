/**
 * Phase 011/026/017 — real outreach send path, fully gated.
 * Uses an injected fake sender so no real lawyer is ever contacted.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { bootTestApp, sqliteAvailable, type TestApp } from '../helpers/app';
import { buildUser, buildCase, buildLawyer } from '../factories';

const suite = sqliteAvailable ? describe : describe.skip;

suite('Real outreach send (011/026/017)', () => {
  let app: TestApp;
  const U = { id: 'USR_SEND', name: 'S', role: 'user', email: 's@example.com' };
  let outreachId: string;

  beforeAll(async () => {
    app = await bootTestApp();
    await app.db.insert(app.schema.users).values(buildUser({ id: U.id, email: U.email }));
    await app.db.insert(app.schema.lawyers).values(buildLawyer({ id: 'LW_SEND', email: 'lawyer@law.example', legalAreas: JSON.stringify(['Employment Law']) }));
    await app.db.insert(app.schema.cases).values(buildCase({ id: 'CASE_SEND', userId: U.id, caseType: 'Employment' }));
    // Create + approve a draft through the real API.
    await app.makeCaller(U).workflow.prepareDrafts({ caseId: 'CASE_SEND' });
    const q = await app.makeCaller(U).workflow.reviewQueue({ caseId: 'CASE_SEND' });
    outreachId = q[0].id;
    await app.makeCaller(U).workflow.approveDraft({ outreachId });
  });
  afterAll(() => app?.cleanup());

  it('refuses to send while the feature flag is OFF (default)', async () => {
    await expect(app.makeCaller(U).workflow.sendApproved({ outreachId })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('sends via the real path when enabled + provider present, then is idempotent', async () => {
    const { setFlag } = await import('../../server/featureFlags');
    await setFlag('outreach.send.enabled', true);

    const { sendApprovedOutreach } = await import('../../server/outreachSend');
    const sent: any[] = [];
    const fakeSender = async (email: any) => { sent.push(email); return { delivered: true, provider: 'fake' }; };

    const r1 = await sendApprovedOutreach(U.id, outreachId, fakeSender);
    expect(r1.sent).toBe(true);
    expect(r1.to).toBe('lawyer@law.example');
    expect(sent.length).toBe(1);

    // Row is now Sent.
    const [row] = await app.db.select().from(app.schema.outreachStatus).where(
      (await import('drizzle-orm')).eq(app.schema.outreachStatus.id, outreachId)
    );
    expect(row.status).toBe('Sent');

    // Idempotent: a second send does NOT transmit again.
    const r2 = await sendApprovedOutreach(U.id, outreachId, fakeSender);
    expect(r2.alreadySent).toBe(true);
    expect(sent.length).toBe(1); // still one send

    await setFlag('outreach.send.enabled', false);
  });

  it('fails honestly (no fake success) when no provider is configured', async () => {
    const { setFlag } = await import('../../server/featureFlags');
    await setFlag('outreach.send.enabled', true);
    // Fresh approved draft.
    await app.db.insert(app.schema.cases).values(buildCase({ id: 'CASE_SEND2', userId: U.id }));
    await app.makeCaller(U).workflow.prepareDrafts({ caseId: 'CASE_SEND2' });
    const q = await app.makeCaller(U).workflow.reviewQueue({ caseId: 'CASE_SEND2' });
    const oid = q[0].id;
    await app.makeCaller(U).workflow.approveDraft({ outreachId: oid });

    const { sendApprovedOutreach } = await import('../../server/outreachSend');
    const noProvider = async () => ({ delivered: false, provider: 'console' });
    await expect(sendApprovedOutreach(U.id, oid, noProvider)).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });

    // NOT marked sent — no fake success.
    const [row] = await app.db.select().from(app.schema.outreachStatus).where(
      (await import('drizzle-orm')).eq(app.schema.outreachStatus.id, oid)
    );
    expect(row.status).toBe('Approved');
    await setFlag('outreach.send.enabled', false);
  });
});
