import { ENV } from './_core/env';
import { encryptSecret, decryptSecret } from './crypto';

/**
 * Token Encryption & OAuth Refresh Utilities.
 *
 * Phase 007/030 (D4): token confidentiality now uses authenticated AES-256-GCM via
 * `server/crypto.ts` (previously unauthenticated AES-256-CBC with a weak key).
 * The function names are unchanged so all callers keep working; legacy CBC values
 * still decrypt transparently until they are re-saved (and thereby upgraded).
 */

/** Encrypt an OAuth token for storage (authenticated encryption). */
export function encryptToken(text: string): string {
  return encryptSecret(text);
}

/** Decrypt a stored OAuth token (handles both the current and legacy schemes). */
export function decryptToken(text: string): string {
  return decryptSecret(text);
}

/**
 * Refresh a Gmail access token using the refresh token
 */
export async function refreshGmailToken(refreshToken: string) {
  const clientId = ENV.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID || "";
  const clientSecret =
    ENV.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET || "";
  if (!clientId) {
    throw new Error("Missing Google OAuth client ID configuration");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  if (clientSecret) {
    body.set('client_secret', clientSecret);
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Gmail token refresh failed: ${data.error_description || data.error}`);
  }

  return {
    accessToken: data.access_token,
    expiryDate:  Date.now() + (data.expires_in * 1000),
  };
}

/**
 * Refresh an Outlook access token using the refresh token
 */
export async function refreshOutlookToken(refreshToken: string) {
  const clientId = ENV.MICROSOFT_CLIENT_ID || process.env.MICROSOFT_OAUTH_CLIENT_ID || "";
  const clientSecret = ENV.MICROSOFT_CLIENT_SECRET || process.env.MICROSOFT_OAUTH_CLIENT_SECRET || "";
  if (!clientId || !clientSecret) {
    throw new Error("Missing Microsoft OAuth client configuration");
  }

  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
      scope:         'https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read offline_access',
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Outlook token refresh failed: ${data.error_description || data.error}`);
  }

  return {
    accessToken: data.access_token,
    expiryDate:  Date.now() + (data.expires_in * 1000),
  };
}
