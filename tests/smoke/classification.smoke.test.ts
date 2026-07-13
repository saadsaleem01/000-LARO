/**
 * Phase 025 — deterministic legal-area classification (behavioural).
 * Pure functions, no DB/API. These are real assertions on the classifier output.
 */
import { describe, it, expect } from 'vitest';
import { classifyLegalAreas } from '../../server/classification';

describe('Phase 025 — classifyLegalAreas', () => {
  it('classifies a Dutch employment case', () => {
    const r = classifyLegalAreas('werknemer ontslag zonder opzegtermijn door werkgever', 'Employment');
    expect(r.areas).toContain('Employment Law');
    expect(r.method).toBe('deterministic');
  });

  it('classifies a family-law case (echtscheiding/alimentatie)', () => {
    const r = classifyLegalAreas('echtscheiding met alimentatie en voogdij');
    expect(r.areas).toContain('Family Law');
    expect(r.confidence).toBe('high'); // 3 keyword hits
  });

  it('classifies an English real-estate case', () => {
    const r = classifyLegalAreas('dispute with my landlord about the lease of the property');
    expect(r.areas).toContain('Real Estate');
    expect(r.areas).toContain('Litigation');
  });

  it('falls back to Other when nothing matches', () => {
    const r = classifyLegalAreas('lorem ipsum something unrelated');
    expect(r.areas).toEqual(['Other']);
    expect(r.confidence).toBe('low');
  });

  it('is deterministic — same input yields the same output', () => {
    const a = classifyLegalAreas('belasting en btw geschil');
    const b = classifyLegalAreas('belasting en btw geschil');
    expect(a.areas).toEqual(b.areas);
  });

  it('maps the caseType when the description has no signal', () => {
    const r = classifyLegalAreas('geen duidelijke termen hier', 'Criminal Law');
    expect(r.areas).toContain('Criminal Law');
  });
});
