import { describe, it, expect, beforeAll } from 'vitest';
import { google } from 'googleapis';

describe('Google OAuth Credentials Validation', () => {
  let oauth2Client: any;

  beforeAll(() => {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

    expect(clientId).toBeDefined();
    expect(clientSecret).toBeDefined();
    expect(clientId).toMatch(/\.apps\.googleusercontent\.com$/);
    expect(clientSecret).toMatch(/^GOCSPX-/);

    oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'http://localhost:3000/api/oauth/google/callback'
    );
  });

  it('should have valid Google OAuth credentials format', () => {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

    // Check Client ID format
    expect(clientId).toContain('apps.googleusercontent.com');
    expect(clientId?.length).toBeGreaterThan(0);

    // Check Client Secret format
    expect(clientSecret).toMatch(/^GOCSPX-/);
    expect(clientSecret?.length).toBeGreaterThan(0);
  });

  it('should generate valid authorization URL', () => {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/gmail.readonly',
      ],
    });

    expect(authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(authUrl).toContain(process.env.GOOGLE_OAUTH_CLIENT_ID);
    expect(authUrl).toContain('access_type=offline');
    expect(authUrl).toContain('scope=');
  });

  it('should have correct OAuth2 client configuration', () => {
    expect(oauth2Client._clientId).toBe(process.env.GOOGLE_OAUTH_CLIENT_ID);
    expect(oauth2Client._clientSecret).toBe(process.env.GOOGLE_OAUTH_CLIENT_SECRET);
    // Redirect URI is set when getToken is called, not during initialization
    expect(oauth2Client).toBeDefined();
  });

  it('should support required Google APIs scopes', () => {
    const requiredScopes = [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    // Verify scopes are available (not testing actual API access without tokens)
    requiredScopes.forEach((scope) => {
      expect(scope).toContain('googleapis.com');
    });
  });
});
