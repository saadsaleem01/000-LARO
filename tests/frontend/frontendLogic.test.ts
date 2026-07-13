/**
 * Phase 041 — frontend/component test suite (logic layer).
 *
 * The renderer's form/validation/classification LOGIC is testable without a DOM.
 * Full component-render tests need jsdom + @testing-library/react (not yet a
 * dependency) and are deferred — see docs/FRONTEND_ARCHITECTURE.md. These tests
 * cover the shared logic the UI relies on so it cannot silently regress.
 */
import { describe, it, expect } from 'vitest';
import { caseIntakeSchema, phoneSchema, urgencySchema } from '../../shared/validation';
import { parseLegalAreas, sanitizeLegalAreas } from '../../server/legalAreasValidator';

describe('Phase 041 — case intake form validation (shared with UI)', () => {
  it('accepts a minimal valid form and fills defaults', () => {
    const p = caseIntakeSchema.parse({
      clientName: 'Jane Doe', clientEmail: 'jane@example.com', caseType: 'Employment', urgency: 'High',
    });
    expect(p.clientPhone).toBe('');
    expect(p.caseSummary).toBe('');
  });

  it('phone schema accepts empty and plausible numbers, rejects junk', () => {
    expect(phoneSchema.safeParse('').success).toBe(true);
    expect(phoneSchema.safeParse('+31 20 123 4567').success).toBe(true);
    expect(phoneSchema.safeParse('abc').success).toBe(false);
  });

  it('urgency is a strict enum', () => {
    expect(urgencySchema.safeParse('Medium').success).toBe(true);
    expect(urgencySchema.safeParse('Critical').success).toBe(false);
  });
});

describe('Phase 041 — legal-areas parsing used by the UI', () => {
  it('round-trips a fully-valid area list', () => {
    const stored = sanitizeLegalAreas(['Employment Law', 'Family Law']);
    expect(parseLegalAreas(stored)).toEqual(['Employment Law', 'Family Law']);
  });

  it('sanitize is strict: any invalid entry yields an empty list', () => {
    // The shared validator rejects the whole array if an element is not a
    // canonical legal area (Zod enum), returning "[]".
    expect(sanitizeLegalAreas(['Employment Law', 'Bogus Area'])).toBe('[]');
  });

  it('parse handles null/garbage safely', () => {
    expect(parseLegalAreas(null)).toEqual([]);
    expect(parseLegalAreas('{not json')).toEqual([]);
  });
});
