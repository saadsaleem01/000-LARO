/**
 * Phase 042 — worker/job test suite.
 *
 * Tests the scheduler's runJob() wrapper: error isolation (never throws),
 * bounded retry with backoff, and observable status via getJobStatus().
 */
import { describe, it, expect } from 'vitest';
import { runJob, getJobStatus } from '../../server/cronScheduler';

describe('Phase 042 — runJob (worker execution)', () => {
  it('records a successful run in status', async () => {
    await runJob('t-success', async () => { /* ok */ }, { baseDelayMs: 1 });
    const s = getJobStatus().find((j) => j.name === 't-success')!;
    expect(s.runs).toBe(1);
    expect(s.failures).toBe(0);
    expect(s.lastSuccessAt).not.toBeNull();
    expect(s.lastError).toBeNull();
  });

  it('never throws when the job fails, and records the failure', async () => {
    // retries: 1, tiny backoff so the test is fast.
    await expect(
      runJob('t-fail', async () => { throw new Error('boom'); }, { retries: 1, baseDelayMs: 1 })
    ).resolves.toBeUndefined();
    const s = getJobStatus().find((j) => j.name === 't-fail')!;
    expect(s.failures).toBe(1);
    expect(s.lastError).toBe('boom');
    expect(s.lastErrorAt).not.toBeNull();
  });

  it('retries then succeeds (recovers)', async () => {
    let attempts = 0;
    await runJob('t-recover', async () => {
      attempts += 1;
      if (attempts < 2) throw new Error('transient');
    }, { retries: 2, baseDelayMs: 1 });
    expect(attempts).toBe(2);
    const s = getJobStatus().find((j) => j.name === 't-recover')!;
    expect(s.failures).toBe(0);
    expect(s.lastSuccessAt).not.toBeNull();
  });
});
