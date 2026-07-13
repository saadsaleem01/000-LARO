import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
function resolveProvider() {
  const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || "noreply@laro.local";
  const missingVars: string[] = [];

  if (process.env.SENDGRID_API_KEY) {
    return {
      provider: "sendgrid" as const,
      name: "SendGrid",
      configured: true,
      from,
      missingVars: [] as string[],
    };
  }
  if (process.env.AWS_SES_REGION) {
    return {
      provider: "ses" as const,
      name: "AWS SES",
      configured: true,
      from,
      missingVars: [] as string[],
    };
  }
  if (process.env.SMTP_HOST) {
    return {
      provider: "smtp" as const,
      name: "SMTP",
      configured: true,
      from,
      missingVars: [] as string[],
    };
  }

  if (process.env.EMAIL_PROVIDER === "sendgrid") missingVars.push("SENDGRID_API_KEY");
  if (process.env.EMAIL_PROVIDER === "ses") missingVars.push("AWS_SES_REGION");
  if (process.env.EMAIL_PROVIDER === "smtp") missingVars.push("SMTP_HOST");

  return {
    provider: "console" as const,
    name: "Console (Development)",
    configured: false,
    from: from || "Not configured",
    missingVars,
  };
}

export const emailRouter = router({
  getProviderInfo: publicProcedure.query(() => resolveProvider()),

  test: publicProcedure
    .input(
      z.object({
        to: z.string().email("Invalid email address"),
        subject: z.string().optional(),
      })
    )
    .mutation(({ input }) => {
      const subject = input.subject ?? "LARO test email";
      console.log(`[email.test] To: ${input.to} Subject: ${subject}`);
      return {
        success: true,
        message: "Test email logged to console (development mode).",
      };
    }),
});
