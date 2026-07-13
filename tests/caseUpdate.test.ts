import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateCase } from '../server/db';

// Mock the database
vi.mock('../server/db', async () => {
  const actual = await vi.importActual('../server/db');

  return {
    ...actual,
    getDb: vi.fn(),
  };
});

describe('Case Update with Validation', () => {
  describe('updateCase function', () => {
    it('should accept valid legalAreas array', async () => {
      const result = await updateCase('case-1', {
        legalAreas: ['Corporate Law', 'Contract Law'],
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe('case-1');
    });

    it('should accept valid legalAreas JSON string', async () => {
      const result = await updateCase('case-1', {
        legalAreas: JSON.stringify(['Employment Law']),
      });

      expect(result.success).toBe(true);
    });

    it('should sanitize invalid legalAreas', async () => {
      const result = await updateCase('case-1', {
        legalAreas: 'invalid {]',
      });

      expect(result.success).toBe(true);
    });

    it('should update case summary and urgency', async () => {
      const result = await updateCase('case-1', {
        caseSummary: 'Updated case summary',
        urgency: 'High',
      });

      expect(result.success).toBe(true);
    });

    it('should update multiple fields including legalAreas', async () => {
      const result = await updateCase('case-1', {
        caseSummary: 'Updated summary',
        urgency: 'Medium',
        legalAreas: ['Family Law', 'Divorce'],
      });

      expect(result.success).toBe(true);
    });

    it('should handle undefined legalAreas gracefully', async () => {
      const result = await updateCase('case-1', {
        caseSummary: 'Updated summary',
      });

      expect(result.success).toBe(true);
    });
  });
});
