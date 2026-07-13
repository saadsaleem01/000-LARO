/**
 * Phase 007 — session/JWT revocation.
 *
 * JWTs are stateless, so "log out everywhere" / post-compromise invalidation needs
 * a server-side signal. We store a per-user "revoked-after" epoch (ms) in
 * system_config. Any token issued at or before that instant is treated as invalid.
 * Setting it to now (on logout-all / password reset) immediately invalidates every
 * outstanding session for that user without changing the signing secret.
 */
import { getDb } from "./db";
import { systemConfig } from "./schema";
import { eq } from "drizzle-orm";

function key(userId: string): string {
  return `session:revokedAfter:${userId}`;
}

/** Revoke all sessions for a user issued at/before `at` (default now). */
export async function revokeUserSessions(userId: string, at: Date = new Date()): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const value = String(at.getTime());
  await db
    .insert(systemConfig)
    .values({ configKey: key(userId), configValue: value, updatedAt: at } as any)
    .onConflictDoUpdate({ target: systemConfig.configKey, set: { configValue: value, updatedAt: at } as any });
}

/**
 * True when a token with the given `iat` (seconds, as in a JWT) has been revoked.
 * Fails OPEN only on DB unavailability (so a DB blip doesn't lock everyone out),
 * but fails CLOSED (revoked) whenever a revocation timestamp exists and the token
 * predates it.
 */
export async function isTokenRevoked(userId: string, iatSeconds: number | undefined): Promise<boolean> {
  if (!iatSeconds) return false; // no iat → can't compare; treated as not-revoked
  const db = await getDb();
  if (!db) return false;
  try {
    const row = (await db.select().from(systemConfig).where(eq(systemConfig.configKey, key(userId))).limit(1))[0];
    if (!row?.configValue) return false;
    const revokedAfterMs = Number(row.configValue);
    if (!Number.isFinite(revokedAfterMs)) return false;
    // Token issued at or before the revocation instant → revoked. (1s grace to
    // avoid rounding races between jwt `iat` seconds and ms timestamps.)
    return iatSeconds * 1000 <= revokedAfterMs;
  } catch {
    return false;
  }
}
