import { describe, it, expect, vi, beforeEach } from 'vitest';
import { emailAccountsRouter } from '../emailAccounts';
import * as oauth2 from '../../services/oauth2';

// Mock the oauth2 service
vi.mock('../../services/oauth2', () => ({
  getAuthorizationUrl: vi.fn(),
  exchangeCodeForTokens: vi.fn(),
  getAccountInfo: vi.fn(),
  getValidAccessToken: vi.fn(),
  refreshAccessToken: vi.fn(),
}));

// Mock the database
vi.mock('../../db', () => ({
  getDb: vi.fn(async () => ({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  })),
}));

describe('Email Accounts Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get authorization URL for Gmail', async () => {
    const mockUrl = 'https://accounts.google.com/o/oauth2/v2/auth?...';
    vi.mocked(oauth2.getAuthorizationUrl).mockReturnValue(mockUrl);

    const result = await emailAccountsRouter.createCaller({
      user: { id: 'user-123', email: 'test@example.com', role: 'user' },
      req: {},
      res: {},
    }).emailAccounts.getAuthUrl({ provider: 'gmail' });

    expect(result.authUrl).toBe(mockUrl);
    expect(oauth2.getAuthorizationUrl).toHaveBeenCalledWith('gmail', 'user-123');
  });

  it('should get authorization URL for Outlook', async () => {
    const mockUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?...';
    vi.mocked(oauth2.getAuthorizationUrl).mockReturnValue(mockUrl);

    const result = await emailAccountsRouter.createCaller({
      user: { id: 'user-123', email: 'test@example.com', role: 'user' },
      req: {},
      res: {},
    }).emailAccounts.getAuthUrl({ provider: 'outlook' });

    expect(result.authUrl).toBe(mockUrl);
    expect(oauth2.getAuthorizationUrl).toHaveBeenCalledWith('outlook', 'user-123');
  });

  it('should handle token exchange errors gracefully', async () => {
    vi.mocked(oauth2.exchangeCodeForTokens).mockRejectedValue(
      new Error('Invalid authorization code')
    );

    const caller = emailAccountsRouter.createCaller({
      user: { id: 'user-123', email: 'test@example.com', role: 'user' },
      req: {},
      res: {},
    });

    await expect(
      caller.emailAccounts.connectAccount({
        provider: 'gmail',
        code: 'invalid-code',
      })
    ).rejects.toThrow('Failed to connect gmail account');
  });
});
