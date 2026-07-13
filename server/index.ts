/**
 * LARO Server — Express + tRPC entry point
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Try to load .env from different possible locations
const possibleEnvPaths = [
  path.join(process.cwd(), '.env'), // Development
  path.join(__dirname, '..', '..', '.env'), // dist/server -> root
  path.join((process as any).resourcesPath || '', '.env'), // Packaged app: extraResources lands here
  path.join((process as any).resourcesPath || '', 'app', '.env') // Legacy fallback
];

for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

import express from 'express';
import { createServer } from 'http';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import cookieParser from 'cookie-parser';
import { corsMiddleware, csrfGuard } from './_core/csrf';

import { appRouter } from './routers';
import { createContext } from './context';
import { compressionMiddleware } from './compression';
import { initCronScheduler } from './cronScheduler';
import oauth2CallbacksRouter from './oauth2Callbacks';
import { beginOAuthFlow } from './oauth2';
import { getDb } from './db';
import { assertSecurityConfig, ENV } from './_core/env';

// ─── Environment ──────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3000', 10);
const isDev = process.env.NODE_ENV === 'development';

// ─── Express setup ────────────────────────────────────────────────────────────

const app = express();
const httpServer = createServer(app);

// ─── Middleware ───────────────────────────────────────────────────────────────

// Phase 080 (D5) — strict CORS (never `*` with credentials) + CSRF origin guard.
app.use(corsMiddleware);
app.use(csrfGuard);

// ─── Security headers (Phase 029) ───────────────────────────────────────────
// Applied to every response. No external dependency (helmet) is required.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '0'); // rely on CSP, not the legacy auditor
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=()'
  );
  // Content Security Policy. The renderer is a bundled SPA served from the same
  // origin; connect-src allows the local API. 'unsafe-inline' is kept for styles
  // only (Tailwind/Radix inject style tags). Tighten further in Phase 041.
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "img-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self'",
      "connect-src 'self' http://localhost:3000 ws://localhost:3000",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );
  // HSTS only over real HTTPS in production (never on plain localhost).
  if (ENV.isProd && (req.secure || req.headers['x-forwarded-proto'] === 'https')) {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
});

app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(compressionMiddleware);

// ─── Health check ─────────────────────────────────────────────────────────────

// Phase 035 — observability: liveness (process up), readiness (DB reachable),
// and a health summary. Liveness must never touch the DB; readiness does.
app.get('/api/live', (_req, res) => {
  res.status(200).json({ status: 'alive', uptime: process.uptime() });
});

app.get('/api/ready', async (_req, res) => {
  let dbReady = false;
  try {
    const db = await getDb();
    dbReady = !!db;
  } catch {
    dbReady = false;
  }
  res.status(dbReady ? 200 : 503).json({
    status: dbReady ? 'ready' : 'not-ready',
    dbReady,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', async (_req, res) => {
  let dbReady = false;
  try {
    dbReady = !!(await getDb());
  } catch {
    dbReady = false;
  }
  res.status(dbReady ? 200 : 503).json({
    status: dbReady ? 'healthy' : 'degraded',
    dbReady,
    version: process.env.npm_package_version || '1.0.0',
    env: ENV.NODE_ENV,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ─── OAuth2 routes ────────────────────────────────────────────────────────────

// OAuth2 initiation endpoint (redirects to Google/Outlook)
app.get('/api/oauth/:provider/connect', (req, res) => {
  try {
    const { provider } = req.params;
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter' });
    }
    
    if (provider !== 'gmail' && provider !== 'outlook') {
      return res.status(400).json({ error: 'Invalid provider. Use gmail or outlook' });
    }
    
    console.log(`[OAuth2] Initiating ${provider} connection for user ${userId}`);
    
    // Generate authorization URL and redirect
    const authUrl = beginOAuthFlow(provider as 'gmail' | 'outlook', userId);
    res.redirect(authUrl);
  } catch (error) {
    console.error('[OAuth2] Connect error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to initiate OAuth flow' 
    });
  }
});

// Mount OAuth2 callback routes
app.use(oauth2CallbacksRouter);

// ─── tRPC middleware ──────────────────────────────────────────────────────────

app.use(
  '/api/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// ─── Static files (Production) ────────────────────────────────────────────────

if (!isDev) {
  // In a packaged Electron app, we need to find the renderer files relative to this file
  // dist/main/server/index.js -> dist/renderer
  const possiblePaths = [
    path.join(__dirname, '..', 'renderer'), // dist/server -> dist/renderer
    path.join(__dirname, '..', '..', 'renderer'), // just in case it's in dist/main/server
    path.join((process as any).resourcesPath || __dirname, 'app', 'dist', 'renderer'),
    path.join(process.cwd(), 'dist', 'renderer'),
    path.join(process.cwd(), 'resources', 'app', 'dist', 'renderer'),
  ];

  let rendererPath = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
      rendererPath = p;
      break;
    }
  }

  if (rendererPath) {
    console.log(`[Server] Serving static files from: ${rendererPath}`);
    app.use(express.static(rendererPath));
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/trpc') && !req.path.startsWith('/api')) {
        res.sendFile(path.join(rendererPath, 'index.html'));
      }
    });
  } else {
    console.error(`[Server] Critical: Could not find renderer path in: ${possiblePaths.join(', ')}`);
  }
}
// ─── Lifecycle ──────────────────────────────────────────────────────────────

export async function startServer(port: number = PORT) {
  // Phase 006: validate security-critical configuration BEFORE accepting any
  // request. In production this throws (fail-safe) if secrets are insecure; in
  // development it returns warnings we log loudly so the mode is unmistakable.
  const configWarnings = assertSecurityConfig();
  console.log(`[Server] Environment: ${ENV.NODE_ENV.toUpperCase()}${ENV.isProd ? '' : ' (development — not for production use)'}`);
  for (const w of configWarnings) console.warn(`[config] ${w}`);

  // Pre-warm the DB so migrations run (and any schema issue surfaces) before
  // we start accepting requests. The first signup/login otherwise races with
  // migration and can hit "no such table: users".
  try {
    await getDb();
    console.log('[Server] Database ready.');
  } catch (err) {
    console.error('[Server] Database pre-warm failed:', err);
    // Continue to listen anyway — getDb() will retry on each request, and
    // returning here would prevent the UI from loading entirely.
  }

  return new Promise<void>((resolve) => {
    httpServer.listen(port, () => {
      console.log(`[Server] Integrated backend listening on port ${port}`);

      // Initialize background cron jobs
      initCronScheduler();

      resolve();
    });
  });
}

// Start if run directly (though Electron usually calls startServer)
if (require.main === module) {
  startServer().catch(console.error);
}