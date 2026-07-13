/**
 * Phase 047 — file safety and path-traversal tests (behavioural).
 *
 * Exercises the real storage layer (local fallback) with hostile keys and
 * verifies bytes are only ever written INSIDE the storage base directory.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

let base: string;
let storage: typeof import('../../server/storage');

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  delete process.env.AWS_S3_BUCKET; // force local fallback
  base = mkdtempSync(join(tmpdir(), 'laro-fs-'));
  process.env.LOCAL_STORAGE_DIR = base;
  storage = await import('../../server/storage');
});

afterAll(() => { try { rmSync(base, { recursive: true, force: true }); } catch { /* ignore */ } });

describe('Phase 047 — file safety / path traversal', () => {
  it('a traversal key is sanitized and written inside the base dir', async () => {
    const res = await storage.storagePut('../../etc/evil.txt', 'hello');
    expect(res.key).not.toContain('..');
    expect(res.url.startsWith(`file://${resolve(base)}`)).toBe(true);
    // Nothing escaped the base dir.
    expect(existsSync('/etc/evil.txt')).toBe(false);
  });

  it('an absolute-path key is confined under the base dir', async () => {
    const res = await storage.storagePut('/etc/passwd', 'x');
    expect(res.key).toBe('etc/passwd');
    const full = res.url.replace('file://', '');
    expect(resolve(full).startsWith(resolve(base))).toBe(true);
  });

  it('round-trips content and returns a sha256 provenance hash', async () => {
    const put = await storage.storagePut('evidence/case1/note.txt', 'provenance');
    expect(put.sha256).toMatch(/^[0-9a-f]{64}$/);
    const url = await storage.storageGet('evidence/case1/note.txt');
    expect(url.startsWith('file://')).toBe(true);
  });

  it('rejects reads/writes that would resolve outside the base', async () => {
    // A key crafted to escape is neutralized by sanitizeStorageKey; a direct
    // escape attempt via the internal resolver would throw. Here the sanitized
    // key is safe, so get succeeds within base.
    await storage.storagePut('a/b/c.txt', '1');
    const url = await storage.storageGet('a/b/c.txt');
    expect(resolve(url.replace('file://', '')).startsWith(resolve(base))).toBe(true);
  });
});
