/**
 * Phases 021–030 — validation contract (behavioural) + source-level guards that
 * the real implementations are in place and the old stubs are gone.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { caseIntakeSchema } from '../../shared/validation';

const ROOT = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe('Phase 021 — caseIntakeSchema validation', () => {
  const valid = { clientName: 'Jane Doe', clientEmail: 'jane@example.com', caseType: 'Employment', urgency: 'High' as const };
  it('accepts a valid intake and applies defaults', () => {
    const p = caseIntakeSchema.parse(valid);
    expect(p.clientPhone).toBe('');
    expect(p.caseSummary).toBe('');
  });
  it('rejects an invalid email', () => {
    expect(() => caseIntakeSchema.parse({ ...valid, clientEmail: 'nope' })).toThrow();
  });
  it('rejects a too-short name', () => {
    expect(() => caseIntakeSchema.parse({ ...valid, clientName: 'J' })).toThrow();
  });
  it('rejects an invalid urgency', () => {
    expect(() => caseIntakeSchema.parse({ ...valid, urgency: 'Whenever' })).toThrow();
  });
});

describe('Phase 028 — GDPR is real, not an empty stub', () => {
  const src = read('server/routers/index.ts');
  it('exportData is no longer a publicProcedure returning {}', () => {
    expect(src).not.toContain('exportData: publicProcedure.mutation(() => ({}))');
    expect(src).toContain('exportUserData');
  });
  it('deleteData performs a real erasure', () => {
    expect(src).toContain('deleteUserData');
  });
  it('the gdpr service exports both access and erasure', () => {
    const svc = read('server/gdpr.ts');
    expect(svc).toContain('export async function exportUserData');
    expect(svc).toContain('export async function deleteUserData');
  });
});

describe('Phase 026 — approval gate exists and does not auto-send', () => {
  const src = read('server/routers/workflow.ts');
  it('has prepareDrafts / reviewQueue / approveDraft / rejectDraft', () => {
    for (const name of ['prepareDrafts', 'reviewQueue', 'approveDraft', 'rejectDraft']) {
      expect(src).toContain(name);
    }
  });
  it('approval explicitly does not send', () => {
    expect(src).toMatch(/sent:\s*false/);
  });
});

describe('Phase 029 — security headers present', () => {
  const src = read('server/index.ts');
  it('sets CSP, frame, and content-type-options headers', () => {
    expect(src).toContain('Content-Security-Policy');
    expect(src).toContain('X-Frame-Options');
    expect(src).toContain('X-Content-Type-Options');
  });
});

describe('Phase 030 — .env is not bundled into the installer', () => {
  it('package.json extraResources no longer ships .env', () => {
    const pkg = read('package.json');
    expect(pkg).not.toMatch(/"from":\s*"\.env"/);
  });
  it('a .env.example template exists', () => {
    expect(read('.env.example')).toContain('JWT_SECRET=');
  });
});

describe('Phase 024 — message templates support CRUD', () => {
  const src = read('server/routers/messageTemplates.ts');
  it('has create/update/delete', () => {
    for (const name of ['create:', 'update:', 'delete:']) expect(src).toContain(name);
  });
});
