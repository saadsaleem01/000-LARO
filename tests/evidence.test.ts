import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  searchEvidenceFiles,
  getEvidenceFile,
  createEvidenceFile,
  deleteEvidenceFile,
  getEvidenceFilesByCase,
  getEvidenceStats,
} from "../evidence";
import { getDb } from "../../db";
import { evidenceFiles } from "../../../drizzle/schema";

const TEST_USER_ID = "test-user-evidence";
const TEST_CASE_ID = "test-case-evidence";

describe("Evidence Files Database Functions", () => {
  let testFileId: string;

  beforeAll(async () => {
    // Clean up any existing test data
    const db = await getDb();
    if (db) {
      await db.delete(evidenceFiles).where();
    }
  });

  afterAll(async () => {
    // Clean up test data
    const db = await getDb();
    if (db) {
      await db.delete(evidenceFiles).where();
    }
  });

  it("should create evidence file record", async () => {
    const file = await createEvidenceFile({
      userId: TEST_USER_ID,
      caseId: TEST_CASE_ID,
      fileName: "test-document.pdf",
      fileSize: "245678",
      mimeType: "application/pdf",
      fileType: "document",
      uploadSource: "manual",
      s3Key: "evidence/test-user/test-case/test-document.pdf",
      s3Url: "https://s3.example.com/test-document.pdf",
    });

    expect(file).toBeDefined();
    expect(file?.fileName).toBe("test-document.pdf");
    expect(file?.fileType).toBe("document");
    expect(file?.uploadSource).toBe("manual");

    testFileId = file!.id;
  });

  it("should get evidence file by ID", async () => {
    const file = await getEvidenceFile(testFileId, TEST_USER_ID);

    expect(file).toBeDefined();
    expect(file?.id).toBe(testFileId);
    expect(file?.fileName).toBe("test-document.pdf");
  });

  it("should search evidence files with query filter", async () => {
    // Create another file for search testing
    await createEvidenceFile({
      userId: TEST_USER_ID,
      caseId: TEST_CASE_ID,
      fileName: "contract-2024.pdf",
      fileSize: "123456",
      mimeType: "application/pdf",
      fileType: "document",
      uploadSource: "agent",
      s3Key: "evidence/test-user/test-case/contract.pdf",
      s3Url: "https://s3.example.com/contract.pdf",
    });

    const result = await searchEvidenceFiles({
      userId: TEST_USER_ID,
      query: "contract",
    });

    expect(result.files.length).toBeGreaterThan(0);
    expect(result.files[0].fileName).toContain("contract");
    expect(result.total).toBeGreaterThan(0);
  });

  it("should filter evidence files by file type", async () => {
    // Create an image file
    await createEvidenceFile({
      userId: TEST_USER_ID,
      caseId: TEST_CASE_ID,
      fileName: "evidence-photo.jpg",
      fileSize: "1024567",
      mimeType: "image/jpeg",
      fileType: "image",
      uploadSource: "manual",
      s3Key: "evidence/test-user/test-case/photo.jpg",
      s3Url: "https://s3.example.com/photo.jpg",
    });

    const result = await searchEvidenceFiles({
      userId: TEST_USER_ID,
      fileType: "image",
    });

    expect(result.files.length).toBeGreaterThan(0);
    expect(result.files.every((f) => f.fileType === "image")).toBe(true);
  });

  it("should filter evidence files by upload source", async () => {
    const result = await searchEvidenceFiles({
      userId: TEST_USER_ID,
      uploadSource: "agent",
    });

    expect(result.files.length).toBeGreaterThan(0);
    expect(result.files.every((f) => f.uploadSource === "agent")).toBe(true);
  });

  it("should get evidence files by case", async () => {
    const files = await getEvidenceFilesByCase(TEST_CASE_ID, TEST_USER_ID);

    expect(files.length).toBeGreaterThan(0);
    expect(files.every((f) => f.caseId === TEST_CASE_ID)).toBe(true);
  });

  it("should paginate search results", async () => {
    const page1 = await searchEvidenceFiles({
      userId: TEST_USER_ID,
      limit: 2,
      offset: 0,
    });

    expect(page1.files.length).toBeLessThanOrEqual(2);

    const page2 = await searchEvidenceFiles({
      userId: TEST_USER_ID,
      limit: 2,
      offset: 2,
    });

    // Ensure different results
    if (page1.files.length > 0 && page2.files.length > 0) {
      expect(page1.files[0].id).not.toBe(page2.files[0].id);
    }
  });

  it("should get evidence statistics", async () => {
    const stats = await getEvidenceStats(TEST_USER_ID);

    expect(Number(stats.totalFiles)).toBeGreaterThan(0);
    expect(Number(stats.documentCount)).toBeGreaterThan(0);
    expect(Number(stats.imageCount)).toBeGreaterThan(0);
    expect(Number(stats.manualCount)).toBeGreaterThan(0);
    expect(Number(stats.agentCount)).toBeGreaterThan(0);
  });

  it("should delete evidence file", async () => {
    const result = await deleteEvidenceFile(testFileId, TEST_USER_ID);

    expect(result.success).toBe(true);

    // Verify deletion
    const file = await getEvidenceFile(testFileId, TEST_USER_ID);
    expect(file).toBeUndefined();
  });

  it("should return empty results for non-existent user", async () => {
    const result = await searchEvidenceFiles({
      userId: "non-existent-user",
    });

    expect(result.files.length).toBe(0);
    expect(result.total).toBe(0);
  });

  it("should handle date range filtering", async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const result = await searchEvidenceFiles({
      userId: TEST_USER_ID,
      dateFrom: yesterday,
      dateTo: tomorrow,
    });

    expect(result.files.length).toBeGreaterThan(0);
  });

  it("should filter by case ID", async () => {
    const result = await searchEvidenceFiles({
      userId: TEST_USER_ID,
      caseId: TEST_CASE_ID,
    });

    expect(result.files.length).toBeGreaterThan(0);
    expect(result.files.every((f) => f.caseId === TEST_CASE_ID)).toBe(true);
  });
});
