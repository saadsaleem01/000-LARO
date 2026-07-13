import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  listGoogleDriveFolders,
  getAllFilesInFolder,
  searchGoogleDriveFiles,
  getGoogleDriveFileMetadata,
  downloadAndUploadGoogleDriveFile,
} from "../googleDriveService";
import { getDb } from "../db";
import { emailAccounts, evidence } from "../schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { beginOAuthFlow } from "../oauth2";
import { pullEvidenceByKeywords } from "../autoCollectionService";

/**
 * Google Drive Router
 * Handles folder browsing, file discovery, and evidence collection from Google Drive
 */
export const googleDriveRouter = router({
  /**
   * Status endpoint used by GoogleDriveIntegration.tsx. Reports both whether
   * the user has Drive access (via Gmail OAuth — same connection) and a
   * rough per-case summary so the legacy UI keeps working.
   */
  getStatus: protectedProcedure
    .input(z.object({ caseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        return { connected: false, status: null };
      }

      const accounts = await db
        .select()
        .from(emailAccounts)
        .where(and(eq(emailAccounts.userId, ctx.user.id), eq(emailAccounts.provider, "gmail")));

      const connected = accounts.length > 0;

      // Count Drive-sourced evidence for the case.
      let itemsCollected = 0;
      try {
        const rows = await db
          .select()
          .from(evidence)
          .where(and(eq(evidence.caseId, input.caseId), eq(evidence.source, "google_drive")));
        itemsCollected = rows.length;
      } catch {
        itemsCollected = 0;
      }

      return {
        connected,
        status: connected
          ? {
              id: accounts[0].id,
              status: "connected",
              itemsCollected: String(itemsCollected),
              lastSyncedAt: accounts[0].connectedAt,
            }
          : null,
      };
    }),

  /**
   * Return the OAuth URL the renderer should open to connect Google Drive.
   * Drive access piggy-backs on the Gmail OAuth scopes, so this just kicks
   * off the Gmail flow.
   */
  connect: protectedProcedure.mutation(async ({ ctx }) => {
    const url = beginOAuthFlow("gmail", ctx.user.id);
    return { authUrl: url };
  }),

  /**
   * Disconnect: removes the Gmail/Drive credentials for the user. Note this
   * removes Gmail access too because they share one OAuth token.
   */
  disconnect: protectedProcedure
    .input(z.object({ caseId: z.string().optional(), sourceId: z.string().optional() }))
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await db
        .delete(emailAccounts)
        .where(and(eq(emailAccounts.userId, ctx.user.id), eq(emailAccounts.provider, "gmail")));
      return { success: true };
    }),

  /**
   * Kick off a Drive sync for a case. Without keywords we don't know what to
   * pull, so this is a thin wrapper that returns a no-op result if no
   * auto-collection settings exist yet.
   */
  startSync: protectedProcedure
    .input(z.object({ caseId: z.string(), sourceId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      // Best effort: if the case has saved auto-collection keywords, use them.
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const { autoCollectionSettings } = await import("../schema");
      const settings = await db
        .select()
        .from(autoCollectionSettings)
        .where(eq(autoCollectionSettings.caseId, input.caseId))
        .limit(1);
      const keywords = settings[0]?.keywords ? (() => {
        try { return JSON.parse(settings[0].keywords as string); } catch { return []; }
      })() : [];

      if (!keywords.length) {
        return {
          success: true,
          progress: {
            totalFiles: 0,
            processedFiles: 0,
            extractedContent: 0,
            errors: ["No keywords configured. Set keywords in Auto-Collection first."],
          },
        };
      }

      const result = await pullEvidenceByKeywords({
        caseId: input.caseId,
        userId: ctx.user.id,
        keywords,
      });

      return {
        success: true,
        progress: {
          totalFiles: result.driveFiles + result.gmailAttachments,
          processedFiles: result.driveFiles + result.gmailAttachments,
          extractedContent: result.gmailMessages,
          errors: result.errors,
        },
      };
    }),

  /**
   * Check if user has Google Drive connected
   */
  checkConnection: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const accounts = await db
      .select()
      .from(emailAccounts)
      .where(and(eq(emailAccounts.userId, ctx.user.id), eq(emailAccounts.provider, "gmail")));

    return {
      connected: accounts.length > 0,
      accounts: accounts.map(a => ({
        id: a.id,
        email: a.email,
        displayName: a.displayName,
      })),
    };
  }),

  /**
   * List folders in Google Drive (for folder picker)
   */
  listFolders: protectedProcedure
    .input(
      z.object({
        parentId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const folders = await listGoogleDriveFolders(ctx.user.id, input.parentId);
        return { folders };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to list folders",
        });
      }
    }),

  /**
   * Get all files in a folder (with preview)
   */
  getFilesInFolder: protectedProcedure
    .input(
      z.object({
        folderId: z.string(),
        recursive: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const files = await getAllFilesInFolder(ctx.user.id, input.folderId, input.recursive);
        return { files, count: files.length };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get files",
        });
      }
    }),

  /**
   * Search files in Google Drive
   */
  searchFiles: protectedProcedure
    .input(
      z.object({
        query: z.string(),
        folderId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const files = await searchGoogleDriveFiles(ctx.user.id, input.query, input.folderId);
        return { files };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to search files",
        });
      }
    }),

  /**
   * Import specific files as evidence
   */
  importFiles: protectedProcedure
    .input(
      z.object({
        caseId: z.string(),
        fileIds: z.array(z.string()),
        fileNames: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const imported: string[] = [];
      const errors: string[] = [];

      for (let i = 0; i < input.fileIds.length; i++) {
        const fileId = input.fileIds[i];
        const fileName = input.fileNames[i];

        try {
          // Download file to storage
          const fileData = await downloadAndUploadGoogleDriveFile(fileId, input.caseId, ctx.user.id);

          // Create evidence record
          const evidenceId = uuidv4();
          await db.insert(evidence).values({
            id: evidenceId,
            caseId: input.caseId,
            userId: ctx.user.id,
            type: determineEvidenceType(fileData.mimeType),
            source: "google_drive",
            title: fileName,
            description: `Imported from Google Drive`,
            fileUrl: fileData.url,
            fileName: fileData.fileName,
            fileSize: fileData.size,
            mimeType: fileData.mimeType,
            metadata: JSON.stringify({
              driveFileId: fileId,
              importedAt: new Date().toISOString(),
              modifiedTime: fileData.modifiedTime,
            }),
            relevant: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          imported.push(fileName);
        } catch (error) {
          errors.push(`${fileName}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }

      return {
        success: true,
        imported: imported.length,
        errors,
      };
    }),

  /**
   * Bulk import all files from a folder
   */
  importFolder: protectedProcedure
    .input(
      z.object({
        caseId: z.string(),
        folderId: z.string(),
        folderName: z.string(),
        recursive: z.boolean().default(false),
        keywords: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      try {
        // Get all files in folder
        const files = await getAllFilesInFolder(ctx.user.id, input.folderId, input.recursive);

        let filesToImport = files;

        // Filter by keywords if provided
        if (input.keywords && input.keywords.length > 0) {
          filesToImport = files.filter(file => {
            const fileName = file.name?.toLowerCase() || "";
            return input.keywords!.some(kw => fileName.includes(kw.toLowerCase()));
          });
        }

        const imported: string[] = [];
        const skipped: string[] = [];
        const errors: string[] = [];

        for (const file of filesToImport) {
          try {
            // Check if already imported
            const existing = await db
              .select()
              .from(evidence)
              .where(
                and(
                  eq(evidence.caseId, input.caseId),
                  eq(evidence.source, "google_drive")
                )
              );

            const alreadyImported = existing.some(e => {
              const metadata = e.metadata ? JSON.parse(e.metadata) : {};
              return metadata.driveFileId === file.id;
            });

            if (alreadyImported) {
              skipped.push(file.name || "Unknown");
              continue;
            }

            // Download and create evidence
            const fileData = await downloadAndUploadGoogleDriveFile(file.id!, input.caseId, ctx.user.id);

            const evidenceId = uuidv4();
            await db.insert(evidence).values({
              id: evidenceId,
              caseId: input.caseId,
              userId: ctx.user.id,
              type: determineEvidenceType(fileData.mimeType),
              source: "google_drive",
              title: file.name || "Untitled",
              description: `Imported from Google Drive folder: ${input.folderName}`,
              fileUrl: fileData.url,
              fileName: fileData.fileName,
              fileSize: fileData.size,
              mimeType: fileData.mimeType,
              metadata: JSON.stringify({
                driveFileId: file.id,
                folderId: input.folderId,
                folderName: input.folderName,
                importedAt: new Date().toISOString(),
                modifiedTime: fileData.modifiedTime,
              }),
              relevant: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            imported.push(file.name || "Unknown");
          } catch (error) {
            errors.push(`${file.name}: ${error instanceof Error ? error.message : "Unknown error"}`);
          }
        }

        return {
          success: true,
          totalFiles: files.length,
          imported: imported.length,
          skipped: skipped.length,
          errors,
          importedFiles: imported,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to import folder",
        });
      }
    }),
});

/**
 * Determine evidence type from MIME type
 */
function determineEvidenceType(mimeType?: string): string {
  if (!mimeType) return "document";

  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.includes("pdf")) return "document";
  if (mimeType.includes("word") || mimeType.includes("document")) return "document";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "document";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "document";
  if (mimeType.includes("text")) return "document";

  return "document";
}
