import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getAuditLogs } from "../audit";

/**
 * Phase 019 — audit logging & event history (read path).
 *
 * Previously the audit table was write-only (no reachable read). This exposes a
 * user-scoped list so a user can see the history of actions on their own
 * records. Always filtered by the authenticated user's id — a user can never
 * read another user's audit trail.
 */
export const auditRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          entityType: z.string().optional(),
          entityId: z.string().optional(),
          action: z.string().optional(),
          limit: z.number().min(1).max(200).optional().default(50),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return getAuditLogs({
        userId: ctx.user.id, // ownership: never cross-user
        entityType: input?.entityType,
        entityId: input?.entityId,
        action: input?.action,
        limit: input?.limit ?? 50,
      });
    }),
});
