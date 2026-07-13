/**
 * Phase 011 / 014 — no fake success / no mock production behavior
 * (source-level anti-regression guards).
 *
 * A full behavioural test needs a DB harness (Phase 040). Meanwhile these guards
 * assert against the actual source that the previously-fabricated behaviours are
 * gone and the real ones are wired.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe('Phase 011 — matching uses the real engine', () => {
  const src = read('server/routers/matching.ts');
  it('calls findMatchingLawyers', () => {
    expect(src).toContain('findMatchingLawyers');
  });
  it('no longer fabricates distances with Math.random', () => {
    expect(src).not.toContain('Math.random');
  });
  it('no longer hardcodes matchScore: 90 - index * 5', () => {
    expect(src).not.toMatch(/90\s*-\s*index\s*\*\s*5/);
  });
});

describe('Phase 014 — dashboard is not fabricated', () => {
  const src = read('server/routers/dashboard.ts');
  it('enhancedStats no longer returns the hardcoded {15,85,92,78}', () => {
    expect(src).not.toContain('current: 15');
    expect(src).not.toContain('current: 92');
  });
  it('activityFeed no longer contains the mocked "Mr. Janssen" entry', () => {
    expect(src).not.toContain('Mr. Janssen');
  });
});

describe('Phase 014 — OCR does not fabricate document text', () => {
  const src = read('server/routers/index.ts');
  it('removed the hardcoded "[OCR Extraction Successful]" response', () => {
    expect(src).not.toContain('[OCR Extraction Successful]');
    expect(src).not.toContain('arbeidsovereenkomst zonder de vereiste');
  });
  it('extractText throws NOT_IMPLEMENTED instead', () => {
    expect(src).toMatch(/OCR text extraction is not implemented/);
  });
});

describe('Phase 014 — case outreach progress is not hardcoded', () => {
  const src = read('server/routers/cases.ts');
  it('removed the fabricated {count:5, contacted:2, responded:1}', () => {
    expect(src).not.toMatch(/count:\s*5,\s*\n?\s*contacted:\s*2/);
  });
});

describe('Phase 012 — provider connectors are honest', () => {
  const src = read('server/routers/enhancedConnections.ts');
  it('no longer returns a blanket dummy auth URL', () => {
    expect(src).not.toContain('Return a dummy auth URL');
  });
  it('reports availability based on real configuration', () => {
    expect(src).toContain('providerAvailability');
  });
});

describe('Phase 013 — generated legal documents carry a disclaimer', () => {
  it('gapAnalysis.generateDocument appends LEGAL_DISCLAIMER', () => {
    expect(read('server/routers/gapAnalysis.ts')).toContain('LEGAL_DISCLAIMER');
  });
});
