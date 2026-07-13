import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { lawyers as lawyersTable } from '../schema';

export const lawyersRouter = router({
  list: publicProcedure
    .input(z.object({
      page: z.number().optional().default(1),
      limit: z.number().optional().default(100),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { lawyers: [] };
      const results = await db.select().from(lawyersTable).limit(input?.limit || 100).offset(((input?.page || 1) - 1) * (input?.limit || 100));
      return { lawyers: results };
    }),

  byId: publicProcedure
    .input(z.string())
    .query(async ({ input: id }) => {
      const db = await getDb();
      if (!db) return null;
      const { eq } = await import("drizzle-orm");
      const result = await db.select().from(lawyersTable).where(eq(lawyersTable.id, id)).limit(1);
      return result.length > 0 ? result[0] : null;
    }),

  create: publicProcedure
    .input(z.object({
      name: z.string(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      firm: z.string().optional(),
      city: z.string().optional(),
      legalAreas: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const id = `LAW${Date.now().toString().slice(-6)}`;
      await db.insert(lawyersTable).values({
        id,
        name: input.name,
        email: input.email || null,
        phone: input.phone || null,
        firm: input.firm || null,
        city: input.city || null,
        legalAreas: JSON.stringify(input.legalAreas || []),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      return { id, success: true };
    }),

});
