
import { getDb } from "./db";
import { emailAccounts } from "./schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import crypto from "crypto";
import { encryptToken, decryptToken } from "./emailOAuth";

export interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface OAuth2Tokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number; // seconds
  tokenType: string;
}

export interface EmailAccountInfo {
  email: string;
  displayName?: string;
  profilePicture?: string;
}

type OAuthProvider = "gmail" | "outlook";


interface OAuthStatePayload {
  userId: string;
  provider: OAuthProvider;
  codeVerifier: string;
  nonce: string;
  createdAt: number;
}

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getOAuthRedirectBaseUrl(): string {
  const raw = process.env.OAUTH_REDIRECT_BASE_URL || 'http://localhost:3000';
  // Support accidental full callback values in .env by trimming to origin.
  if (raw.includes('/api/oauth/')) {
    return raw.split('/api/oauth/')[0].replace(/\/$/, '');
  }
  return raw.replace(/\/$/, '');
}

/**
 * Get OAuth2 configuration for provider
 */
export function getOAuth2Config(provider: 'gmail' | 'outlook'): OAuth2Config {
  const redirectBase = getOAuthRedirectBaseUrl();
  if (provider === 'gmail') {
    return {
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
      redirectUri: `${redirectBase}/api/oauth/gmail/callback`,
      scopes: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/drive.readonly', // Google Drive read access
        'https://www.googleapis.com/auth/drive.metadata.readonly', // Google Drive metadata
      ],
    };
  } else {
    return {
      clientId: process.env.MICROSOFT_OAUTH_CLIENT_ID || '',
      clientSecret: process.env.MICROSOFT_OAUTH_CLIENT_SECRET || '',
      redirectUri: `${redirectBase}/api/oauth/outlook/callback`,
      scopes: [
        'https://graph.microsoft.com/Mail.Send',
        'https://graph.microsoft.com/Mail.Read',
        'https://graph.microsoft.com/User.Read',
      ],
    };
  }
}

function toBase64Url(value: Buffer): string {
  return value
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): Buffer {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64");
}

function generatePkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = toBase64Url(crypto.randomBytes(64));
  const codeChallenge = toBase64Url(
    crypto.createHash("sha256").update(codeVerifier).digest()
  );
  return { codeVerifier, codeChallenge };
}

/**
 * Build a self-contained, encrypted OAuth state. Everything the callback needs
 * (userId, provider, PKCE codeVerifier) is encrypted into the state itself, so
 * the flow survives server/process restarts without any server-side storage.
 */
function buildOAuthState(
  provider: OAuthProvider,
  userId: string,
  codeVerifier: string
): string {
  const payload: OAuthStatePayload = {
    provider,
    userId,
    codeVerifier,
    nonce: nanoid(),
    createdAt: Date.now(),
  };
  return toBase64Url(Buffer.from(encryptToken(JSON.stringify(payload)), "utf8"));
}

/**
 * Start OAuth flow with PKCE and state protection.
 */
export function beginOAuthFlow(provider: OAuthProvider, userId: string): string {
  const { codeVerifier, codeChallenge } = generatePkcePair();
  const state = buildOAuthState(provider, userId, codeVerifier);

  const config = getOAuth2Config(provider);
  if (!config.clientId) {
    throw new Error(`${provider} OAuth client ID is not configured`);
  }

  if (provider === "gmail") {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: config.scopes.join(" "),
      access_type: "offline",
      prompt: "consent",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scopes.join(" "),
    response_mode: "query",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

/**
 * Consume and validate one-time OAuth state.
 */
export function consumeOAuthState(
  state: string,
  provider: OAuthProvider
): { userId: string; codeVerifier: string } {
  let payload: OAuthStatePayload;
  try {
    const decrypted = decryptToken(fromBase64Url(state).toString("utf8"));
    payload = JSON.parse(decrypted) as OAuthStatePayload;
  } catch {
    throw new Error("Invalid or expired OAuth state");
  }

  if (
    !payload ||
    typeof payload.userId !== "string" ||
    typeof payload.codeVerifier !== "string" ||
    typeof payload.createdAt !== "number"
  ) {
    throw new Error("Invalid or expired OAuth state");
  }

  if (Date.now() - payload.createdAt > OAUTH_STATE_TTL_MS) {
    throw new Error("Invalid or expired OAuth state");
  }

  if (payload.provider !== provider) {
    throw new Error("OAuth provider mismatch");
  }

  return { userId: payload.userId, codeVerifier: payload.codeVerifier };
}

/**
 * Generate OAuth2 authorization URL
 */
export function getAuthorizationUrl(provider: 'gmail' | 'outlook', userId: string): string {
  const config = getOAuth2Config(provider);
  
  // Store userId in state parameter for callback
  const state = Buffer.from(JSON.stringify({ userId, provider })).toString('base64');
  
  if (provider === 'gmail') {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      access_type: 'offline', // Get refresh token
      prompt: 'consent', // Force consent to get refresh token
      state,
    });
    
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  } else {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      response_mode: 'query',
      state,
    });
    
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  provider: "gmail" | "outlook",
  code: string,
  codeVerifier?: string
): Promise<OAuth2Tokens> {
  const config = getOAuth2Config(provider);

  if (provider === "gmail") {
    const body = new URLSearchParams({
      code,
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    });
    if (codeVerifier) {
      body.set("code_verifier", codeVerifier);
    }
    if (config.clientSecret) {
      body.set("client_secret", config.clientSecret);
    }
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as Record<string, string>;
    if (!res.ok) {
      throw new Error(data.error_description || data.error || "Gmail token exchange failed");
    }
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: Number(data.expires_in) || 3600,
      tokenType: data.token_type || "Bearer",
    };
  }

  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  });
  if (codeVerifier) {
    body.set("code_verifier", codeVerifier);
  } else if (config.clientSecret) {
    body.set("client_secret", config.clientSecret);
  }
  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json()) as Record<string, string>;
  if (!res.ok) {
    throw new Error(data.error_description || data.error || "Outlook token exchange failed");
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: Number(data.expires_in) || 3600,
    tokenType: data.token_type || "Bearer",
  };
}

export async function getAccountInfo(
  provider: "gmail" | "outlook",
  accessToken: string
): Promise<EmailAccountInfo> {
  if (provider === "gmail") {
    const r = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const d = (await r.json()) as { email?: string; name?: string; picture?: string };
    return {
      email: d.email || "",
      displayName: d.name,
      profilePicture: d.picture,
    };
  }
  const r = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const d = (await r.json()) as { mail?: string; userPrincipalName?: string; displayName?: string };
  return {
    email: d.mail || d.userPrincipalName || "",
    displayName: d.displayName,
  };
}

export async function saveEmailAccount(
  userId: string,
  provider: "gmail" | "outlook",
  tokens: OAuth2Tokens,
  accountInfo: EmailAccountInfo
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(emailAccounts)
    .where(and(eq(emailAccounts.userId, userId), eq(emailAccounts.email, accountInfo.email)))
    .limit(1);

  const row = {
    userId,
    provider,
    email: accountInfo.email,
    accessToken: encryptToken(tokens.accessToken),
    refreshToken: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
    tokenExpiry: new Date(Date.now() + tokens.expiresIn * 1000),
    status: "connected",
    connectedAt: new Date(),
    metadata: JSON.stringify({
      displayName: accountInfo.displayName,
      profilePicture: accountInfo.profilePicture,
      tokenType: tokens.tokenType,
      expiresIn: tokens.expiresIn,
    }),
    updatedAt: new Date(),
  };

  if (existing[0]) {
    await db.update(emailAccounts).set(row).where(eq(emailAccounts.id, existing[0].id));
  } else {
    await db.insert(emailAccounts).values({ id: nanoid(), ...row, createdAt: new Date() });
  }
}

export async function refreshAccessToken(
  provider: "gmail" | "outlook",
  refreshToken: string
): Promise<OAuth2Tokens> {
  const config = getOAuth2Config(provider);
  if (provider === "gmail") {
    const body = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      grant_type: "refresh_token",
    });
    if (config.clientSecret) {
      body.set("client_secret", config.clientSecret);
    }
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as Record<string, string>;
    if (!res.ok) {
      throw new Error(data.error_description || data.error || "Gmail refresh failed");
    }
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: Number(data.expires_in) || 3600,
      tokenType: data.token_type || "Bearer",
    };
  }

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
    scope: config.scopes.join(" "),
  });
  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json()) as Record<string, string>;
  if (!res.ok) {
    throw new Error(data.error_description || data.error || "Outlook refresh failed");
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: Number(data.expires_in) || 3600,
    tokenType: data.token_type || "Bearer",
  };
}
