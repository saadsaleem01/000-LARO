import nodemailer from "nodemailer";
import { ENV } from "./_core/env";

/**
 * System (transactional) email sender — used for app-generated mail like
 * password-reset codes. This is distinct from server/userNotification.ts, which
 * sends from a user's own connected Gmail/Outlook account.
 *
 * Provider precedence: SendGrid → SMTP (nodemailer) → console fallback.
 * The console fallback keeps the feature testable in development / when no
 * provider is configured: the message (including any reset code) is logged so
 * a developer can complete the flow locally.
 */

export interface SystemEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SystemEmailResult {
  delivered: boolean;
  provider: "sendgrid" | "smtp" | "console";
}

function fromAddress(): string {
  return process.env.EMAIL_FROM || process.env.SMTP_FROM || "noreply@laro.local";
}

async function sendViaSendGrid(email: SystemEmail): Promise<void> {
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: email.to }] }],
      from: { email: fromAddress() },
      subject: email.subject,
      content: [
        { type: "text/plain", value: email.text },
        ...(email.html ? [{ type: "text/html", value: email.html }] : []),
      ],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`SendGrid send failed (${res.status}): ${detail}`);
  }
}

async function sendViaSmtp(email: SystemEmail): Promise<void> {
  const port = Number(process.env.SMTP_PORT) || 587;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
  await transport.sendMail({
    from: fromAddress(),
    to: email.to,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });
}

export async function sendSystemEmail(email: SystemEmail): Promise<SystemEmailResult> {
  if (ENV.SENDGRID_API_KEY) {
    await sendViaSendGrid(email);
    return { delivered: true, provider: "sendgrid" };
  }
  if (process.env.SMTP_HOST) {
    await sendViaSmtp(email);
    return { delivered: true, provider: "smtp" };
  }

  // Development fallback: no provider configured. Log so the flow is testable.
  console.log(
    `\n[systemEmail] No email provider configured — logging message instead of sending.\n` +
      `  To:      ${email.to}\n` +
      `  Subject: ${email.subject}\n` +
      `  Body:    ${email.text}\n`
  );
  return { delivered: false, provider: "console" };
}

/**
 * Send a password-reset code email. Returns the send result; callers should not
 * surface delivery details to the client (to avoid leaking account existence).
 */
export async function sendPasswordResetEmail(
  to: string,
  code: string,
  ttlMinutes: number
): Promise<SystemEmailResult> {
  const subject = "Your LARO password reset code";
  const text =
    `You requested to reset your LARO password.\n\n` +
    `Your reset code is: ${code}\n\n` +
    `This code expires in ${ttlMinutes} minutes. ` +
    `If you didn't request this, you can safely ignore this email.`;
  const html =
    `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">` +
    `<h2 style="color:#111;">Reset your LARO password</h2>` +
    `<p style="color:#444;">Use the code below to set a new password:</p>` +
    `<div style="font-size:32px;font-weight:700;letter-spacing:6px;color:#111;` +
    `background:#f4f4f5;border-radius:8px;padding:16px;text-align:center;margin:16px 0;">${code}</div>` +
    `<p style="color:#666;font-size:13px;">This code expires in ${ttlMinutes} minutes. ` +
    `If you didn't request this, you can safely ignore this email.</p>` +
    `</div>`;
  return sendSystemEmail({ to, subject, text, html });
}
