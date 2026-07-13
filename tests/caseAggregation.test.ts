import { describe, it, expect } from 'vitest';
import { aggregateCases, generateAggregationReport } from '../caseAggregation';
import type { CaseCSVRow } from '../bulkCaseImport';

describe('Case Aggregation Service', () => {
  describe('aggregateCases', () => {
    it('should not merge cases with different categories', () => {
      const rows: CaseCSVRow[] = [
        {
          caseTitle: 'Divorce Settlement',
          description: 'Need help with divorce proceedings',
          category: 'Family Law',
          urgency: 'High',
        },
        {
          caseTitle: 'Divorce Settlement',
          description: 'Need help with divorce proceedings',
          category: 'Employment Law',
          urgency: 'High',
        },
      ];

      const result = aggregateCases(rows);

      expect(result.originalCount).toBe(2);
      expect(result.consolidatedCount).toBe(2);
      expect(result.duplicatesRemoved).toBe(0);
    });

    it('should merge exact duplicates (same title, category, urgency, similar description)', () => {
      const rows: CaseCSVRow[] = [
        {
          caseTitle: 'Divorce Settlement',
          description: 'Need help with divorce proceedings and asset division',
          category: 'Family Law',
          urgency: 'High',
        },
        {
          caseTitle: 'Divorce Settlement',
          description: 'Need help with divorce proceedings and asset division',
          category: 'Family Law',
          urgency: 'High',
        },
      ];

      const result = aggregateCases(rows);

      expect(result.originalCount).toBe(2);
      expect(result.consolidatedCount).toBe(1);
      expect(result.duplicatesRemoved).toBe(1);
      expect(result.aggregatedCases[0].rows).toEqual([2, 3]); // CSV rows 2 and 3
    });

    it('should merge fuzzy duplicates (similar title, same category, similar description)', () => {
      const rows: CaseCSVRow[] = [
        {
          caseTitle: 'Divorce Settlement',
          description: 'Need help with divorce proceedings and asset division',
          category: 'Family Law',
          urgency: 'High',
        },
        {
          caseTitle: 'Divorce Settlemnt', // Typo in title
          description: 'Need help with divorce proceedings and dividing assets',
          category: 'Family Law',
          urgency: 'Medium',
        },
      ];

      const result = aggregateCases(rows);

      expect(result.originalCount).toBe(2);
      expect(result.consolidatedCount).toBe(1);
      expect(result.duplicatesRemoved).toBe(1);
    });

    it('should merge descriptions when consolidating duplicates', () => {
      const rows: CaseCSVRow[] = [
        {
          caseTitle: 'Employment Dispute',
          description: 'Wrongful termination case with severance pay issues and unfair dismissal',
          category: 'Employment Law',
          urgency: 'Medium',
        },
        {
          caseTitle: 'Employment Dispute',
          description: 'Wrongful termination case with unfair dismissal and severance problems',
          category: 'Employment Law',
          urgency: 'High',
        },
      ];

      const result = aggregateCases(rows);

      expect(result.consolidatedCount).toBe(1);
      const merged = result.aggregatedCases[0];
      expect(merged.description).toContain('Wrongful termination');
      expect(merged.description).toContain('---'); // Separator
      expect(merged.urgency).toBe('High'); // Should use highest urgency
    });

    it('should use highest urgency when merging cases', () => {
      const rows: CaseCSVRow[] = [
        {
          caseTitle: 'Contract Dispute',
          description: 'Breach of contract issue',
          category: 'Contract Law',
          urgency: 'Low',
        },
        {
          caseTitle: 'Contract Dispute',
          description: 'Breach of contract issue',
          category: 'Contract Law',
          urgency: 'High',
        },
        {
          caseTitle: 'Contract Dispute',
          description: 'Breach of contract issue',
          category: 'Contract Law',
          urgency: 'Medium',
        },
      ];

      const result = aggregateCases(rows);

      expect(result.consolidatedCount).toBe(1);
      expect(result.aggregatedCases[0].urgency).toBe('High');
    });

    it('should combine tags from all merged cases', () => {
      const rows: CaseCSVRow[] = [
        {
          caseTitle: 'Property Dispute',
          description: 'Land ownership conflict',
          category: 'Property Law',
          urgency: 'Medium',
          tags: 'property,land',
        },
        {
          caseTitle: 'Property Dispute',
          description: 'Land ownership conflict',
          category: 'Property Law',
          urgency: 'Medium',
          tags: 'ownership,dispute',
        },
      ];

      const result = aggregateCases(rows);

      expect(result.consolidatedCount).toBe(1);
      const merged = result.aggregatedCases[0];
      expect(merged.tags).toContain('property');
      expect(merged.tags).toContain('land');
      expect(merged.tags).toContain('ownership');
      expect(merged.tags).toContain('dispute');
      expect(merged.tags.length).toBe(4); // All unique tags
    });

    it('should combine evidence URLs from all merged cases', () => {
      const rows: CaseCSVRow[] = [
        {
          caseTitle: 'Personal Injury',
          description: 'Car accident case',
          category: 'Personal Injury',
          urgency: 'High',
          evidenceUrls: 'https://example.com/photo1.jpg,https://example.com/photo2.jpg',
        },
        {
          caseTitle: 'Personal Injury',
          description: 'Car accident case',
          category: 'Personal Injury',
          urgency: 'High',
          evidenceUrls: 'https://example.com/photo3.jpg',
        },
      ];

      const result = aggregateCases(rows);

      expect(result.consolidatedCount).toBe(1);
      const merged = result.aggregatedCases[0];
      expect(merged.evidenceUrls).toContain('https://example.com/photo1.jpg');
      expect(merged.evidenceUrls).toContain('https://example.com/photo2.jpg');
      expect(merged.evidenceUrls).toContain('https://example.com/photo3.jpg');
      expect(merged.evidenceUrls.length).toBe(3);
    });

    it('should handle cases with no duplicates', () => {
      const rows: CaseCSVRow[] = [
        {
          caseTitle: 'Case A',
          description: 'Description A',
          category: 'Category A',
          urgency: 'High',
        },
        {
          caseTitle: 'Case B',
          description: 'Description B',
          category: 'Category B',
          urgency: 'Medium',
        },
        {
          caseTitle: 'Case C',
          description: 'Description C',
          category: 'Category C',
          urgency: 'Low',
        },
      ];

      const result = aggregateCases(rows);

      expect(result.originalCount).toBe(3);
      expect(result.consolidatedCount).toBe(3);
      expect(result.duplicatesRemoved).toBe(0);
    });

    it('should handle multiple groups of duplicates', () => {
      const rows: CaseCSVRow[] = [
        // Group 1: Divorce cases
        {
          caseTitle: 'Divorce Case',
          description: 'Divorce proceedings',
          category: 'Family Law',
          urgency: 'High',
        },
        {
          caseTitle: 'Divorce Case',
          description: 'Divorce proceedings',
          category: 'Family Law',
          urgency: 'High',
        },
        // Group 2: Employment cases
        {
          caseTitle: 'Employment Issue',
          description: 'Wrongful termination',
          category: 'Employment Law',
          urgency: 'Medium',
        },
        {
          caseTitle: 'Employment Issue',
          description: 'Wrongful termination',
          category: 'Employment Law',
          urgency: 'Medium',
        },
        // Unique case
        {
          caseTitle: 'Contract Dispute',
          description: 'Breach of contract',
          category: 'Contract Law',
          urgency: 'Low',
        },
      ];

      const result = aggregateCases(rows);

      expect(result.originalCount).toBe(5);
      expect(result.consolidatedCount).toBe(3); // 2 groups + 1 unique
      expect(result.duplicatesRemoved).toBe(2);
    });

    it('should normalize urgency levels', () => {
      const rows: CaseCSVRow[] = [
        {
          caseTitle: 'Test Case',
          description: 'Test description',
          category: 'Test Category',
          urgency: 'urgent', // lowercase variant
        },
        {
          caseTitle: 'Test Case',
          description: 'Test description',
          category: 'Test Category',
          urgency: 'High',
        },
      ];

      const result = aggregateCases(rows);

      expect(result.consolidatedCount).toBe(1);
      expect(result.aggregatedCases[0].urgency).toBe('High');
    });
  });

  describe('generateAggregationReport', () => {
    it('should generate report with aggregation statistics', () => {
      const rows: CaseCSVRow[] = [
        {
          caseTitle: 'Case 1',
          description: 'Description 1',
          category: 'Category 1',
          urgency: 'High',
        },
        {
          caseTitle: 'Case 1',
          description: 'Description 1',
          category: 'Category 1',
          urgency: 'High',
        },
        {
          caseTitle: 'Case 2',
          description: 'Description 2',
          category: 'Category 2',
          urgency: 'Medium',
        },
      ];

      const result = aggregateCases(rows);
      const report = generateAggregationReport(result);

      expect(report).toContain('Original cases: 3');
      expect(report).toContain('Consolidated cases: 2');
      expect(report).toContain('Duplicates removed: 1');
      expect(report).toContain('Reduction: 33.3%');
    });

    it('should include merged case details in report', () => {
      const rows: CaseCSVRow[] = [
        {
          caseTitle: 'Duplicate Case',
          description: 'Test',
          category: 'Test',
          urgency: 'High',
          tags: 'tag1,tag2',
        },
        {
          caseTitle: 'Duplicate Case',
          description: 'Test',
          category: 'Test',
          urgency: 'Medium',
          tags: 'tag3',
        },
      ];

      const result = aggregateCases(rows);
      const report = generateAggregationReport(result);

      expect(report).toContain('Merged Cases');
      expect(report).toContain('Duplicate Case');
      expect(report).toContain('Rows merged: 2, 3');
      expect(report).toContain('Final urgency: High');
    });
  });
});
