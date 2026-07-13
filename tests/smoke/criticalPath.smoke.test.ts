/**
 * Phase 003 — Critical Path Smoke Test
 * =====================================================================
 * The critical path for LARO (per the Giant Codex Goal Prompt) is:
 *
 *   User account -> case intake -> evidence ingestion -> legal-area
 *   classification -> lawyer matching -> outreach draft -> human review
 *   -> send via provider -> response tracking -> outcome -> export package.
 *
 * This suite is intentionally HONEST, not green-by-construction. It:
 *   (1) exercises the units of the critical path that are genuinely wired
 *       and pure (no DB / no native modules), asserting real behaviour; and
 *   (2) records the steps that are NOT yet wired end-to-end as `todo`
 *       markers that name the phase which will implement them.
 *
 * As later phases make a step real, its `todo` becomes a real `it(...)`
 * assertion. A green run here means "the wired units still behave"; it does
 * NOT claim the whole path works. See docs/CRITICAL_PATH.md for the full
 * status table and the manual end-to-end verification steps.
 */
import { describe, it, expect } from 'vitest';
import {
  validateAndNormalizeLegalAreas,
  parseLegalAreas,
  sanitizeLegalAreas,
  VALID_LEGAL_AREAS,
} from '../../server/legalAreasValidator';

describe('Critical path — legal-area normalization (wired, pure)', () => {
  it('normalizes a single valid area string into a JSON array', () => {
    const res = validateAndNormalizeLegalAreas('Employment Law');
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(JSON.parse(res.data)).toEqual(['Employment Law']);
    }
  });

  it('accepts an array of valid areas', () => {
    const res = validateAndNormalizeLegalAreas(['Family Law', 'Contract Law']);
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(JSON.parse(res.data)).toEqual(['Family Law', 'Contract Law']);
    }
  });

  it('rejects an unknown legal area', () => {
    const res = validateAndNormalizeLegalAreas(['Not A Real Area']);
    expect(res.valid).toBe(false);
  });

  it('rejects empty input', () => {
    expect(validateAndNormalizeLegalAreas(null).valid).toBe(false);
    expect(validateAndNormalizeLegalAreas([]).valid).toBe(false);
  });

  it('round-trips through sanitize + parse without losing valid areas', () => {
    const stored = sanitizeLegalAreas(['Tax Law', 'Litigation']);
    expect(parseLegalAreas(stored)).toEqual(['Tax Law', 'Litigation']);
  });

  it('parse drops values not in the canonical list', () => {
    const stored = JSON.stringify(['Tax Law', 'Bogus']);
    expect(parseLegalAreas(stored)).toEqual(['Tax Law']);
  });

  it('exposes a non-empty canonical legal-area vocabulary', () => {
    expect(VALID_LEGAL_AREAS.length).toBeGreaterThan(5);
    expect(VALID_LEGAL_AREAS).toContain('Other');
  });
});

/**
 * Steps that are NOT yet wired end-to-end. These are `todo` (not `skip`) so
 * they show up as pending work in the runner and are impossible to mistake for
 * passing coverage. Each names the phase that will make it a real assertion.
 * Evidence for each gap is in docs/phase-audit.md and docs/CRITICAL_PATH.md.
 */
describe('Critical path — end-to-end steps pending implementation', () => {
  it.todo('account: signup + login issue and verify a session (needs DB harness) — Phases 007/040');
  it.todo('case intake: create case persists owner + status (needs DB harness) — Phases 005/040');
  it.todo('evidence: upload stores bytes + provenance hash (uploader currently fakes S3) — Phase 015');
  it.todo('classification: case description -> legal areas via classifier (currently echoes caseType) — Phase 025');
  it.todo('matching: UI uses the real scoring engine, not Math.random() — Phase 011');
  it.todo('outreach draft + human approval gate exists before any send — Phase 026');
  it.todo('send: a configured provider actually transmits to the lawyer (no fake "sent") — Phases 012/014');
  it.todo('response tracking: inbound replies link back to the outreach — Phase 027');
  it.todo('export: evidence package renders to PDF/zip — Phases 015/023');
});
