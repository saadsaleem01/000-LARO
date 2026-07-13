import { describe, it, expect } from "vitest";
import {
  validationRules,
  validateField,
  validateForm,
  isFormValid,
  validateFile,
  validateFiles,
} from "../../client/src/lib/formValidation";
import {
  formatDate,
  formatDateShort,
  formatRelativeTime,
  isToday,
  isYesterday,
  addDays,
  getBusinessDays,
  formatDuration,
} from "../../client/src/lib/dateUtils";

describe("Form Validation", () => {
  describe("validationRules.required", () => {
    it("should validate non-empty strings", () => {
      const rule = validationRules.required();
      expect(rule.validate("test")).toBe(true);
      expect(rule.validate("")).toBe(false);
      expect(rule.validate("   ")).toBe(false);
    });

    it("should validate non-empty arrays", () => {
      const rule = validationRules.required();
      expect(rule.validate([1, 2, 3])).toBe(true);
      expect(rule.validate([])).toBe(false);
    });

    it("should validate non-null values", () => {
      const rule = validationRules.required();
      expect(rule.validate(0)).toBe(true);
      expect(rule.validate(false)).toBe(true);
      expect(rule.validate(null)).toBe(false);
      expect(rule.validate(undefined)).toBe(false);
    });
  });

  describe("validationRules.email", () => {
    it("should validate correct email formats", () => {
      const rule = validationRules.email();
      expect(rule.validate("test@example.com")).toBe(true);
      expect(rule.validate("user.name+tag@example.co.uk")).toBe(true);
    });

    it("should reject invalid email formats", () => {
      const rule = validationRules.email();
      expect(rule.validate("invalid")).toBe(false);
      expect(rule.validate("@example.com")).toBe(false);
      expect(rule.validate("test@")).toBe(false);
      expect(rule.validate("test @example.com")).toBe(false);
    });
  });

  describe("validationRules.phone", () => {
    it("should validate Dutch phone numbers", () => {
      const rule = validationRules.phone();
      expect(rule.validate("0612345678")).toBe(true);
      expect(rule.validate("+31612345678")).toBe(true);
      expect(rule.validate("06 1234 5678")).toBe(true);
      expect(rule.validate("06-1234-5678")).toBe(true);
    });

    it("should reject invalid phone numbers", () => {
      const rule = validationRules.phone();
      expect(rule.validate("123")).toBe(false);
      expect(rule.validate("0012345678")).toBe(false);
      expect(rule.validate("06123456789")).toBe(false);
    });
  });

  describe("validationRules.postalCode", () => {
    it("should validate Dutch postal codes", () => {
      const rule = validationRules.postalCode();
      expect(rule.validate("1234AB")).toBe(true);
      expect(rule.validate("1234 AB")).toBe(true);
      expect(rule.validate("1234ab")).toBe(true);
    });

    it("should reject invalid postal codes", () => {
      const rule = validationRules.postalCode();
      expect(rule.validate("0234AB")).toBe(false);
      expect(rule.validate("12345AB")).toBe(false);
      expect(rule.validate("1234A")).toBe(false);
      expect(rule.validate("1234ABC")).toBe(false);
    });
  });

  describe("validationRules.minLength", () => {
    it("should validate minimum length", () => {
      const rule = validationRules.minLength(5);
      expect(rule.validate("12345")).toBe(true);
      expect(rule.validate("123456")).toBe(true);
      expect(rule.validate("1234")).toBe(false);
    });
  });

  describe("validationRules.maxLength", () => {
    it("should validate maximum length", () => {
      const rule = validationRules.maxLength(10);
      expect(rule.validate("12345")).toBe(true);
      expect(rule.validate("1234567890")).toBe(true);
      expect(rule.validate("12345678901")).toBe(false);
    });
  });

  describe("validateField", () => {
    it("should validate field against multiple rules", () => {
      const rules = [
        validationRules.required(),
        validationRules.minLength(3),
        validationRules.maxLength(10),
      ];

      expect(validateField("test", rules).isValid).toBe(true);
      expect(validateField("", rules).isValid).toBe(false);
      expect(validateField("ab", rules).isValid).toBe(false);
      expect(validateField("12345678901", rules).isValid).toBe(false);
    });

    it("should return all error messages", () => {
      const rules = [
        validationRules.required(),
        validationRules.minLength(3),
      ];

      const result = validateField("", rules);
      expect(result.errors.length).toBe(2);
    });
  });

  describe("validateForm", () => {
    it("should validate entire form object", () => {
      const formData = {
        name: "John Doe",
        email: "john@example.com",
        age: 25,
      };

      const rules = {
        name: [validationRules.required(), validationRules.minLength(2)],
        email: [validationRules.required(), validationRules.email()],
        age: [validationRules.required(), validationRules.min(18)],
      };

      const results = validateForm(formData, rules);
      expect(isFormValid(results)).toBe(true);
    });

    it("should detect invalid fields", () => {
      const formData = {
        name: "",
        email: "invalid",
        age: 15,
      };

      const rules = {
        name: [validationRules.required()],
        email: [validationRules.email()],
        age: [validationRules.min(18)],
      };

      const results = validateForm(formData, rules);
      expect(isFormValid(results)).toBe(false);
      expect(results.name.isValid).toBe(false);
      expect(results.email.isValid).toBe(false);
      expect(results.age.isValid).toBe(false);
    });
  });

  describe("validateFile", () => {
    it("should validate file size", () => {
      const file = new File(["a".repeat(1000)], "test.txt", { type: "text/plain" });
      
      expect(validateFile(file, { maxSize: 2000 }).isValid).toBe(true);
      expect(validateFile(file, { maxSize: 500 }).isValid).toBe(false);
    });

    it("should validate file type", () => {
      const file = new File(["test"], "test.txt", { type: "text/plain" });
      
      expect(validateFile(file, { allowedTypes: ["text/plain"] }).isValid).toBe(true);
      expect(validateFile(file, { allowedTypes: ["image/png"] }).isValid).toBe(false);
    });
  });

  describe("validateFiles", () => {
    it("should validate multiple files", () => {
      const files = [
        new File(["test1"], "test1.txt", { type: "text/plain" }),
        new File(["test2"], "test2.txt", { type: "text/plain" }),
      ];

      expect(validateFiles(files, { maxFiles: 3 }).isValid).toBe(true);
      expect(validateFiles(files, { maxFiles: 1 }).isValid).toBe(false);
    });
  });
});

describe("Date Utilities", () => {
  describe("formatDate", () => {
    it("should format dates correctly", () => {
      const date = new Date("2024-01-15");
      const formatted = formatDate(date);
      expect(formatted).toMatch(/January 15, 2024/);
    });

    it("should handle null/undefined", () => {
      expect(formatDate(null)).toBe("-");
      expect(formatDate(undefined)).toBe("-");
    });

    it("should handle string dates", () => {
      const formatted = formatDate("2024-01-15");
      expect(formatted).toMatch(/January 15, 2024/);
    });
  });

  describe("formatDateShort", () => {
    it("should format dates in short format", () => {
      const date = new Date("2024-01-15");
      const formatted = formatDateShort(date);
      expect(formatted).toMatch(/01\/15\/2024/);
    });
  });

  describe("formatRelativeTime", () => {
    it("should format recent times", () => {
      const now = new Date();
      expect(formatRelativeTime(now)).toBe("just now");
      
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      expect(formatRelativeTime(fiveMinutesAgo)).toBe("5 minutes ago");
      
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoHoursAgo)).toBe("2 hours ago");
    });
  });

  describe("isToday", () => {
    it("should detect today's date", () => {
      const today = new Date();
      expect(isToday(today)).toBe(true);
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });
  });

  describe("isYesterday", () => {
    it("should detect yesterday's date", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isYesterday(yesterday)).toBe(true);
      
      const today = new Date();
      expect(isYesterday(today)).toBe(false);
    });
  });

  describe("addDays", () => {
    it("should add days to date", () => {
      const date = new Date("2024-01-15");
      const future = addDays(date, 5);
      expect(future.getDate()).toBe(20);
    });

    it("should handle negative days", () => {
      const date = new Date("2024-01-15");
      const past = addDays(date, -5);
      expect(past.getDate()).toBe(10);
    });
  });

  describe("getBusinessDays", () => {
    it("should count business days excluding weekends", () => {
      // Monday to Friday (5 days)
      const start = new Date("2024-01-01"); // Monday
      const end = new Date("2024-01-05");   // Friday
      expect(getBusinessDays(start, end)).toBe(5);
    });

    it("should exclude weekends", () => {
      // Monday to Sunday (5 business days)
      const start = new Date("2024-01-01"); // Monday
      const end = new Date("2024-01-07");   // Sunday
      expect(getBusinessDays(start, end)).toBe(5);
    });
  });

  describe("formatDuration", () => {
    it("should format milliseconds to human-readable duration", () => {
      expect(formatDuration(5000)).toBe("5s");
      expect(formatDuration(65000)).toBe("1m 5s");
      expect(formatDuration(3665000)).toBe("1h 1m");
      expect(formatDuration(90000000)).toBe("1d 1h");
    });
  });
});

