import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { listHelpTopics, getHelpTopic } from "../help";
import { errorCatalog } from "../errorCatalog";

/**
 * Phase 071/072 — in-app help + error catalog (public; no user data).
 */
export const helpRouter = router({
  topics: publicProcedure.query(() => listHelpTopics()),
  topic: publicProcedure.input(z.object({ id: z.string() })).query(({ input }) => getHelpTopic(input.id)),
  errorCatalog: publicProcedure.query(() => errorCatalog()),
});
