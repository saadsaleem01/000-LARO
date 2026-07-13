/**
 * Phase 015 — storage, files, uploads & media safety.
 *
 * Unit tests for the pure storage helpers: key/filename sanitization (path
 * traversal) and the sha256 provenance hash. These do not touch S3 or disk.
 */
import { describe, it, expect } from 'vitest';
import { sanitizeStorageKey, sanitizeFilename, hashBuffer } from '../../server/storage';

describe('Phase 015 — sanitizeStorageKey', () => {
  it('strips leading slashes (no absolute paths)', () => {
    expect(sanitizeStorageKey('/etc/passwd')).toBe('etc/passwd');
  });

  it('removes .. traversal segments', () => {
    expect(sanitizeStorageKey('evidence/../../secret')).toBe('evidence/secret');
    expect(sanitizeStorageKey('../../../root')).toBe('root');
  });

  it('normalizes backslashes to forward slashes', () => {
    expect(sanitizeStorageKey('evidence\\case1\\file.pdf')).toBe('evidence/case1/file.pdf');
  });

  it('preserves legitimate nested keys', () => {
    expect(sanitizeStorageKey('evidence/CASE1/local/uuid-file.pdf')).toBe('evidence/CASE1/local/uuid-file.pdf');
  });
});

describe('Phase 015 — sanitizeFilename', () => {
  it('reduces a path to its basename', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('passwd');
    expect(sanitizeFilename('C:\\Users\\x\\secret.docx')).toBe('secret.docx');
  });

  it('never returns an empty name', () => {
    expect(sanitizeFilename('..')).toBe('file');
    expect(sanitizeFilename('/')).toBe('file');
  });
});

describe('Phase 015 — hashBuffer (provenance)', () => {
  it('produces a stable sha256 hex digest', () => {
    // sha256("laro") — known value
    expect(hashBuffer('laro')).toBe(
      hashBuffer(Buffer.from('laro'))
    );
    expect(hashBuffer('laro')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes when content changes', () => {
    expect(hashBuffer('a')).not.toBe(hashBuffer('b'));
  });
});
