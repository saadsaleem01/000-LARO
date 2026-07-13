import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import { getJobStatus } from '../cronScheduler';
import { getDb } from '../db';

export const healthRouter = router({
  check: publicProcedure
    .query(() => {
      return {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
      };
    }),

  // Phase 016/035 — real readiness that checks the DB, plus scheduled-job status.
  // Protected because it exposes operational internals.
  readiness: protectedProcedure.query(async () => {
    let dbReady = false;
    try {
      const db = await getDb();
      dbReady = !!db;
    } catch {
      dbReady = false;
    }
    const jobs = getJobStatus();
    const anyJobFailing = jobs.some((j) => j.lastErrorAt != null && j.lastErrorAt === j.lastRunAt);
    return {
      status: dbReady && !anyJobFailing ? 'ready' : 'degraded',
      dbReady,
      jobs,
      timestamp: new Date().toISOString(),
    };
  }),
});
