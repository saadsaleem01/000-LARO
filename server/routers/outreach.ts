import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { assertCaseOwnership } from "../_core/authz";
import { outreachStatus, lawyers } from '../schema';
import { eq } from "drizzle-orm";

export const outreachRouter = router({
  byCaseId: protectedProcedure
    .input(z.string())
    .query(async ({ input: caseId, ctx }) => {
      await assertCaseOwnership(caseId, ctx.user.id); // Phase 008
      const db = await getDb();
      if (!db) return [];
      const results = await db
        .select({
          id: outreachStatus.id,
          lawyerName: lawyers.name,
          status: outreachStatus.status,
          distanceKm: outreachStatus.distanceKm,
          initialContact: outreachStatus.initialContact,
          followUpsSent: outreachStatus.followUpsSent,
          response: outreachStatus.response,
          lastContact: outreachStatus.lastContact,
        })
        .from(outreachStatus)
        .leftJoin(lawyers, eq(outreachStatus.lawyerId, lawyers.id))
        .where(eq(outreachStatus.caseId, caseId));
        
      return results;
    }),
});
