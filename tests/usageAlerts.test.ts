import { describe, it, expect, beforeAll } from 'vitest';
import { checkAndSendUsageAlerts, clearUserAlerts } from './services/usageAlerts';
import { trackUsage, initializeUsageLimits } from './services/usageTracking';
import { upsertUser } from './db';

/**
 * Usage Alerts Tests
 * Tests the 80% and 100% quota warning system
 */

describe('Usage Alerts System', () => {
  const testUserId = 'alert-test-' + Date.now();

  beforeAll(async () => {
    // Create test user (free tier)
    await upsertUser({
      id: testUserId,
      name: 'Alert Test User',
      email: 'alert@example.com',
      role: 'user',
    });

    // Initialize usage limits
    await initializeUsageLimits();
    
    // Clear any existing alerts
    clearUserAlerts(testUserId);
  });

  it('should not send alerts when usage is below 80%', async () => {
    // Use only 5 out of 10 (50%)
    for (let i = 0; i < 5; i++) {
      await trackUsage({
        userId: testUserId,
        resourceType: 'ai_email_analysis',
        quantity: 1,
        metadata: { test: true, iteration: i },
      });
    }

    const alerts = await checkAndSendUsageAlerts(testUserId, 'ai_email_analysis');
    expect(alerts.length).toBe(0);
  });

  it('should send 80% alert when usage crosses threshold', async () => {
    const userId = 'alert-80-' + Date.now();
    
    await upsertUser({
      id: userId,
      name: '80% Test User',
      email: '80@example.com',
      role: 'user',
    });

    clearUserAlerts(userId);

    // Use 8 out of 10 (80%)
    for (let i = 0; i < 8; i++) {
      await trackUsage({
        userId,
        resourceType: 'ai_email_analysis',
        quantity: 1,
        metadata: { test: true },
      });
    }

    const alerts = await checkAndSendUsageAlerts(userId, 'ai_email_analysis');
    
    expect(alerts.length).toBe(1);
    expect(alerts[0].threshold).toBe(80);
    expect(alerts[0].used).toBe(8);
    expect(alerts[0].limit).toBe(10);
  });

  it('should send 100% alert when limit is reached', async () => {
    const userId = 'alert-100-' + Date.now();
    
    await upsertUser({
      id: userId,
      name: '100% Test User',
      email: '100@example.com',
      role: 'user',
    });

    clearUserAlerts(userId);

    // Use all 10 (100%)
    for (let i = 0; i < 10; i++) {
      await trackUsage({
        userId,
        resourceType: 'ai_email_analysis',
        quantity: 1,
        metadata: { test: true },
      });
    }

    const alerts = await checkAndSendUsageAlerts(userId, 'ai_email_analysis');
    
    expect(alerts.length).toBe(1);
    expect(alerts[0].threshold).toBe(100);
    expect(alerts[0].used).toBe(10);
    expect(alerts[0].limit).toBe(10);
  });

  it('should not send duplicate alerts', async () => {
    const userId = 'alert-dup-' + Date.now();
    
    await upsertUser({
      id: userId,
      name: 'Duplicate Test User',
      email: 'dup@example.com',
      role: 'user',
    });

    clearUserAlerts(userId);

    // Use 8 out of 10 (80%)
    for (let i = 0; i < 8; i++) {
      await trackUsage({
        userId,
        resourceType: 'ai_email_analysis',
        quantity: 1,
        metadata: { test: true },
      });
    }

    // First check should send alert
    const alerts1 = await checkAndSendUsageAlerts(userId, 'ai_email_analysis');
    expect(alerts1.length).toBe(1);

    // Second check should not send duplicate
    const alerts2 = await checkAndSendUsageAlerts(userId, 'ai_email_analysis');
    expect(alerts2.length).toBe(0);
  });

  it('should not send alerts for Pro users', async () => {
    const userId = 'alert-pro-' + Date.now();
    
    await upsertUser({
      id: userId,
      name: 'Pro Test User',
      email: 'pro@example.com',
      role: 'user',
      subscriptionStatus: 'active', // Pro user
    });

    clearUserAlerts(userId);

    // Use 100 (way over free tier limit)
    for (let i = 0; i < 100; i++) {
      await trackUsage({
        userId,
        resourceType: 'ai_email_analysis',
        quantity: 1,
        metadata: { test: true },
      });
    }

    const alerts = await checkAndSendUsageAlerts(userId, 'ai_email_analysis');
    
    // Pro users should not get alerts
    expect(alerts.length).toBe(0);
  });

  it('should track different resource types independently', async () => {
    const userId = 'alert-multi-' + Date.now();
    
    await upsertUser({
      id: userId,
      name: 'Multi Resource Test',
      email: 'multi@example.com',
      role: 'user',
    });

    clearUserAlerts(userId);

    // Use 8 email analyses (80%)
    for (let i = 0; i < 8; i++) {
      await trackUsage({
        userId,
        resourceType: 'ai_email_analysis',
        quantity: 1,
        metadata: { test: true },
      });
    }

    // Use only 2 document analyses (20%)
    for (let i = 0; i < 2; i++) {
      await trackUsage({
        userId,
        resourceType: 'ai_document_analysis',
        quantity: 1,
        metadata: { test: true },
      });
    }

    const emailAlerts = await checkAndSendUsageAlerts(userId, 'ai_email_analysis');
    const docAlerts = await checkAndSendUsageAlerts(userId, 'ai_document_analysis');
    
    // Should alert for email but not documents
    expect(emailAlerts.length).toBe(1);
    expect(docAlerts.length).toBe(0);
  });
});
