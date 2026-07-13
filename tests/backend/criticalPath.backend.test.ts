/**
 * Phase 040 — backend test suite (real DB integration).
 *
 * Boots the real database layer against a throwaway temp SQLite file (migrations
 * run for real), seeds data with the Phase 039 factories, and exercises the wired
 * critical-path pieces end to end:
 *   - deterministic classification produces legal areas,
 *   - the REAL matching engine returns a suitable lawyer with a real score,
 *   - authorization (assertCaseOwnership) enforces the ownership boundary,
 *   - GDPR export returns the user's data and erasure deletes it.
 *
 * Requires the better-sqlite3 native binding. If it is not built the whole suite
 * skips (rather than failing), and prints how to build it.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { buildUser, buildCase, buildLawyer, buildEvidence } from '../factories';

let sqliteOk = true;
try {
  const { createRequire } = await import('module');
  createRequire(import.meta.url)('better-sqlite3');
} catch {
  sqliteOk = false;
  console.warn('[backend suite] better-sqlite3 not built — skipping. Run: npm rebuild better-sqlite3');
}

const suite = sqliteOk ? describe : describe.skip;

suite('Phase 040 — critical-path backend integration', () => {
  let tmpDir: string;
  let db: any;
  let schema: any;
  let matching: any;
  let gdpr: any;
  let authz: any;
  let classification: any;
  const userId = 'USER_BE01';
  const otherUserId = 'USER_BE02';
  let caseId: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    tmpDir = mkdtempSync(join(tmpdir(), 'laro-be-'));
    process.env.DATABASE_URL = join(tmpDir, 'test.sqlite');
    process.env.LOCAL_STORAGE_DIR = join(tmpDir, 'uploads');

    const dbmod = await import('../../server/db');
    schema = await import('../../server/schema');
    matching = await import('../../server/matching');
    gdpr = await import('../../server/gdpr');
    authz = await import('../../server/_core/authz');
    classification = await import('../../server/classification');

    db = await dbmod.getDb(); // runs migrations against the fresh temp DB
    expect(db).toBeTruthy();

    // Seed: user, another user, a matching lawyer, and a classified case.
    await db.insert(schema.users).values(buildUser({ id: userId }));
    await db.insert(schema.users).values(buildUser({ id: otherUserId }));
    await db.insert(schema.lawyers).values(buildLawyer({ id: 'LWYR_BE01' }));

    const cls = classification.classifyLegalAreas(
      'werknemer ontslag zonder opzegtermijn',
      'Employment'
    );
    expect(cls.areas).toContain('Employment Law');

    const c = buildCase({ id: 'CASE_BE01', userId, legalAreas: JSON.stringify(cls.areas) });
    caseId = c.id;
    await db.insert(schema.cases).values(c);
    await db.insert(schema.evidence).values(buildEvidence({ caseId, userId }));
  });

  afterAll(() => {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it('the real matching engine returns the seeded lawyer with a real score', async () => {
    const matches = await matching.findMatchingLawyers(caseId, { sortBy: 'score' });
    expect(Array.isArray(matches)).toBe(true);
    expect(matches.length).toBeGreaterThan(0);
    const m = matches[0];
    expect(m.id).toBe('LWYR_BE01');
    expect(typeof m.matchScore).toBe('number');
    expect(m.matchScore).toBeGreaterThan(0);
  });

  it('enforces case ownership (Phase 008)', async () => {
    await expect(authz.assertCaseOwnership(caseId, userId)).resolves.toBeUndefined();
    await expect(authz.assertCaseOwnership(caseId, otherUserId)).rejects.toBeTruthy();
  });

  it('GDPR export returns the user data (Phase 028)', async () => {
    const data = await gdpr.exportUserData(userId);
    expect(Array.isArray(data.users)).toBe(true);
    expect(data.cases?.some((c: any) => c.id === caseId)).toBe(true);
    // Password material is redacted.
    expect(data.users[0].password).toBeUndefined();
  });

  it('GDPR erasure deletes the user data (Phase 028)', async () => {
    const { deleted } = await gdpr.deleteUserData(userId);
    expect(deleted.cases).toBeGreaterThanOrEqual(1);
    expect(deleted.users).toBe(1);

    // The other user's data is untouched.
    const remaining = await gdpr.exportUserData(otherUserId);
    expect(remaining.users.length).toBe(1);
  });
});
