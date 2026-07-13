import { describe, it, expect, beforeAll } from 'vitest';
import { startGracePeriod, clearGracePeriod, isInGracePeriod, getGracePeriodStatus, GRACE_PERIOD_DAYS } from './services/gracePeriod';
import { checkUsageLimit } from './services/usageTracking';
import { upsertUser, getDb } from './db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Grace Period Tests
 * Tests the 7-day grace period for payment failures
 */

describe('Grace Period System', () => {
  const testUserId = 'grace-test-' + Date.now();

  beforeAll(async () => {
    // Create test Pro user
    await upsertUser({
      id: testUserId,
      name: 'Grace Period Test User',
      email: 'grace@example.com',
      role: 'user',
      subscriptionStatus: 'active',
      subscriptionTier: 'pro',
    });
  });

  it('should start grace period when payment fails', async () => {
    await startGracePeriod(testUserId);

    const db = await getDb();
    const user = await db!.select().from(users).where(eq(users.id, testUserId)).limit(1);

    expect(user[0].subscriptionStatus).toBe('past_due');
    expect(user[0].paymentFailedAt).toBeTruthy();
    expect(user[0].gracePeriodEndsAt).toBeTruthy();

    // Grace period should be 7 days from now
    const expectedEnd = new Date(Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    const actualEnd = new Date(user[0].gracePeriodEndsAt!);
    const diff = Math.abs(actualEnd.getTime() - expectedEnd.getTime());
    
    // Allow 5 second tolerance
    expect(diff).toBeLessThan(5000);
  });

  it('should detect user is in grace period', async () => {
    const inGracePeriod = await isInGracePeriod(testUserId);
    expect(inGracePeriod).toBe(true);
  });

  it('should return correct grace period status', async () => {
    const status = await getGracePeriodStatus(testUserId);

    expect(status.inGracePeriod).toBe(true);
    expect(status.gracePeriodEndsAt).toBeTruthy();
    expect(status.daysRemaining).toBe(GRACE_PERIOD_DAYS);
  });

  it('should allow unlimited usage during grace period', async () => {
    const limitCheck = await checkUsageLimit(testUserId, 'ai_email_analysis');

    expect(limitCheck.allowed).toBe(true);
    expect(limitCheck.limit).toBe(-1); // Unlimited
  });

  it('should clear grace period when payment succeeds', async () => {
    await clearGracePeriod(testUserId);

    const db = await getDb();
    const user = await db!.select().from(users).where(eq(users.id, testUserId)).limit(1);

    expect(user[0].subscriptionStatus).toBe('active');
    expect(user[0].paymentFailedAt).toBeNull();
    expect(user[0].gracePeriodEndsAt).toBeNull();
  });

  it('should not be in grace period after clearing', async () => {
    const inGracePeriod = await isInGracePeriod(testUserId);
    expect(inGracePeriod).toBe(false);
  });

  it('should detect expired grace period', async () => {
    const expiredUserId = 'grace-expired-' + Date.now();
    
    await upsertUser({
      id: expiredUserId,
      name: 'Expired Grace Test',
      email: 'expired@example.com',
      role: 'user',
      subscriptionStatus: 'past_due',
      subscriptionTier: 'pro',
    });

    // Set grace period to yesterday (expired)
    const db = await getDb();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await db!.update(users)
      .set({
        paymentFailedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        gracePeriodEndsAt: yesterday,
      })
      .where(eq(users.id, expiredUserId));

    const inGracePeriod = await isInGracePeriod(expiredUserId);
    expect(inGracePeriod).toBe(false);

    const status = await getGracePeriodStatus(expiredUserId);
    expect(status.inGracePeriod).toBe(false);
    expect(status.daysRemaining).toBeNull();
  });

  it('should block usage after grace period expires', async () => {
    const expiredUserId = 'grace-block-' + Date.now();
    
    await upsertUser({
      id: expiredUserId,
      name: 'Grace Block Test',
      email: 'block@example.com',
      role: 'user',
      subscriptionStatus: 'past_due',
      subscriptionTier: 'free', // Downgraded to free after expiration
    });

    // Set expired grace period
    const db = await getDb();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await db!.update(users)
      .set({
        paymentFailedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        gracePeriodEndsAt: yesterday,
      })
      .where(eq(users.id, expiredUserId));

    // Should be blocked by free tier limits (not in grace period)
    const limitCheck = await checkUsageLimit(expiredUserId, 'ai_email_analysis');
    
    // Free tier has limits
    expect(limitCheck.limit).toBeGreaterThan(0);
  });
});
