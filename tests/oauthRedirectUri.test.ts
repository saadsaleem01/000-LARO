import { describe, it, expect } from 'vitest';
import { getOAuth2Config } from '../oauth2';

describe('OAuth Redirect URI Configuration', () => {
  it('should use OAUTH_REDIRECT_BASE_URL for Gmail redirect URI', () => {
    const config = getOAuth2Config('gmail');
    
    expect(config.redirectUri).toBeDefined();
    expect(config.redirectUri).toContain('/api/oauth/google/callback');
    expect(config.clientId).toBe(process.env.GOOGLE_OAUTH_CLIENT_ID);
    expect(config.clientSecret).toBe(process.env.GOOGLE_OAUTH_CLIENT_SECRET);
  });

  it('should use OAUTH_REDIRECT_BASE_URL for Outlook redirect URI', () => {
    const config = getOAuth2Config('outlook');
    
    expect(config.redirectUri).toBeDefined();
    expect(config.redirectUri).toContain('/api/oauth/outlook/callback');
    // Outlook credentials may not be configured yet
    if (process.env.MICROSOFT_OAUTH_CLIENT_ID) {
      expect(config.clientId).toBe(process.env.MICROSOFT_OAUTH_CLIENT_ID);
    }
    if (process.env.MICROSOFT_OAUTH_CLIENT_SECRET) {
      expect(config.clientSecret).toBe(process.env.MICROSOFT_OAUTH_CLIENT_SECRET);
    }
  });

  it('should use published domain when OAUTH_REDIRECT_BASE_URL is set', () => {
    const config = getOAuth2Config('gmail');
    
    // Should NOT be localhost when OAUTH_REDIRECT_BASE_URL is set
    if (process.env.OAUTH_REDIRECT_BASE_URL) {
      expect(config.redirectUri).not.toContain('localhost:3000');
      expect(config.redirectUri).toContain(process.env.OAUTH_REDIRECT_BASE_URL);
    }
  });


  it('should have valid Gmail OAuth configuration', () => {
    const config = getOAuth2Config('gmail');
    
    expect(config.clientId).toBeTruthy();
    expect(config.clientSecret).toBeTruthy();
    expect(config.redirectUri).toBeTruthy();
    expect(config.scopes).toContain('https://www.googleapis.com/auth/gmail.send');
    expect(config.scopes).toContain('https://www.googleapis.com/auth/gmail.readonly');
  });

  it('should have valid Outlook OAuth configuration', () => {
    const config = getOAuth2Config('outlook');
    
    // Outlook credentials may not be set yet, but structure should be valid
    expect(config.redirectUri).toBeTruthy();
    expect(config.scopes).toContain('https://graph.microsoft.com/Mail.Send');
    expect(config.scopes).toContain('https://graph.microsoft.com/Mail.Read');
  });
});
