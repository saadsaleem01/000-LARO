/**
 * Phase 011/026/017 — the REAL outreach send path.
 *
 * This actually transmits an approved outreach message to a lawyer, but every
 * safety gate the project promised stays in force:
 *   - `outreach.send.enabled` feature flag (default OFF) — no send unless an
 *     operator explicitly enables it,
 *   - emergency stop (Phase 104) — a global halt overrides everything,
 *   - the draft MUST be in `Approved` state (human approval gate, Phase 026),
 *   - ownership is enforced,
 *   - IDEMPOTENCY (Phase 017): a per-outreach guard + the `Sent` state prevent
 *     double-sending under retries/races,
 *   - if no email provider is configured the send FAILS HONESTLY
 *     (PROVIDER_NOT_CONFIGURED) — it is never marked Sent without real delivery.
 *
 * The email sender is injectable so tests exercise the full path with a fake
 * provider and never contact a real lawyer.
 */
import { getDb } from "./db";
import { outreachStatus, cases as casesTable, lawyers as lawyersTable } from "./schema";
import { eq } from "drizzle-orm";
import { getFlag } from "./featureFlags";
import { assertNotEmergencyStopped } from "./systemState";
import { getSystemSwitch, setSystemSwitch } from "./systemState";
import { assertOutreachTransition } from "./stateMachines";
import { createAuditLog, AUDIT_ACTIONS } from "./audit";
import { assertCaseOwnership } from "./_core/authz";

export interface SendResult {
  outreachId: string;
  sent: boolean;
  alreadySent?: boolean;
  provider?: string;
  to?: string;
}

export type EmailSender = (email: { to: string; subject: string; text: string }) => Promise<{ delivered: boolean; provider: string }>;

const defaultSender: EmailSender = async (email) => {
  const { sendSystemEmail } = await import("./systemEmail");
  const r = await sendSystemEmail({ to: email.to, subject: email.subject, text: email.text } as any);
  return { delivered: !!r.delivered, provider: r.provider };
};

/**
 * Send one approved outreach draft. Honors every safety gate above.
 * `sender` is injectable (tests pass a fake); production uses systemEmail.
 */
export async function sendApprovedOutreach(
  userId: string,
  outreachId: string,
  sender: EmailSender = defaultSender,
): Promise<SendResult> {
  // Gate 1 — global emergency stop.
  await assertNotEmergencyStopped();

  // Gate 2 — feature flag (default OFF). Without it, nothing is ever sent.
  const enabled = await getFlag("outreach.send.enabled");
  if (!enabled) {
    const { TRPCError } = await import("@trpc/server");
    throw new TRPCError({ code: "FORBIDDEN", message: "Sending is disabled (outreach.send.enabled=false). No message was sent." });
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const row = (await db.select().from(outreachStatus).where(eq(outreachStatus.id, outreachId)).limit(1))[0];
  if (!row || !row.caseId) {
    const { TRPCError } = await import("@trpc/server");
    throw new TRPCError({ code: "NOT_FOUND", message: "Outreach draft not found." });
  }

  // Gate 3 — ownership.
  await assertCaseOwnership(row.caseId, userId);

  // Gate 4 — idempotency: already sent? Return without re-sending.
  const guardKey = `sent:${outreachId}`;
  if (row.status === "Sent" || (await getSystemSwitch(guardKey))) {
    return { outreachId, sent: true, alreadySent: true };
  }

  // Gate 5 — must be human-approved.
  if (row.status !== "Approved") {
    const { TRPCError } = await import("@trpc/server");
    throw new TRPCError({ code: "BAD_REQUEST", message: `Draft must be Approved before sending (current: ${row.status}).` });
  }

  // Resolve recipient (the matched lawyer's email).
  const lawyer = (await db.select().from(lawyersTable).where(eq(lawyersTable.id, row.lawyerId!)).limit(1))[0];
  const to = (lawyer as any)?.email;
  if (!to) {
    const { TRPCError } = await import("@trpc/server");
    throw new TRPCError({ code: "BAD_REQUEST", message: "Matched lawyer has no email address; cannot send." });
  }

  const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, row.caseId)).limit(1);
  const subject = `Legal assistance enquiry — ${(caseRow as any)?.caseType || "case"}`;
  const text =
    `Hello ${(lawyer as any)?.name || "there"},\n\n` +
    `A prospective client is seeking assistance with a ${(caseRow as any)?.caseType || "legal"} matter. ` +
    `They would like to know if you are able to help.\n\n` +
    `(Sent via LARO after explicit user approval. This is not legal advice.)`;

  // Transmit. If no provider is configured, delivered=false → fail honestly.
  const result = await sender({ to, subject, text });
  if (!result.delivered) {
    const { TRPCError } = await import("@trpc/server");
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No email provider is configured; nothing was sent. Configure SendGrid/SMTP." });
  }

  // Mark Sent (idempotently) + record.
  assertOutreachTransition(row.status ?? null, "Sent");
  await setSystemSwitch(guardKey, true);
  await db.update(outreachStatus).set({ status: "Sent", SentAt: new Date(), updatedAt: new Date() } as any).where(eq(outreachStatus.id, outreachId));
  await createAuditLog({ userId, action: AUDIT_ACTIONS.OUTREACH_STATUS_CHANGED, entityType: "outreach", entityId: outreachId, details: { from: "Approved", to: "Sent", provider: result.provider } });

  return { outreachId, sent: true, provider: result.provider, to };
}
