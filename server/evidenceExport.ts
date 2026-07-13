/**
 * Phase 023 — real evidence export as a ZIP package.
 *
 * Builds a downloadable ZIP for a case containing:
 *   - manifest.json  (case details + evidence list + provenance hashes),
 *   - evidence/<id>.json for each item's metadata,
 *   - README.txt explaining the package.
 *
 * Owner-scoped: the caller must own the case (enforced by the router before this
 * is invoked). Returns a Buffer so the router can stream/base64 it. Uses the real
 * `archiver` dependency (no fake/placeholder URL).
 */
import archiver from "archiver";
import { getDb } from "./db";
import { cases as casesTable, evidence as evidenceTable } from "./schema";
import { and, eq } from "drizzle-orm";

export async function buildCaseZip(userId: string, caseId: string): Promise<Buffer> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [caseRow] = await db
    .select()
    .from(casesTable)
    .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, userId)))
    .limit(1);
  if (!caseRow) throw new Error("Case not found");

  const items = await db
    .select()
    .from(evidenceTable)
    .where(and(eq(evidenceTable.caseId, caseId), eq(evidenceTable.userId, userId)));

  const manifest = {
    format: "laro-case-zip/v1",
    caseId,
    client: caseRow.clientName,
    status: caseRow.status,
    evidenceCount: items.length,
    evidence: items.map((e: any) => {
      let meta: any = {};
      try { meta = e.metadata ? JSON.parse(e.metadata) : {}; } catch { meta = {}; }
      return { id: e.id, title: e.title, type: e.type, fileName: e.fileName, contentHash: meta.contentHash ?? null };
    }),
  };

  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("data", (c) => chunks.push(c as Buffer));
    archive.on("error", reject);
    archive.on("end", () => resolve(Buffer.concat(chunks)));

    archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });
    archive.append(
      "LARO case evidence export.\nSee manifest.json for the evidence list and content hashes (sha256).\n",
      { name: "README.txt" }
    );
    for (const e of items as any[]) {
      archive.append(JSON.stringify(e, null, 2), { name: `evidence/${e.id}.json` });
    }
    archive.finalize();
  });
}
