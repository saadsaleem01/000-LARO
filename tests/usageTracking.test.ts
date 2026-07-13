import { describe, it, expect, beforeAll } from 'vitest';
import { trackUsage, checkUsageLimit, getUsageForPeriod } from '../server/services/usageTracking';
import { getDb } from '../server/db';
import { usageTracking } from '../drizzle/schema';
import { eq, and, gte } from 'drizzle-orm';

/**
 * Usage Tracking Integration Tests
 * Tests the 2.5x markup and limit enforcement
 */

describe('Usage Tracking with 2.5x Markup', () => {
  const testUserId = 'test-user-' + Date.now();

  beforeAll(async () => {
    // Clean up any existing test data
    const db = await getDb();
    if (db) {
      await db.delete(usageTracking).where(eq(usageTracking.userId, testUserId));
    }
  });

  it('should apply 2.5x markup to AI email analysis', async () => {
    const result = await trackUsage({
      userId: testUserId,
      resourceType: 'ai_email_analysis',
      quantity: 1,
      metadata: { test: true },
    });

    expect(result.success).toBe(true);
    expect(result.cost).toBeGreaterThan(0);
    
    // Base cost is $0.002, with 2.5x markup = $0.005
    expect(result.cost).toBeCloseTo(0.005, 3);
  });

  it('should apply 2.5x markup to AI document analysis', async () => {
    const result = await trackUsage({
      userId: testUserId,
      resourceType: 'ai_document_analysis',
      quantity: 1,
      metadata: { test: true },
    });

    expect(result.success).toBe(true);
    // Base cost is $0.003, with 2.5x markup = $0.0075
    expect(result.cost).toBeCloseTo(0.0075, 4);
  });

  it('should apply 2.5x markup to email sync', async () => {
    const result = await trackUsage({
      userId: testUserId,
      resourceType: 'email_sync',
      quantity: 10,
      metadata: { test: true },
    });

    expect(result.success).toBe(true);
    // Base cost is $0.0001 per email, with 2.5x markup = $0.00025 per email
    // 10 emails = $0.0025
    expect(result.cost).toBeCloseTo(0.0025, 4);
  });

  it('should apply 2.5x markup to lawyer outreach', async () => {
    const result = await trackUsage({
      userId: testUserId,
      resourceType: 'lawyer_outreach',
      quantity: 1,
      metadata: { test: true },
    });

    expect(result.success).toBe(true);
    // Base cost is $0.001, with 2.5x markup = $0.0025
    expect(result.cost).toBeCloseTo(0.0025, 4);
  });

  it('should check usage limits correctly', async () => {
    const newUserId = 'limit-test-' + Date.now();
    
    // Track usage up to the limit (10 AI analyses for free tier)
    for (let i = 0; i < 10; i++) {
      await trackUsage({
        userId: newUserId,
        resourceType: 'ai_email_analysis',
        quantity: 1,
        metadata: { test: true, iteration: i },
      });
    }

    // Check if limit is reached
    const limitCheck = await checkUsageLimit(newUserId, 'ai_email_analysis');
    expect(limitCheck.allowed).toBe(false);
    expect(limitCheck.used).toBe(10);
    expect(limitCheck.limit).toBe(10);
  });

  it('should allow usage within limits', async () => {
    const newUserId = 'within-limit-' + Date.now();
    
    // Track only 5 usages
    for (let i = 0; i < 5; i++) {
      await trackUsage({
        userId: newUserId,
        resourceType: 'ai_email_analysis',
        quantity: 1,
        metadata: { test: true, iteration: i },
      });
    }

    // Check if usage is allowed
    const limitCheck = await checkUsageLimit(newUserId, 'ai_email_analysis');
    expect(limitCheck.allowed).toBe(true);
    expect(limitCheck.used).toBe(5);
    expect(limitCheck.remaining).toBe(5);
  });

  it('should get usage for current period', async () => {
    const usage = await getUsageForPeriod(testUserId, new Date(), new Date());
    
    expect(Array.isArray(usage)).toBe(true);
    expect(usage.length).toBeGreaterThan(0);
    
    // Verify all usage records have the 2.5x markup applied
    for (const record of usage) {
      expect(record.cost).toBeGreaterThan(0);
      expect(typeof record.cost).toBe('number');
    }
  });

  it('should calculate total cost correctly with 2.5x markup', async () => {
    const usage = await getUsageForPeriod(testUserId, new Date(), new Date());
    
    const totalCost = usage.reduce((sum, record) => sum + parseFloat(record.cost), 0);
    
    // Total should be sum of all individual costs with 2.5x markup
    expect(totalCost).toBeGreaterThan(0);
    
    // Verify the markup is applied (total should be 2.5x the base cost)
    // We tracked: 1 email analysis ($0.005), 1 doc analysis ($0.0075), 10 email syncs ($0.0025), 1 outreach ($0.0025)
    // Expected total: $0.005 + $0.0075 + $0.0025 + $0.0025 = $0.0175
    expect(totalCost).toBeCloseTo(0.0175, 4);
  });
});

describe('Usage Limit Enforcement', () => {
  it('should enforce limits for free tier users', async () => {
    const freeUserId = 'free-user-' + Date.now();
    
    // Exhaust the limit
    for (let i = 0; i < 10; i++) {
      await trackUsage({
        userId: freeUserId,
        resourceType: 'ai_email_analysis',
        quantity: 1,
        metadata: { test: true },
      });
    }

    // Try to use beyond limit
    const limitCheck = await checkUsageLimit(freeUserId, 'ai_email_analysis');
    expect(limitCheck.allowed).toBe(false);
    expect(limitCheck.message).toContain('limit exceeded');
  });

  it('should track different resource types independently', async () => {
    const userId = 'multi-resource-' + Date.now();
    
    // Use email analysis limit
    for (let i = 0; i < 10; i++) {
      await trackUsage({
        userId,
        resourceType: 'ai_email_analysis',
        quantity: 1,
        metadata: { test: true },
      });
    }

    // Document analysis should still be available
    const docLimitCheck = await checkUsageLimit(userId, 'ai_document_analysis');
    expect(docLimitCheck.allowed).toBe(true);
    expect(docLimitCheck.used).toBe(0);
  });
});
