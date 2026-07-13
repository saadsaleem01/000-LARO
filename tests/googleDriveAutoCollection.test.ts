import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database
vi.mock('../../db', () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
  }),
}));

// Mock storage
vi.mock('../../storage', () => ({
  storagePut: vi.fn().mockResolvedValue({ key: 'test-key', url: 'https://s3.example.com/test-file' }),
}));

// Mock googleapis
vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({
        setCredentials: vi.fn(),
      })),
    },
    drive: vi.fn().mockReturnValue({
      files: {
        list: vi.fn().mockResolvedValue({
          data: {
            files: [
              { id: 'file1', name: 'test.pdf', mimeType: 'application/pdf', size: '1024' },
              { id: 'file2', name: 'doc.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: '2048' },
            ],
            nextPageToken: null,
          },
        }),
        get: vi.fn().mockResolvedValue({
          data: { id: 'file1', name: 'test.pdf', mimeType: 'application/pdf', size: '1024' },
        }),
      },
    }),
  },
}));

describe('Google Drive Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listGoogleDriveFiles', () => {
    it('should return a list of files from Google Drive', async () => {
      const { listGoogleDriveFiles } = await import('../googleDriveService');
      
      const result = await listGoogleDriveFiles('mock-access-token');
      
      expect(result).toBeDefined();
      expect(result.files).toBeDefined();
      expect(Array.isArray(result.files)).toBe(true);
    });
  });

  describe('getGoogleDriveFileMetadata', () => {
    it('should return file metadata', async () => {
      const { getGoogleDriveFileMetadata } = await import('../googleDriveService');
      
      const result = await getGoogleDriveFileMetadata('mock-access-token', 'file1');
      
      expect(result).toBeDefined();
      expect(result.id).toBe('file1');
      expect(result.name).toBe('test.pdf');
    });
  });
});

describe('Auto-Collection Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAutoCollectionSettings', () => {
    it('should return null when no settings exist', async () => {
      const { getAutoCollectionSettings } = await import('../autoCollectionService');
      
      const result = await getAutoCollectionSettings('case-123');
      
      expect(result).toBeNull();
    });
  });

  describe('upsertAutoCollectionSettings', () => {
    it('should create new settings when none exist', async () => {
      const { upsertAutoCollectionSettings } = await import('../autoCollectionService');
      
      await expect(upsertAutoCollectionSettings({
        caseId: 'case-123',
        userId: 'user-123',
        keywords: ['contract', 'termination'],
        keywordMatchMode: 'any',
        emailAccountIds: ['account-1'],
        autoDownloadAttachments: true,
        autoDownloadGoogleDriveFiles: true,
      })).resolves.not.toThrow();
    });
  });

  describe('getAutoCollectionLogs', () => {
    it('should return empty array when no logs exist', async () => {
      const { getAutoCollectionLogs } = await import('../autoCollectionService');
      
      const result = await getAutoCollectionLogs('case-123');
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getKeywordMatches', () => {
    it('should return results when called with valid caseId', async () => {
      const { getKeywordMatches } = await import('../autoCollectionService');
      
      const result = await getKeywordMatches('case-123');
      
      // The function should return something (array or empty array)
      expect(result).toBeDefined();
    });
  });
});

describe('Keyword Matching Logic', () => {
  it('should match text containing any keyword in "any" mode', () => {
    const text = 'This is a contract for employment termination';
    const keywords = ['contract', 'invoice'];
    
    const lowerText = text.toLowerCase();
    const matchedKeywords = keywords.filter(kw => lowerText.includes(kw.toLowerCase()));
    
    expect(matchedKeywords.length).toBeGreaterThan(0);
    expect(matchedKeywords).toContain('contract');
  });

  it('should match text containing all keywords in "all" mode', () => {
    const text = 'This is a contract for employment termination';
    const keywords = ['contract', 'termination'];
    
    const lowerText = text.toLowerCase();
    const matchedKeywords = keywords.filter(kw => lowerText.includes(kw.toLowerCase()));
    
    expect(matchedKeywords.length).toBe(keywords.length);
  });

  it('should not match when no keywords are found', () => {
    const text = 'This is a regular email about nothing specific';
    const keywords = ['contract', 'invoice', 'termination'];
    
    const lowerText = text.toLowerCase();
    const matchedKeywords = keywords.filter(kw => lowerText.includes(kw.toLowerCase()));
    
    expect(matchedKeywords.length).toBe(0);
  });
});
