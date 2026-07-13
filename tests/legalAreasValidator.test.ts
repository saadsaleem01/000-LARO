import { describe, it, expect } from 'vitest';
import {
  validateAndNormalizeLegalAreas,
  parseLegalAreas,
  sanitizeLegalAreas,
  VALID_LEGAL_AREAS,
} from '../legalAreasValidator';

describe('Legal Areas Validator', () => {
  describe('validateAndNormalizeLegalAreas', () => {
    it('should accept valid JSON array of legal areas', () => {
      const input = JSON.stringify(['Corporate Law', 'Contract Law']);
      const result = validateAndNormalizeLegalAreas(input);
      
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(JSON.parse(result.data)).toEqual(['Corporate Law', 'Contract Law']);
      }
    });

    it('should accept array input directly', () => {
      const input = ['Employment Law', 'Labor Law'];
      const result = validateAndNormalizeLegalAreas(input);
      
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(JSON.parse(result.data)).toEqual(['Employment Law', 'Labor Law']);
      }
    });

    it('should wrap single string in array', () => {
      const input = 'Real Estate';
      const result = validateAndNormalizeLegalAreas(input);
      
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(JSON.parse(result.data)).toEqual(['Real Estate']);
      }
    });

    it('should reject empty array', () => {
      const input: string[] = [];
      const result = validateAndNormalizeLegalAreas(input);
      
      expect(result.valid).toBe(false);
    });

    it('should reject invalid legal area', () => {
      const input = ['Invalid Area', 'Corporate Law'];
      const result = validateAndNormalizeLegalAreas(input);
      
      expect(result.valid).toBe(false);
    });

    it('should reject more than 10 legal areas', () => {
      const input = Array(11).fill('Corporate Law');
      const result = validateAndNormalizeLegalAreas(input);
      
      expect(result.valid).toBe(false);
    });

    it('should reject null or undefined', () => {
      const resultNull = validateAndNormalizeLegalAreas(null);
      const resultUndefined = validateAndNormalizeLegalAreas(undefined);
      
      expect(resultNull.valid).toBe(false);
      expect(resultUndefined.valid).toBe(false);
    });

    it('should reject invalid JSON string', () => {
      const input = 'not valid json {]';
      const result = validateAndNormalizeLegalAreas(input);
      
      // Should treat as single string and wrap in array
      // If the string is not a valid legal area, it should fail validation
      expect(result.valid).toBe(false);
    });
  });

  describe('parseLegalAreas', () => {
    it('should parse valid JSON array', () => {
      const input = JSON.stringify(['Corporate Law', 'Contract Law']);
      const result = parseLegalAreas(input);
      
      expect(result).toEqual(['Corporate Law', 'Contract Law']);
    });

    it('should return empty array for invalid JSON', () => {
      const input = 'not valid json {]';
      const result = parseLegalAreas(input);
      
      expect(result).toEqual([]);
    });

    it('should return empty array for null', () => {
      const result = parseLegalAreas(null);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined', () => {
      const result = parseLegalAreas(undefined);
      expect(result).toEqual([]);
    });

    it('should filter out invalid legal areas', () => {
      const input = JSON.stringify(['Corporate Law', 'Invalid Area', 'Contract Law']);
      const result = parseLegalAreas(input);
      
      expect(result).toEqual(['Corporate Law', 'Contract Law']);
    });
  });

  describe('sanitizeLegalAreas', () => {
    it('should return valid JSON for valid input', () => {
      const input = ['Corporate Law', 'Contract Law'];
      const result = sanitizeLegalAreas(input);
      
      expect(() => JSON.parse(result)).not.toThrow();
      expect(JSON.parse(result)).toEqual(['Corporate Law', 'Contract Law']);
    });

    it('should return empty array JSON for invalid input', () => {
      const input = 'invalid data {]';
      const result = sanitizeLegalAreas(input);
      
      expect(JSON.parse(result)).toEqual([]);
    });

    it('should handle null gracefully', () => {
      const result = sanitizeLegalAreas(null);
      
      expect(JSON.parse(result)).toEqual([]);
    });

    it('should always return valid JSON', () => {
      const inputs = [
        'Corporate Law',
        ['Employment Law'],
        JSON.stringify(['Contract Law']),
        'invalid {]',
        null,
        undefined,
        {},
      ];

      for (const input of inputs) {
        const result = sanitizeLegalAreas(input);
        expect(() => JSON.parse(result)).not.toThrow();
      }
    });
  });

  describe('Valid Legal Areas List', () => {
    it('should contain expected legal areas', () => {
      expect(VALID_LEGAL_AREAS).toContain('Corporate Law');
      expect(VALID_LEGAL_AREAS).toContain('Employment Law');
      expect(VALID_LEGAL_AREAS).toContain('Family Law');
      expect(VALID_LEGAL_AREAS).toContain('Other');
    });

    it('should have reasonable number of areas', () => {
      expect(VALID_LEGAL_AREAS.length).toBeGreaterThan(10);
      expect(VALID_LEGAL_AREAS.length).toBeLessThan(50);
    });
  });
});
