import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { evidence } from "../schema";
import { and, desc, eq, like, or } from "drizzle-orm";

/**
 * Evidence Timeline router.
 *
 * Powers the "Evidence Timeline" tab (src/renderer/components/EvidenceTimelineView.tsx),
 * which groups evidence rows by day. It reads the same `evidence` table that the
 * keyword pull (server/autoCollectionService.ts) and manual uploads write to, so
 * pulled Gmail/Drive items appear here automatically, newest first.
 */
export const evidenceTimelineRouter = router({
  getTimeline: protectedProcedure
    .input(
      z
        .object({
          caseId: z.string().optional(),
          source: z.string().optional(),
          type: z.string().optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const userId = ctx.user.id;

      const conditions = [eq(evidence.userId, userId)];
      if (input?.caseId) conditions.push(eq(evidence.caseId, input.caseId));
      if (input?.source) conditions.push(eq(evidence.source, input.source));
      if (input?.type) conditions.push(eq(evidence.type, input.type));
      if (input?.search?.trim()) {
        const q = `%${input.search.trim()}%`;
        conditions.push(
          or(like(evidence.title, q), like(evidence.description, q), like(evidence.fileName, q))!
        );
      }

      return db
        .select()
        .from(evidence)
        .where(and(...conditions))
        .orderBy(desc(evidence.createdAt));
    }),
});
