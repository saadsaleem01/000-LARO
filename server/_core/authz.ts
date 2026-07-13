import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import { cases } from "../schema";

/**
 * Phase 008 — authorization and resource ownership.
 *
 * Central guard used by any procedure that takes a `caseId` (or other
 * case-scoped identifier). It confirms the case exists AND belongs to the
 * authenticated user, throwing a typed tRPC error otherwise. This closes the
 * IDOR class of bug where a logged-in user could read another user's case data
 * simply by passing a different caseId.
 *
 * Use inside `protectedProcedure` handlers, e.g.:
 *   await assertCaseOwnership(input.caseId, ctx.user.id);
 */
export async function assertCaseOwnership(caseId: string, userId: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  }

  // Fetch the case owner once; grant access to the owner OR a member of the
  // owner's team (Phase 106). Strangers are still refused, and we never reveal
  // whether the id exists.
  const rows = await db
    .select({ id: cases.id, ownerId: cases.userId })
    .from(cases)
    .where(eq(cases.id, caseId))
    .limit(1);

  const ownerId = rows[0]?.ownerId;
  let allowed = ownerId === userId;
  if (rows.length > 0 && !allowed) {
    const { hasCaseAccessViaTeam } = await import("../teams");
    allowed = await hasCaseAccessViaTeam(ownerId!, userId);
  }

  if (!allowed) {
    // Do not distinguish "not found" from "not yours" — that itself leaks
    // information about which case ids exist.
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Case not found or you do not have access to it",
    });
  }
}
