/**
 * Validation Tests
 * 
 * Tests for data validation utilities
 */

import { describe, it, expect } from "vitest";
import {
  isValidEmail,
  isValidDutchPhone,
  isValidDutchPostalCode,
  validateCaseData,
  validateLawyerData,
  isValidCoordinates,
  validateFileUpload,
  isValidDate,
  isFutureDate,
  isPastDate,
  sanitizeString,
  sanitizeHTML,
  isPositiveInteger,
  isInRange,
  isValidURL,
  isValidJSON,
  parseJSONSafely,
} from "../validation";

describe("Email Validation", () => {
  it("should validate correct email addresses", () => {
    expect(isValidEmail("test@example.com")).toBe(true);
    expect(isValidEmail("user.name+tag@example.co.uk")).toBe(true);
  });

  it("should reject invalid email addresses", () => {
    expect(isValidEmail("invalid")).toBe(false);
    expect(isValidEmail("@example.com")).toBe(false);
    expect(isValidEmail("test@")).toBe(false);
  });
});

describe("Dutch Phone Validation", () => {
  it("should validate correct Dutch phone numbers", () => {
    expect(isValidDutchPhone("0612345678")).toBe(true);
    expect(isValidDutchPhone("+31612345678")).toBe(true);
    expect(isValidDutchPhone("0031612345678")).toBe(true);
  });

  it("should reject invalid Dutch phone numbers", () => {
    expect(isValidDutchPhone("1234567")).toBe(false);
    expect(isValidDutchPhone("0012345678")).toBe(false);
  });
});

describe("Dutch Postal Code Validation", () => {
  it("should validate correct Dutch postal codes", () => {
    expect(isValidDutchPostalCode("1234 AB")).toBe(true);
    expect(isValidDutchPostalCode("1234AB")).toBe(true);
    expect(isValidDutchPostalCode("9999 ZZ")).toBe(true);
  });

  it("should reject invalid Dutch postal codes", () => {
    expect(isValidDutchPostalCode("0123 AB")).toBe(false);
    expect(isValidDutchPostalCode("1234 A")).toBe(false);
    expect(isValidDutchPostalCode("12345 AB")).toBe(false);
  });
});

describe("Case Data Validation", () => {
  it("should validate correct case data", () => {
    const result = validateCaseData({
      clientName: "John Doe",
      email: "john@example.com",
      caseType: "Employment Dispute",
      description: "I was unfairly dismissed from my job",
      urgency: "High",
      city: "Amsterdam",
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it("should reject invalid case data", () => {
    const result = validateCaseData({
      clientName: "J",
      email: "invalid-email",
      caseType: "EM",
      description: "Too short",
      urgency: "Invalid",
      city: "A",
    });

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });
});

describe("Lawyer Data Validation", () => {
  it("should validate correct lawyer data", () => {
    const result = validateLawyerData({
      name: "Jane Smith",
      email: "jane@lawfirm.nl",
      city: "Rotterdam",
      legalAreas: ["Arbeidsrecht", "Ondernemingsrecht"],
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it("should reject invalid lawyer data", () => {
    const result = validateLawyerData({
      name: "J",
      email: "invalid",
      city: "R",
      legalAreas: [],
    });

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });
});

describe("Coordinates Validation", () => {
  it("should validate correct coordinates", () => {
    expect(isValidCoordinates(52.3676, 4.9041)).toBe(true); // Amsterdam
    expect(isValidCoordinates(51.9244, 4.4777)).toBe(true); // Rotterdam
  });

  it("should reject invalid coordinates", () => {
    expect(isValidCoordinates(91, 0)).toBe(false); // Latitude out of range
    expect(isValidCoordinates(0, 181)).toBe(false); // Longitude out of range
  });
});

describe("File Upload Validation", () => {
  it("should validate correct file uploads", () => {
    const result = validateFileUpload({
      size: 1024 * 1024, // 1 MB
      type: "application/pdf",
      name: "document.pdf",
    });

    expect(result.valid).toBe(true);
  });

  it("should reject files that are too large", () => {
    const result = validateFileUpload({
      size: 20 * 1024 * 1024, // 20 MB
      type: "application/pdf",
      name: "large.pdf",
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain("size exceeds");
  });

  it("should reject invalid file types", () => {
    const result = validateFileUpload({
      size: 1024,
      type: "application/x-executable",
      name: "virus.exe",
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain("not allowed");
  });
});

describe("Date Validation", () => {
  it("should validate correct dates", () => {
    expect(isValidDate("2025-01-01")).toBe(true);
    expect(isValidDate("2025-11-02T12:00:00Z")).toBe(true);
  });

  it("should reject invalid dates", () => {
    expect(isValidDate("invalid")).toBe(false);
    expect(isValidDate("2025-13-01")).toBe(false);
  });

  it("should identify future dates", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    expect(isFutureDate(futureDate.toISOString())).toBe(true);
  });

  it("should identify past dates", () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    expect(isPastDate(pastDate.toISOString())).toBe(true);
  });
});

describe("String Sanitization", () => {
  it("should sanitize strings", () => {
    expect(sanitizeString("  Hello   World  ")).toBe("Hello World");
    expect(sanitizeString("Test<script>")).toBe("Testscript");
  });

  it("should sanitize HTML", () => {
    expect(sanitizeHTML("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;&#x2F;script&gt;"
    );
  });
});

describe("Number Validation", () => {
  it("should validate positive integers", () => {
    expect(isPositiveInteger(1)).toBe(true);
    expect(isPositiveInteger(100)).toBe(true);
  });

  it("should reject non-positive integers", () => {
    expect(isPositiveInteger(0)).toBe(false);
    expect(isPositiveInteger(-1)).toBe(false);
    expect(isPositiveInteger(1.5)).toBe(false);
  });

  it("should validate ranges", () => {
    expect(isInRange(5, 1, 10)).toBe(true);
    expect(isInRange(1, 1, 10)).toBe(true);
    expect(isInRange(10, 1, 10)).toBe(true);
  });

  it("should reject out-of-range values", () => {
    expect(isInRange(0, 1, 10)).toBe(false);
    expect(isInRange(11, 1, 10)).toBe(false);
  });
});

describe("URL Validation", () => {
  it("should validate correct URLs", () => {
    expect(isValidURL("https://example.com")).toBe(true);
    expect(isValidURL("http://localhost:3000")).toBe(true);
  });

  it("should reject invalid URLs", () => {
    expect(isValidURL("not-a-url")).toBe(false);
    expect(isValidURL("htp://invalid")).toBe(false);
  });
});

describe("JSON Validation", () => {
  it("should validate correct JSON", () => {
    expect(isValidJSON('{"key": "value"}')).toBe(true);
    expect(isValidJSON('[1, 2, 3]')).toBe(true);
  });

  it("should reject invalid JSON", () => {
    expect(isValidJSON("not json")).toBe(false);
    expect(isValidJSON("{key: value}")).toBe(false);
  });

  it("should parse JSON safely", () => {
    expect(parseJSONSafely('{"key": "value"}', {})).toEqual({ key: "value" });
    expect(parseJSONSafely("invalid", { default: true })).toEqual({ default: true });
  });
});

