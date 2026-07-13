import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { globalSearch, getSearchSuggestions } from "../globalSearch";
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMITS } from "../rateLimit";
import { hybridCaseSearch } from "../casesHybridSearch";

export const searchRouter = router({
  /** Natural-language expanded tokens + keyword global search → case IDs */
  hybridCases: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(500) }))
    .query(async ({ input, ctx }) => {
      const identifier = getRateLimitIdentifier(ctx);
      checkRateLimit(identifier, RATE_LIMITS.general);
      return hybridCaseSearch(input.query, ctx.user.id);
    }),

  global: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(200),
        types: z.array(z.enum(["case", "lawyer", "evidence", "document", "communication"])).optional(),
        limit: z.number().min(1).max(100).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const identifier = getRateLimitIdentifier(ctx);
      checkRateLimit(identifier, RATE_LIMITS.general);

      const results = await globalSearch(input.query, {
        types: input.types,
        limit: input.limit,
        userId: ctx.user.id,
      });

      return {
        query: input.query,
        results,
        total: results.length,
      };
    }),

  suggestions: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(100),
        limit: z.number().min(1).max(10).optional().default(5),
      })
    )
    .query(async ({ input, ctx }) => {
      const identifier = getRateLimitIdentifier(ctx);
      checkRateLimit(identifier, RATE_LIMITS.general);

      const suggestions = await getSearchSuggestions(input.query, input.limit);

      return {
        query: input.query,
        suggestions,
      };
    }),
});
