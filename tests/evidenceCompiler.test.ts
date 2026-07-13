import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  compileEvidence,
  getReport,
  getReportsForCase,
  getEntitiesForCase,
} from "../evidenceCompilerService";

// Mock all dependencies
vi.mock("../pdfExtractionService", () => ({
  extractTextFromPDF: vi.fn(() =>
    Promise.resolve({
      text: "Sample PDF text content",
      pageCount: 1,
      pages: [],
      metadata: {},
    })
  ),
}));

vi.mock("../entityExtractionService", () => ({
  extractEntitiesFromText: vi.fn(() =>
    Promise.resolve([
      {
        entityType: "person",
        entityValue: "John Doe",
        confidence: 0.9,
        context: "party",
      },
    ])
  ),
  classifyDocument: vi.fn(() =>
    Promise.resolve({
      documentType: "contract",
      confidence: 0.9,
      suggestedCategory: "legal",
      keyTerms: ["contract"],
    })
  ),
  storeExtractedEntities: vi.fn(() => Promise.resolve()),
}));

vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn(() =>
    Promise.resolve({
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary: "Test summary",
              findings: ["Finding 1", "Finding 2"],
              recommendations: ["Rec 1", "Rec 2"],
              fullReport: "Full report",
              confidence: 85,
            }),
          },
        },
      ],
    })
  ),
}));

vi.mock("../multiProviderLLM", () => ({
  invokeMultiProviderLLM: vi.fn(() =>
    Promise.resolve({
      content: JSON.stringify({
        summary: "Test summary",
        findings: ["Finding 1", "Finding 2"],
        recommendations: ["Rec 1", "Rec 2"],
        fullReport: "Full report",
        confidence: 85,
      }),
      provider: "mock",
      model: "mock-model",
      tokensUsed: { total: 100, prompt: 50, completion: 50 },
      cost: 0.001,
      responseTimeMs: 100,
    })
  ),
}));

// Mock database with proper query chain
const mockFiles = [
  {
    id: "file1",
    caseId: "case123",
    fileName: "document.pdf",
    mimeType: "application/pdf",
    s3Key: "evidence/document.pdf",
    fileSize: 1024,
    uploadedAt: new Date(),
  },
];

const mockReport = {
  id: "report123",
  caseId: "case123",
  userId: "user123",
  title: "EVIDENCE COMPILATION Report",
  status: "completed",
  reportType: "evidence_compilation",
  summary: "Test summary",
  findings: JSON.stringify(["Finding 1", "Finding 2"]),
  recommendations: JSON.stringify(["Rec 1", "Rec 2"]),
  fullReport: "Full report content",
  confidence: 85,
  sourcesAnalyzed: 1,
  caseLawCited: 0,
  metadata: null,
  createdAt: new Date(),
  completedAt: new Date(),
};

// Create a factory function that returns fresh mocks for each test
const createMockDb = () => {
  return {
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve()),
    })),
    select: vi.fn(() => ({
      from: vi.fn((table: any) => {
        // Check if this is an evidenceFiles query
        const isEvidenceQuery = table?._?.name === 'evidenceFiles' || 
          (table && String(table).includes('evidence'));
        
        return {
          where: vi.fn(() => {
            if (isEvidenceQuery) {
              return Promise.resolve(mockFiles);
            }
            return {
              limit: vi.fn(() => Promise.resolve([mockReport])),
              orderBy: vi.fn(() => Promise.resolve([mockReport])),
            };
          }),
        };
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
  };
};

vi.mock("../../db", () => ({
  getDb: vi.fn(() => Promise.resolve(createMockDb())),
}));

describe("Evidence Compiler Engine - Phase 3: Report Generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("compileEvidence", () => {
    it("should compile evidence and generate a report", async () => {
      const result = await compileEvidence({
        caseId: "case123",
        userId: "user123",
        reportType: "evidence_compilation",
      });

      expect(result.reportId).toBeDefined();
      expect(result.status).toBe("completed");
      expect(result.summary).toBe("Test summary");
      expect(result.findings).toEqual(["Finding 1", "Finding 2"]);
      expect(result.recommendations).toEqual(["Rec 1", "Rec 2"]);
    });

    it("should handle comprehensive report type", async () => {
      const result = await compileEvidence({
        caseId: "case456",
        userId: "user456",
        reportType: "comprehensive",
      });

      expect(result.status).toBe("completed");
      expect(result.reportId).toBeDefined();
    });

    it("should handle timeline analysis report type", async () => {
      const result = await compileEvidence({
        caseId: "case789",
        userId: "user789",
        reportType: "timeline_analysis",
      });

      expect(result.status).toBe("completed");
      expect(result.reportId).toBeDefined();
    });

    it("should handle entity extraction report type", async () => {
      const result = await compileEvidence({
        caseId: "case101",
        userId: "user101",
        reportType: "entity_extraction",
      });

      expect(result.status).toBe("completed");
      expect(result.reportId).toBeDefined();
    });

    it("should handle case law research report type", async () => {
      const result = await compileEvidence({
        caseId: "case202",
        userId: "user202",
        reportType: "case_law_research",
      });

      expect(result.status).toBe("completed");
      expect(result.reportId).toBeDefined();
    });
  });

  describe("getReport", () => {
    it("should retrieve a report by ID", async () => {
      const report = await getReport("report123");
      expect(report).toBeDefined();
      expect(report?.id).toBe("report123");
    });
  });

  describe("getReportsForCase", () => {
    it("should retrieve all reports for a case", async () => {
      const reports = await getReportsForCase("case123");
      expect(Array.isArray(reports)).toBe(true);
    });
  });

  describe("getEntitiesForCase", () => {
    it("should retrieve all extracted entities for a case", async () => {
      const entities = await getEntitiesForCase("case123");
      expect(Array.isArray(entities)).toBe(true);
    });
  });
});
