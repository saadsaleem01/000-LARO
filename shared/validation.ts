import { z } from "zod";

/**
 * Phase 021 — forms, validation, and autosave behavior.
 *
 * Canonical, reusable validation schemas shared by the API (and available to the
 * renderer). Centralizing them keeps client and server validation in sync and
 * avoids the previous ad-hoc inline schemas drifting apart.
 */

// Lenient phone format: allow empty (optional field) or a plausible number.
export const phoneSchema = z
  .string()
  .max(30)
  .refine((v) => v === "" || /^[+0-9][0-9\s\-()]{5,}$/.test(v), {
    message: "Enter a valid phone number",
  });

export const urgencySchema = z.enum(["Low", "Medium", "High"]);

/** Case intake form contract (create). */
export const caseIntakeSchema = z.object({
  clientName: z.string().min(2, "Name is too short").max(120),
  clientEmail: z.string().email("Enter a valid email"),
  clientPhone: phoneSchema.optional().default(""),
  clientAddress: z.string().max(300).optional().default(""),
  caseType: z.string().min(1, "Select a case type").max(120),
  caseSummary: z.string().max(20000).default(""),
  urgency: urgencySchema,
});

export type CaseIntake = z.infer<typeof caseIntakeSchema>;
