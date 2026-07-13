import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { bulkImportJobs, cases } from "../schema";
import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import Papa from "papaparse";

type CsvRow = {
  caseTitle?: string;
  description?: string;
  category?: string;
  urgency?: string;
  evidenceUrls?: string;
  tags?: string;
};

function mapUrgency(u: string | undefined): "Low" | "Medium" | "High" {
  const x = (u ?? "Medium").trim();
  if (/^high$/i.test(x)) return "High";
  if (/^low$/i.test(x)) return "Low";
  return "Medium";
}

function jobRowToListItem(job: typeof bulkImportJobs.$inferSelect) {
  return {
    id: job.id,
    filename: job.filename ?? "",
    status: job.status ?? "unknown",
    totalRows: Number(job.totalRows ?? 0),
    processedRows: Number(job.processedRows ?? 0),
    failedRows: Number(job.failedRows ?? 0),
    createdAt: job.createdAt ?? new Date(),
    completedAt: job.completedAt ?? null,
  };
}

export const bulkImportRouter = router({
  listJobs: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const rows = await db
      .select()
      .from(bulkImportJobs)
      .where(eq(bulkImportJobs.userId, ctx.user.id))
      .orderBy(desc(bulkImportJobs.createdAt))
      .limit(50);

    return rows.map(jobRowToListItem);
  }),

  getJobStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;

      const [job] = await db
        .select()
        .from(bulkImportJobs)
        .where(and(eq(bulkImportJobs.id, input.jobId), eq(bulkImportJobs.userId, ctx.user.id)))
        .limit(1);

      if (!job) return null;

      let meta: { aggregation?: Record<string, number> } = {};
      try {
        meta = job.metadata ? JSON.parse(job.metadata) : {};
      } catch {
        meta = {};
      }

      return {
        status: job.status ?? "unknown",
        filename: job.filename ?? "",
        processedRows: Number(job.processedRows ?? 0),
        totalRows: Number(job.totalRows ?? 0),
        failedRows: Number(job.failedRows ?? 0),
        aggregation: meta.aggregation,
      };
    }),

  uploadCSV: protectedProcedure
    .input(
      z.object({
        csvContent: z.string(),
        filename: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        return {
          success: false as const,
          errors: ["Database not available"],
          totalRows: 0,
          jobId: undefined as undefined,
        };
      }

      const parsed = Papa.parse<CsvRow>(input.csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
      });

      if (parsed.errors.length > 0) {
        return {
          success: false as const,
          errors: parsed.errors.map((e) => e.message || "Parse error"),
          totalRows: 0,
          jobId: undefined,
        };
      }

      const dataRows = parsed.data.filter(
        (r) => r && ((r.caseTitle ?? "").trim() !== "" || (r.description ?? "").trim() !== "")
      );

      if (dataRows.length === 0) {
        return {
          success: false as const,
          errors: [
            'No data rows found. Expected CSV headers such as: caseTitle, description, category, urgency (see "Download Template" on the import screen).',
          ],
          totalRows: 0,
          jobId: undefined,
        };
      }

      const jobId = nanoid();

      await db.insert(bulkImportJobs).values({
        id: jobId,
        userId: ctx.user.id,
        filename: input.filename,
        status: "processing",
        totalRows: String(dataRows.length),
        processedRows: "0",
        failedRows: "0",
        createdAt: new Date(),
      });

      let created = 0;
      let failed = 0;
      const errMsgs: string[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        try {
          const clientName =
            (row.caseTitle ?? "").trim() || `Imported case ${i + 1}`;
          const caseSummary = (row.description ?? "").trim() || "Imported via bulk CSV";
          const caseType = (row.category ?? "General").trim() || "General";
          const urgency = mapUrgency(row.urgency);
          const slug = clientName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 32);
          const clientEmail = `${slug || "case"}-${i}-${jobId.slice(0, 8)}@bulk-import.invalid`;

          const caseId = `CASE${nanoid(12)}`;

          await db.insert(cases).values({
            id: caseId,
            userId: ctx.user.id,
            clientName,
            clientEmail,
            clientPhone: "",
            clientAddress: "",
            caseType,
            caseSummary,
            urgency,
            status: "Matching",
            metadata: row.tags
              ? JSON.stringify({ tags: row.tags, evidenceUrls: row.evidenceUrls ?? "" })
              : row.evidenceUrls
                ? JSON.stringify({ evidenceUrls: row.evidenceUrls })
                : null,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any);

          created++;
        } catch (e: unknown) {
          failed++;
          const msg = e instanceof Error ? e.message : String(e);
          errMsgs.push(`Row ${i + 1}: ${msg}`);
        }
      }

      const finalStatus = created === 0 ? "failed" : "completed";

      await db
        .update(bulkImportJobs)
        .set({
          status: finalStatus,
          processedRows: String(dataRows.length),
          failedRows: String(failed),
          errors: errMsgs.length ? JSON.stringify(errMsgs.slice(0, 100)) : null,
          completedAt: new Date(),
          metadata: JSON.stringify({
            aggregation: {
              duplicatesRemoved: 0,
              originalCount: dataRows.length,
              consolidatedCount: created,
            },
          }),
        })
        .where(eq(bulkImportJobs.id, jobId));

      return {
        success: true as const,
        jobId,
        totalRows: dataRows.length,
        errors: errMsgs.length ? errMsgs.slice(0, 10) : undefined,
      };
    }),
});
