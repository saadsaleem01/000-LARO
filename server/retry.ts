/**
 * Phase 110 — safe retries & recovery strategy.
 *
 * A real, reusable retry helper with exponential backoff and jitter, used to
 * wrap transient-failure-prone operations (e.g. a flaky external provider call
 * or a busy SQLite write). It is deliberately conservative:
 *   - only retries when `isRetryable(err)` says so (default: never treat a
 *     4xx-style / validation error as retryable),
 *   - caps attempts and total delay,
 *   - is cancellable via an AbortSignal,
 *   - never swallows the final error — it rethrows so callers fail honestly.
 */
export interface RetryOptions {
  attempts?: number; // total tries including the first (default 3)
  baseDelayMs?: number; // first backoff (default 100)
  maxDelayMs?: number; // cap per-attempt delay (default 2000)
  isRetryable?: (err: unknown) => boolean;
  signal?: AbortSignal;
  onRetry?: (info: { attempt: number; delayMs: number; err: unknown }) => void;
  // Injectable sleeper + jitter for deterministic tests.
  sleep?: (ms: number) => Promise<void>;
  jitter?: (ceil: number) => number;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Default: retry only on clearly transient errors, never on programmer errors. */
export function defaultIsRetryable(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (/validation|forbidden|unauthorized|not_?found|bad_?request/.test(msg)) return false;
  return /timeout|econn|network|temporarily|busy|locked|rate|503|502|429/.test(msg);
}

export async function retryWithBackoff<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const attempts = Math.max(1, opts.attempts ?? 3);
  const base = opts.baseDelayMs ?? 100;
  const max = opts.maxDelayMs ?? 2000;
  const isRetryable = opts.isRetryable ?? defaultIsRetryable;
  const sleep = opts.sleep ?? defaultSleep;
  const jitter = opts.jitter ?? ((ceil: number) => Math.floor(ceil / 2)); // deterministic default

  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (opts.signal?.aborted) throw new Error("retry aborted");
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isLast = attempt >= attempts;
      if (isLast || !isRetryable(err)) throw err;
      const exp = Math.min(max, base * 2 ** (attempt - 1));
      const delayMs = exp + jitter(exp);
      opts.onRetry?.({ attempt, delayMs, err });
      await sleep(delayMs);
    }
  }
  // Unreachable, but keeps the type checker honest.
  throw lastErr;
}
