/**
 * Phase 107 — quality scoring & confidence display.
 *
 * Derives an HONEST confidence label from a real underlying score. There are no
 * hardcoded confidence constants (the old code used e.g. a fixed 0.98): the label
 * is a pure function of the real match/classification score, and it names the
 * basis so the UI can be transparent about why a confidence is shown.
 */
export type ConfidenceLevel = "high" | "medium" | "low";

export interface Confidence {
  level: ConfidenceLevel;
  /** 0–100, clamped, derived from the real score. */
  percent: number;
  basis: string;
}

/**
 * Map a real score (any non-negative magnitude) to a confidence. `max` lets the
 * caller normalize domain-specific scores; when omitted a 0–100 score is assumed.
 */
export function scoreToConfidence(score: number, opts: { max?: number; basis?: string } = {}): Confidence {
  const max = opts.max && opts.max > 0 ? opts.max : 100;
  const pct = Math.max(0, Math.min(100, Math.round((score / max) * 100)));
  const level: ConfidenceLevel = pct >= 75 ? "high" : pct >= 45 ? "medium" : "low";
  return { level, percent: pct, basis: opts.basis || "match-score" };
}
