import { router, publicProcedure, protectedProcedure } from './trpc';
import { ENV } from './env';
import { capabilitiesFor, normalizeRole } from './roles';

export const systemRouter = router({
  health: publicProcedure.query(() => ({
    status: 'ok',
    version: process.env.npm_package_version || '1.0.0',
    env: ENV.NODE_ENV,
    timestamp: new Date().toISOString(),
  })),

  // Phase 037 — app info the UI uses to show an unmistakable environment/demo
  // banner. `demoMode` is forced false in production so demo behaviour can never
  // be confused with real production.
  appInfo: publicProcedure.query(() => ({
    version: process.env.npm_package_version || '1.0.0',
    env: ENV.NODE_ENV,
    isProduction: ENV.isProd,
    demoMode: ENV.isDemo,
    // A ready-to-render label for a banner; empty in normal production.
    banner: ENV.isDemo
      ? 'DEMO MODE — sample environment, not for real cases'
      : ENV.isProd
        ? ''
        : `DEVELOPMENT (${ENV.NODE_ENV}) — not for production use`,
  })),

  // Phase 063 — provider credential verification checklist. Reports which
  // integrations are configured (by env presence) WITHOUT exposing any secret
  // value — only booleans + the names of the required env vars. Lets an operator
  // see at a glance what still needs credentials before a feature will work.
  // Phase 079 (red-team): require auth — even the "which integrations exist"
  // signal should not be exposed to unauthenticated callers.
  // Phase 106 — role-based capabilities for the current user, so the renderer can
  // show/hide role-gated settings. Derived from the real users.role value.
  capabilities: protectedProcedure.query(({ ctx }) => {
    const role = normalizeRole((ctx.user as { role?: string | null }).role);
    return { role, capabilities: capabilitiesFor(role) };
  }),

  providerChecklist: protectedProcedure.query(() => {
    const has = (v: string | undefined) => !!(v && v.length > 0);
    const items = [
      { provider: 'AI (LLM)', category: 'ai', requiredEnv: ['OPENAI_API_KEY | ANTHROPIC_API_KEY | GOOGLE_GEMINI_API_KEY | FORGE_API_KEY'],
        configured: has(ENV.OPENAI_API_KEY) || has(ENV.ANTHROPIC_API_KEY) || has(ENV.GOOGLE_GEMINI_API_KEY) || has(ENV.forgeApiKey),
        note: 'Optional — without a key, LLM features use the deterministic fallback.' },
      { provider: 'Google (Gmail/Drive)', category: 'oauth', requiredEnv: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
        configured: has(ENV.GOOGLE_CLIENT_ID) && has(ENV.GOOGLE_CLIENT_SECRET) },
      { provider: 'Microsoft (Outlook/OneDrive)', category: 'oauth', requiredEnv: ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'],
        configured: has(ENV.MICROSOFT_CLIENT_ID) && has(ENV.MICROSOFT_CLIENT_SECRET) },
      { provider: 'AWS S3 (evidence storage)', category: 'storage', requiredEnv: ['AWS_S3_BUCKET', 'AWS_S3_ACCESS_KEY', 'AWS_S3_SECRET_KEY'],
        configured: has(ENV.AWS_S3_BUCKET) && has(ENV.AWS_S3_ACCESS_KEY) && has(ENV.AWS_S3_SECRET_KEY),
        note: 'Optional — falls back to local disk storage.' },
      { provider: 'Email send (SendGrid/SMTP)', category: 'email', requiredEnv: ['SENDGRID_API_KEY | SMTP_*'],
        configured: has(ENV.SENDGRID_API_KEY) },
      { provider: 'Trello', category: 'evidence', requiredEnv: ['TRELLO_API_KEY'], configured: has(ENV.TRELLO_API_KEY) },
      { provider: 'Telegram', category: 'evidence', requiredEnv: ['TELEGRAM_BOT_TOKEN'], configured: has(ENV.TELEGRAM_BOT_TOKEN) },
      { provider: 'Stripe (billing)', category: 'billing', requiredEnv: ['STRIPE_SECRET_KEY'],
        configured: has(ENV.STRIPE_SECRET_KEY), note: 'Optional — no forced billing (Phase 056).' },
    ];
    return {
      configuredCount: items.filter((i) => i.configured).length,
      total: items.length,
      items,
    };
  }),
});
