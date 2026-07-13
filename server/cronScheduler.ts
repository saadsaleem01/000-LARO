import cron from 'node-cron';
import { runAutoCollectionForAllCases } from './autoCollectionService';
import { retryWithBackoff } from './retry';

/**
 * Phase 016 — background jobs, schedulers, and workers.
 *
 * Every scheduled job runs through runJob(), which adds:
 *  - error isolation (a failing job never crashes the scheduler),
 *  - bounded retry with backoff,
 *  - observable status (last run, last success, last error, run count) exposed
 *    via getJobStatus() for the health/observability endpoints.
 *
 * Honesty: the hourly outreach job does NOT send anything. Automated outreach
 * follow-ups require the real send path + human-approval gate (Phase 026), which
 * are not implemented. The job records a heartbeat and clearly logs that
 * follow-ups are disabled, rather than pretending to process outreach.
 */

export interface JobStatus {
  name: string;
  lastRunAt: number | null;
  lastSuccessAt: number | null;
  lastErrorAt: number | null;
  lastError: string | null;
  runs: number;
  failures: number;
  enabled: boolean;
}

const jobStatus = new Map<string, JobStatus>();

function ensureStatus(name: string): JobStatus {
  let s = jobStatus.get(name);
  if (!s) {
    s = {
      name,
      lastRunAt: null,
      lastSuccessAt: null,
      lastErrorAt: null,
      lastError: null,
      runs: 0,
      failures: 0,
      enabled: true,
    };
    jobStatus.set(name, s);
  }
  return s;
}

export function getJobStatus(): JobStatus[] {
  return Array.from(jobStatus.values());
}

/**
 * Run a job with error isolation and bounded retry+backoff. Never throws.
 */
export async function runJob(
  name: string,
  fn: () => Promise<void>,
  opts: { retries?: number; baseDelayMs?: number } = {}
): Promise<void> {
  const { retries = 2, baseDelayMs = 1000 } = opts;
  const s = ensureStatus(name);
  s.runs += 1;
  s.lastRunAt = nowMs();

  try {
    // Phase 110 — delegate to the shared, tested retry primitive. A scheduled job
    // wants to retry on ANY failure (transient or not), so isRetryable is forced
    // true here; the default heuristic is used elsewhere for external calls.
    await retryWithBackoff(fn, {
      attempts: retries + 1,
      baseDelayMs,
      isRetryable: () => true,
      sleep,
      jitter: () => 0, // deterministic backoff for the scheduler
      onRetry: ({ attempt, delayMs, err }) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[Cron] Job "${name}" failed (attempt ${attempt}/${retries + 1}); retrying in ${delayMs}ms:`, msg);
      },
    });
    s.lastSuccessAt = nowMs();
    s.lastError = null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    s.failures += 1;
    s.lastErrorAt = nowMs();
    s.lastError = msg;
    console.error(`[Cron] Job "${name}" failed after ${retries + 1} attempts:`, msg);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Date.now via a helper so it is easy to reason about / stub if needed.
function nowMs(): number {
  return Date.now();
}

export function initCronScheduler() {
  console.log('[Cron] Initializing scheduled tasks...');
  ensureStatus('auto-collection');
  ensureStatus('outreach-heartbeat');

  // Daily auto-collection at 02:00.
  cron.schedule('0 2 * * *', () => {
    void runJob('auto-collection', async () => { await runAutoCollectionForAllCases(); }, { retries: 2 });
  });

  // Hourly outreach heartbeat — intentionally does NOT send anything.
  cron.schedule('0 * * * *', () => {
    void runJob('outreach-heartbeat', async () => {
      console.log('[Cron] Outreach follow-ups are disabled (no send path / approval gate — Phase 026). Heartbeat only.');
    }, { retries: 0 });
  });

  // Phase 027 — daily reminder sweep: creates user notifications for items needing
  // attention (approval-pending, urgent-no-evidence). Idempotent per case/kind/day.
  ensureStatus('reminders');
  cron.schedule('0 8 * * *', () => {
    void runJob('reminders', async () => {
      const { runReminderSweep } = await import('./reminders');
      const res = await runReminderSweep();
      console.log(`[Cron] Reminder sweep: ${res.created} reminder(s) across ${res.users} user(s).`);
    }, { retries: 1 });
  });

  console.log('[Cron] Scheduled tasks loaded:', getJobStatus().map((j) => j.name).join(', '));
}
