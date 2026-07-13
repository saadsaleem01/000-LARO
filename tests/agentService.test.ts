import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as agentService from '../agentService';
import { getDb } from '../../db';

// Mock database
vi.mock('../../db', () => ({
  getDb: vi.fn(),
}));

// Mock JWT
vi.mock('jsonwebtoken', () => ({
  sign: vi.fn(() => 'mock-jwt-token'),
  verify: vi.fn((token: string) => {
    if (token === 'valid-token') {
      return { deviceId: 'device-123', userId: 'user-123', type: 'agent' };
    }
    throw new Error('Invalid token');
  }),
}));

describe('Agent Service', () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
    };

    (getDb as any).mockResolvedValue(mockDb);
  });

  describe('verifyAgentToken', () => {
    it('should verify valid agent token', () => {
      const result = agentService.verifyAgentToken('valid-token');

      expect(result).toEqual({
        deviceId: 'device-123',
        userId: 'user-123',
      });
    });

    it('should return null for invalid token', () => {
      const result = agentService.verifyAgentToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('registerAgentDevice', () => {
    it('should register a new device', async () => {
      const mockDevice = {
        id: 'device-123',
        userId: 'user-123',
        deviceName: 'Test Laptop',
        platform: 'windows',
        agentVersion: '1.0.0',
        token: 'mock-jwt-token',
        status: 'active',
      };

      mockDb.returning.mockResolvedValue([mockDevice]);

      const result = await agentService.registerAgentDevice(
        'user-123',
        'Test Laptop',
        'windows',
        '1.0.0'
      );

      // registerAgentDevice returns { deviceId, token }
      expect(result).toHaveProperty('deviceId');
      expect(result).toHaveProperty('token');
    });
  });

  describe('getAgentDevice', () => {
    it('should get device by ID', async () => {
      const mockDevice = {
        id: 'device-123',
        deviceName: 'Test Laptop',
        status: 'active',
      };

      mockDb.limit.mockResolvedValue([mockDevice]);

      const result = await agentService.getAgentDevice('device-123');

      expect(result).toEqual(mockDevice);
    });

    it('should return null for non-existent device', async () => {
      mockDb.limit.mockResolvedValue([]);

      const result = await agentService.getAgentDevice('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('listUserAgentDevices', () => {
    it('should list all devices for a user', async () => {
      const mockDevices = [
        { id: 'device-1', deviceName: 'Laptop', status: 'active' },
        { id: 'device-2', deviceName: 'Desktop', status: 'inactive' },
      ];

      mockDb.orderBy.mockResolvedValue(mockDevices);

      const result = await agentService.listUserAgentDevices('user-123');

      expect(result).toEqual(mockDevices);
    });
  });

  describe('updateDeviceLastSeen', () => {
    it('should update device last seen timestamp', async () => {
      mockDb.returning.mockResolvedValue([{ id: 'device-123' }]);

      await agentService.updateDeviceLastSeen('device-123');

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          lastSeenAt: expect.any(Date),
        })
      );
    });
  });

  describe('revokeAgentDevice', () => {
    it('should revoke device access', async () => {
      mockDb.returning.mockResolvedValue([{ id: 'device-123' }]);

      await agentService.revokeAgentDevice('device-123');

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'revoked',
        })
      );
    });
  });

  describe('createAgentScan', () => {
    it('should create a new scan', async () => {
      const mockScan = {
        id: 'scan-123',
        deviceId: 'device-123',
        caseId: 'case-123',
        status: 'scanning',
        totalFiles: 0,
      };

      mockDb.returning.mockResolvedValue([mockScan]);

      const result = await agentService.createAgentScan(
        'device-123',
        'case-123',
        true,
        []
      );

      // createAgentScan returns scanId string, not object
      expect(typeof result).toBe('string');
      expect(result).toBeTruthy();
    });
  });

  describe('getAgentScan', () => {
    it('should get scan by ID', async () => {
      const mockScan = {
        id: 'scan-123',
        status: 'uploading',
        totalFiles: 100,
      };

      mockDb.limit.mockResolvedValue([mockScan]);

      const result = await agentService.getAgentScan('scan-123');

      expect(result).toEqual(mockScan);
    });

    it('should return null for non-existent scan', async () => {
      mockDb.limit.mockResolvedValue([]);

      const result = await agentService.getAgentScan('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('updateScanProgress', () => {
    it('should update scan progress', async () => {
      mockDb.returning.mockResolvedValue([{ id: 'scan-123' }]);

      // updateScanProgress takes individual parameters, not object
      await agentService.updateScanProgress(
        'scan-123',
        100, // totalFiles
        50,  // uploadedFiles
        0    // failedFiles
      );

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalled();
    });
  });

  describe('updateScanStatus', () => {
    it('should update scan status', async () => {
      mockDb.returning.mockResolvedValue([{ id: 'scan-123' }]);

      await agentService.updateScanStatus('scan-123', 'completed');

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
        })
      );
    });
  });

  describe('addAgentFile', () => {
    it('should add a file to scan', async () => {
      const mockFile = {
        id: 'file-123',
        scanId: 'scan-123',
        filePath: '/path/to/file.pdf',
        fileName: 'file.pdf',
        fileSize: 1024,
      };

      mockDb.returning.mockResolvedValue([mockFile]);

      const result = await agentService.addAgentFile(
        'scan-123',
        '/path/to/file.pdf',
        'file.pdf',
        1024,
        'application/pdf',
        new Date()
      );

      // addAgentFile returns fileId string, not object
      expect(typeof result).toBe('string');
      expect(result).toBeTruthy();
    });
  });

  describe('updateFileUploadStatus', () => {
    it('should update file upload status to completed', async () => {
      mockDb.returning.mockResolvedValue([{ id: 'file-123' }]);

      await agentService.updateFileUploadStatus(
        'file-123',
        'completed',
        100,
        's3-key',
        'https://s3.example.com/file.pdf'
      );

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          uploadStatus: 'completed',
          s3Key: 's3-key',
          s3Url: 'https://s3.example.com/file.pdf',
        })
      );
    });

    it('should update file upload status to failed', async () => {
      mockDb.returning.mockResolvedValue([{ id: 'file-123' }]);

      await agentService.updateFileUploadStatus(
        'file-123',
        'failed',
        undefined,
        undefined,
        undefined,
        'Network error'
      );

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          uploadStatus: 'failed',
          errorMessage: 'Network error',
        })
      );
    });
  });

  describe('getScanFiles', () => {
    it('should get all files for a scan', async () => {
      const mockFiles = [
        { id: 'file-1', fileName: 'doc1.pdf', uploadStatus: 'completed' },
        { id: 'file-2', fileName: 'doc2.pdf', uploadStatus: 'pending' },
      ];

      mockDb.orderBy.mockResolvedValue(mockFiles);

      const result = await agentService.getScanFiles('scan-123');

      expect(result).toEqual(mockFiles);
    });
  });

  describe('getPendingUploadFiles', () => {
    it('should get pending files with limit', async () => {
      const mockFiles = [
        { id: 'file-1', fileName: 'doc1.pdf', uploadStatus: 'pending' },
        { id: 'file-2', fileName: 'doc2.pdf', uploadStatus: 'pending' },
      ];

      mockDb.limit.mockResolvedValue(mockFiles);

      const result = await agentService.getPendingUploadFiles('scan-123', 10);

      expect(result).toEqual(mockFiles);
      expect(mockDb.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('listCaseScans', () => {
    it('should list all scans for a case', async () => {
      const mockScans = [
        { id: 'scan-1', status: 'completed' },
        { id: 'scan-2', status: 'uploading' },
      ];

      mockDb.orderBy.mockResolvedValue(mockScans);

      const result = await agentService.listCaseScans('case-123');

      expect(result).toEqual(mockScans);
    });
  });

  describe('listDeviceScans', () => {
    it('should list all scans for a device', async () => {
      const mockScans = [
        { id: 'scan-1', status: 'completed' },
        { id: 'scan-2', status: 'uploading' },
      ];

      mockDb.orderBy.mockResolvedValue(mockScans);

      const result = await agentService.listDeviceScans('device-123');

      expect(result).toEqual(mockScans);
    });
  });
});
