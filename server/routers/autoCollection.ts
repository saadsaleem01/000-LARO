import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getAutoCollectionSettings,
  upsertAutoCollectionSettings,
  runAutoCollection,
  getAutoCollectionLogs,
  getKeywordMatches,
  pullEvidenceByKeywords,
  setLocalFolderPaths,
  getLocalFolderPaths,
} from "../autoCollectionService";

export const autoCollectionRouter = router({
  getSettings: protectedProcedure
    .input(z.object({ caseId: z.string() }))
    .query(async ({ input }) => {
      const settings = await getAutoCollectionSettings(input.caseId);
      return { settings };
    }),

  upsertSettings: protectedProcedure
    .input(
      z.object({
        caseId: z.string(),
        keywords: z.array(z.string()),
        keywordMatchMode: z.enum(["all", "any"]),
        dateRangeStart: z.date().optional(),
        dateRangeEnd: z.date().optional(),
        emailAccountIds: z.array(z.string()),
        autoDownloadAttachments: z.boolean(),
        autoDownloadGoogleDriveFiles: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      await upsertAutoCollectionSettings({
        ...input,
        userId,
      });
      
      // Feature request: run immediately upon saving
      try {
        const result = await runAutoCollection(input.caseId);
        return { success: true, runResult: result };
      } catch (err) {
        console.error("Failed to run initial auto-collection:", err);
        return { success: true, runResult: null, error: "Saved, but initial run failed" };
      }
    }),

  runCollection: protectedProcedure
    .input(z.object({ caseId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const result = await runAutoCollection(input.caseId);
        return { success: true, result };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to run collection",
        });
      }
    }),

  getLogs: protectedProcedure
    .input(z.object({ caseId: z.string(), limit: z.number().optional().default(10) }))
    .query(async ({ input }) => {
      const logs = await getAutoCollectionLogs(input.caseId, input.limit);
      return { logs };
    }),

  getKeywordMatches: protectedProcedure
    .input(z.object({ caseId: z.string() }))
    .query(async ({ input }) => {
      const matches = await getKeywordMatches(input.caseId);
      return { matches };
    }),

  /**
   * One-shot keyword pull: pull evidence from every connected source
   * (Gmail, Google Drive, configured local folders) in a single call.
   * This is the entry point for the case-view "Pull evidence by keyword" UI.
   */
  pullByKeywords: protectedProcedure
    .input(
      z.object({
        caseId: z.string(),
        keywords: z.array(z.string().min(1)).min(1),
        matchMode: z.enum(["all", "any"]).optional().default("any"),
        driveFolderIds: z.array(z.string()).optional(),
        localFolderPaths: z.array(z.string()).optional(),
        dateStart: z.coerce.date().optional(),
        dateEnd: z.coerce.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await pullEvidenceByKeywords({
          caseId: input.caseId,
          userId: ctx.user.id,
          keywords: input.keywords,
          matchMode: input.matchMode,
          driveFolderIds: input.driveFolderIds,
          localFolderPaths: input.localFolderPaths,
          dateStart: input.dateStart,
          dateEnd: input.dateEnd,
        });
        return { success: true, result };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Pull failed",
        });
      }
    }),

  /**
   * Persist local-folder paths to auto-scan during keyword pulls.
   */
  setLocalFolders: protectedProcedure
    .input(z.object({ caseId: z.string(), paths: z.array(z.string()) }))
    .mutation(async ({ input, ctx }) => {
      await setLocalFolderPaths(input.caseId, ctx.user.id, input.paths);
      return { success: true };
    }),

  getLocalFolders: protectedProcedure
    .input(z.object({ caseId: z.string() }))
    .query(async ({ input }) => {
      const paths = await getLocalFolderPaths(input.caseId);
      return { paths };
    }),
});
