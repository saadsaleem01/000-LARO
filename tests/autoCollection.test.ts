import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the notification module
vi.mock("../../_core/notification", () => ({
  notifyOwner: vi.fn(() => Promise.resolve(true)),
}));

// Mock the database
vi.mock("../../db", () => ({
  getDb: vi.fn(() => Promise.resolve({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve()),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
  })),
}));

// Import after mocks
import { runAutoCollectionForAllCases } from "../autoCollectionService";
import { notifyOwner } from "../../_core/notification";

describe("Auto-Collection Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("runAutoCollectionForAllCases", () => {
    it("should return zero counts when no cases have auto-collection enabled", async () => {
      const result = await runAutoCollectionForAllCases();
      
      expect(result.casesProcessed).toBe(0);
      expect(result.emailsCollected).toBe(0);
      expect(result.filesCollected).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it("should not send notification when no cases are processed", async () => {
      await runAutoCollectionForAllCases();
      
      // Should not notify when casesProcessed is 0 and no errors
      expect(notifyOwner).not.toHaveBeenCalled();
    });
  });
});
