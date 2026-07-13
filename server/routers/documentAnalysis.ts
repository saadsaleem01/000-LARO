import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../llm";

/**
 * Document analysis router — stub. The previous module file was truncated in the workspace.
 * Restore LLM-backed analysis flows here when you have the full implementation.
 */
export const documentAnalysisRouter = router({
  ping: protectedProcedure.query(() => ({
    ok: true as const,
    message: "documentAnalysis stub — implement analysis procedures as needed",
  })),

  analyzeText: protectedProcedure
    .input(z.object({ text: z.string().max(50_000) }))
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          { 
            role: "system", 
            content: "You are a legal document analyst. Summarize the following document and extract key entities (people, companies, dates, amounts)." 
          },
          { role: "user", content: input.text }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "document_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                summary: { type: "string" },
                entities: { type: "array", items: { type: "string" } },
                keyDates: { type: "array", items: { type: "string" } },
                legalSignificance: { type: "string" }
              },
              required: ["summary", "entities", "keyDates", "legalSignificance"],
              additionalProperties: false
            }
          }
        }
      });

      try {
        const content = response.choices[0].message.content;
        return typeof content === "string" ? JSON.parse(content) : content;
      } catch (e) {
        return {
          summary: "Analysis failed or returned invalid format.",
          entities: [],
          keyDates: [],
          legalSignificance: "N/A"
        };
      }
    }),
});
