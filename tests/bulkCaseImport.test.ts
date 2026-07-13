import { describe, it, expect, beforeAll } from 'vitest';
import {
  parseCaseCSV,
  createBulkImportJob,
  processBulkImport,
  getBulkImportJob,
} from '../bulkCaseImport';

describe('Bulk Case Import Service', () => {
  describe('parseCaseCSV', () => {
    it('should parse valid CSV with all required columns', async () => {
      const csvContent = `caseTitle,description,category,urgency
"Divorce Settlement","Need help with divorce proceedings","Family Law","High"
"Employment Dispute","Wrongful termination case","Employment Law","Medium"`;

      const result = await parseCaseCSV(csvContent);

      expect(result.valid).toBe(true);
      expect(result.rows).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.rows[0]).toMatchObject({
        caseTitle: 'Divorce Settlement',
        description: 'Need help with divorce proceedings',
        category: 'Family Law',
        urgency: 'High',
      });
    });

    it('should parse CSV with optional columns', async () => {
      const csvContent = `caseTitle,description,category,urgency,evidenceUrls,tags
"Contract Review","Review lease agreement","Contract Law","Low","https://example.com/doc.pdf","contract,lease"`;

      const result = await parseCaseCSV(csvContent);

      expect(result.valid).toBe(true);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].evidenceUrls).toBe('https://example.com/doc.pdf');
      expect(result.rows[0].tags).toBe('contract,lease');
    });

    it('should reject CSV with missing required columns', async () => {
      const csvContent = `caseTitle,description
"Divorce Settlement","Need help with divorce proceedings"`;

      const result = await parseCaseCSV(csvContent);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Missing required columns');
    });

    it('should reject rows with missing required fields', async () => {
      const csvContent = `caseTitle,description,category,urgency
"Divorce Settlement","","Family Law","High"
"","Employment dispute","Employment Law","Medium"`;

      const result = await parseCaseCSV(csvContent);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Missing description'))).toBe(true);
      expect(result.errors.some(e => e.includes('Missing case title'))).toBe(true);
    });

    it('should skip empty lines', async () => {
      const csvContent = `caseTitle,description,category,urgency
"Divorce Settlement","Need help","Family Law","High"

"Employment Dispute","Wrongful termination","Employment Law","Medium"`;

      const result = await parseCaseCSV(csvContent);

      expect(result.valid).toBe(true);
      expect(result.rows).toHaveLength(2);
    });

    it('should handle CSV with extra whitespace', async () => {
      const csvContent = `caseTitle,description,category,urgency
"  Divorce Settlement  ","  Need help  ","  Family Law  ","  High  "`;

      const result = await parseCaseCSV(csvContent);

      expect(result.valid).toBe(true);
      expect(result.rows[0].caseTitle.trim()).toBe('Divorce Settlement');
    });
  });

  describe('createBulkImportJob', () => {
    it('should create a new import job', async () => {
      const jobId = await createBulkImportJob('test-user-1', 'test.csv', 10);

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');

      // Verify job was created
      const job = await getBulkImportJob(jobId);
      expect(job).toBeDefined();
      expect(job?.userId).toBe('test-user-1');
      expect(job?.filename).toBe('test.csv');
      expect(job?.status).toBe('pending');
      expect(job?.totalRows).toBe('10');
    });
  });

  describe('processBulkImport', () => {
    it('should process valid CSV rows and create cases', async () => {
      const jobId = await createBulkImportJob('test-user-1', 'test.csv', 2);

      const rows = [
        {
          caseTitle: 'Test Case 1',
          description: 'Test description 1',
          category: 'Family Law',
          urgency: 'High',
        },
        {
          caseTitle: 'Test Case 2',
          description: 'Test description 2',
          category: 'Employment Law',
          urgency: 'Medium',
        },
      ];

      const result = await processBulkImport(jobId, 'test-user-1', rows);

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Verify job status was updated
      const job = await getBulkImportJob(jobId);
      expect(job?.status).toBe('completed');
      expect(job?.processedRows).toBe('2');
    });

    it('should handle errors gracefully and continue processing', async () => {
      const jobId = await createBulkImportJob('test-user-1', 'test.csv', 3);

      const rows = [
        {
          caseTitle: 'Valid Case',
          description: 'Valid description',
          category: 'Family Law',
          urgency: 'High',
        },
        {
          caseTitle: '', // Invalid - empty title
          description: 'Description',
          category: 'Invalid Category', // Will cause error
          urgency: 'InvalidUrgency', // Will cause error
        },
        {
          caseTitle: 'Another Valid Case',
          description: 'Another description',
          category: 'Contract Law',
          urgency: 'Low',
        },
      ];

      const result = await processBulkImport(jobId, 'test-user-1', rows);

      // Should have at least 1 success (the valid cases)
      expect(result.successCount).toBeGreaterThan(0);
      // Should have at least 1 failure (the invalid case)
      expect(result.failureCount).toBeGreaterThan(0);
      // Total should equal input
      expect(result.successCount + result.failureCount).toBe(rows.length);
    });

    it('should record error details for failed rows', async () => {
      const jobId = await createBulkImportJob('test-user-1', 'test.csv', 1);

      const rows = [
        {
          caseTitle: '',
          description: 'Description',
          category: 'InvalidCategory',
          urgency: 'InvalidUrgency',
        },
      ];

      const result = await processBulkImport(jobId, 'test-user-1', rows);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toHaveProperty('row');
      expect(result.errors[0]).toHaveProperty('error');
    });
  });

  describe('getBulkImportJob', () => {
    it('should retrieve existing job', async () => {
      const jobId = await createBulkImportJob('test-user-1', 'retrieve-test.csv', 5);

      const job = await getBulkImportJob(jobId);

      expect(job).toBeDefined();
      expect(job?.id).toBe(jobId);
      expect(job?.filename).toBe('retrieve-test.csv');
    });

    it('should return null for non-existent job', async () => {
      const job = await getBulkImportJob('non-existent-id');

      expect(job).toBeNull();
    });
  });
});
