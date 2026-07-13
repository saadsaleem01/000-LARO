/**
 * Trello Service Tests
 * Validates Trello API credentials and basic functionality
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { testTrelloConnection, getTrelloBoards } from '../trelloService';

describe('Trello Service', () => {
  let token: string;

  beforeAll(() => {
    // For testing, we'll use a basic token validation
    // In production, this would be a real user token
    token = process.env.TRELLO_API_KEY || '';
  });

  it('should have TRELLO_API_KEY environment variable set', () => {
    expect(process.env.TRELLO_API_KEY).toBeDefined();
    expect(process.env.TRELLO_API_KEY).toBeTruthy();
  });

  it('should have TRELLO_API_SECRET environment variable set', () => {
    expect(process.env.TRELLO_API_SECRET).toBeDefined();
    expect(process.env.TRELLO_API_SECRET).toBeTruthy();
  });

  it('should validate Trello credentials format', () => {
    const apiKey = process.env.TRELLO_API_KEY || '';
    const apiSecret = process.env.TRELLO_API_SECRET || '';

    // API Key should be a 32-character hex string
    expect(apiKey).toMatch(/^[a-f0-9]{32}$/i);

    // API Secret should be a 64-character hex string
    expect(apiSecret).toMatch(/^[a-f0-9]{64}$/i);
  });

  it('should have correct OAuth configuration', async () => {
    const { getTrelloOAuthConfig } = await import('../trelloService');
    const config = getTrelloOAuthConfig();

    expect(config.apiKey).toBe(process.env.TRELLO_API_KEY);
    expect(config.apiSecret).toBe(process.env.TRELLO_API_SECRET);
    expect(config.scopes).toContain('read');
    expect(config.scopes).toContain('write');
    expect(config.scopes).toContain('account');
  });

  it('should generate valid OAuth authorization URL', async () => {
    const { getTrelloAuthorizationUrl } = await import('../trelloService');
    const url = getTrelloAuthorizationUrl('user-123', 'case-456');

    expect(url).toContain('https://trello.com/app-authorization');
    expect(url).toContain('key=');
    expect(url).toContain('scope=');
    expect(url).toContain('redirect_uri=');
    expect(url).toContain('state=');
  });

  it('should have valid redirect URI in OAuth config', async () => {
    const { getTrelloOAuthConfig } = await import('../trelloService');
    const config = getTrelloOAuthConfig();

    expect(config.redirectUri).toBeDefined();
    expect(config.redirectUri).toContain('/api/oauth/trello/callback');
  });
});
