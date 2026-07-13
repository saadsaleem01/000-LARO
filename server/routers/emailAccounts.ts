import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { emailAccounts, emailSyncJobs } from "../schema";
import { eq, and } from "drizzle-orm";
import {
  getAuthorizationUrl,
  exchangeCodeForTokens,
  getAccountInfo,
  refreshAccessToken,
} from "../oauth2";
import crypto from "crypto";

function encryptToken(token: string): string {
  return Buffer.from(token).toString("base64");
}

function decryptToken(encrypted: string): string {
  return Buffer.from(encrypted, "base64").toString("utf-8");
}

async function revokeGmailToken(accessToken: string): Promise<void> {
  try {
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: accessToken }),
    });
  } catch (e) {
    console.warn("[EMAIL_ACCOUNTS] revoke Gmail:", e);
  }
}

export const emailAccountsRouter = router({
  getAuthUrl: protectedProcedure
    .input(z.object({ provider: z.enum(["gmail", "outlook"]) }))
    .mutation(async ({ input, ctx }) => ({
      authUrl: getAuthorizationUrl(input.provider, ctx.user.id),
    })),

  connectAccount: protectedProcedure
    .input(
      z.object({
        provider: z.enum(["gmail", "outlook"]),
        code: z.string(),
        state: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const tokens = await exchangeCodeForTokens(input.provider, input.code);
      const accountInfo = await getAccountInfo(input.provider, tokens.accessToken);

      const id = crypto.randomBytes(16).toString("hex");
      const accessEnc = encryptToken(tokens.accessToken);
      const refreshEnc = tokens.refreshToken ? encryptToken(tokens.refreshToken) : null;

      await db.insert(emailAccounts).values({
        id,
        userId: ctx.user.id,
        provider: input.provider,
        email: accountInfo.email,
        accessToken: accessEnc,
        refreshToken: refreshEnc,
        status: "connected",
        connectedAt: new Date(),
        tokenExpiry: new Date(Date.now() + (tokens.expiresIn || 3600) * 1000),
      });

      return { success: true as const, accountId: id, email: accountInfo.email };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(emailAccounts).where(eq(emailAccounts.userId, ctx.user.id));
  }),

  refreshToken: protectedProcedure
    .input(z.object({ accountId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [acc] = await db
        .select()
        .from(emailAccounts)
        .where(and(eq(emailAccounts.id, input.accountId), eq(emailAccounts.userId, ctx.user.id)))
        .limit(1);
      if (!acc?.refreshToken) throw new Error("No refresh token");
      const refresh = decryptToken(acc.refreshToken);
      const next = await refreshAccessToken(acc.provider as "gmail" | "outlook", refresh);
      await db
        .update(emailAccounts)
        .set({
          accessToken: encryptToken(next.accessToken),
          refreshToken: next.refreshToken ? encryptToken(next.refreshToken) : acc.refreshToken,
          tokenExpiry: new Date(Date.now() + next.expiresIn * 1000),
        })
        .where(eq(emailAccounts.id, acc.id));
      return { success: true as const };
    }),

  revoke: protectedProcedure
    .input(z.object({ accountId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [acc] = await db
        .select()
        .from(emailAccounts)
        .where(and(eq(emailAccounts.id, input.accountId), eq(emailAccounts.userId, ctx.user.id)))
        .limit(1);
      if (!acc) throw new Error("Not found");
      if (acc.provider === "gmail" && acc.accessToken) {
        try {
          await revokeGmailToken(decryptToken(acc.accessToken));
        } catch {
          /* ignore */
        }
      }
      await db.delete(emailAccounts).where(eq(emailAccounts.id, acc.id));
      return { success: true as const };
    }),

  syncJobs: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(emailSyncJobs).limit(50);
  }),
});
