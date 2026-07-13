/**
 * Phase 006 — configuration validation and startup guards.
 *
 * Verifies the fail-safe behaviour of assertSecurityConfig():
 *  - in production with insecure/placeholder secrets it THROWS (refuses to boot);
 *  - in production with strong secrets it passes;
 *  - in development it does not throw but returns warnings.
 *
 * ENV captures process.env at module-init, so each case sets env then imports
 * the module fresh via vi.resetModules().
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ORIGINAL = { ...process.env };

async function loadEnv() {
  vi.resetModules();
  return await import('../../server/_core/env');
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('Phase 006 — assertSecurityConfig', () => {
  it('throws in production when JWT_SECRET is the insecure default', async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'change-this-secret';
    process.env.COOKIE_SECRET = 'a-strong-random-cookie-secret-value-1234567890';
    const { assertSecurityConfig, ConfigError } = await loadEnv();
    expect(() => assertSecurityConfig()).toThrow(ConfigError);
  });

  it('throws in production when secrets are empty', async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = '';
    process.env.COOKIE_SECRET = '';
    const { assertSecurityConfig } = await loadEnv();
    expect(() => assertSecurityConfig()).toThrow();
  });

  it('passes in production when strong secrets are set', async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'f7c3bc1d808e04732adf679965ccc34ca7ae3441';
    process.env.COOKIE_SECRET = '9b74c9897bac770ffc029102a200c5de13cb2f31';
    const { assertSecurityConfig } = await loadEnv();
    expect(() => assertSecurityConfig()).not.toThrow();
  });

  it('does not throw in development but reports insecure-default warnings', async () => {
    process.env.NODE_ENV = 'development';
    process.env.JWT_SECRET = 'change-this-secret';
    process.env.COOKIE_SECRET = 'change-this-cookie-secret';
    const { assertSecurityConfig } = await loadEnv();
    let warnings: string[] = [];
    expect(() => { warnings = assertSecurityConfig(); }).not.toThrow();
    expect(warnings.some((w) => w.includes('JWT_SECRET'))).toBe(true);
  });
});
