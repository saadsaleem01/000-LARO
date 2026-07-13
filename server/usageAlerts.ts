import { getDb } from './db';
import { usageTracking, usageLimits, users } from './schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { sendUsageAlertEmail } from './userNotification';
import { RESOURCE_BASE_COSTS, type ResourceType } from './usageTracking';

/**
 * Usage Alerts Service
 * Send notifications when users approach or exceed their usage limits
 */

interface UsageAlert {
  userId: string;
  resourceType: ResourceType;
  threshold: number; // 80 or 100
  used: number;
  limit: number;
  timestamp: Date;
}

// Track sent alerts to prevent duplicates (in-memory for now)
const sentAlerts = new Map<string, Set<string>>();

/**
 * Get alert key for deduplication
 */
function getAlertKey(userId: string, resourceType: ResourceType, threshold: number): string {
  return `${userId}:${resourceType}:${threshold}`;
}

/**
 * Check if alert was already sent this billing period
 */
function wasAlertSent(userId: string, resourceType: ResourceType, threshold: number): boolean {
  const key = getAlertKey(userId, resourceType, threshold);
  const userAlerts = sentAlerts.get(userId);
  return userAlerts?.has(key) || false;
}

/**
 * Mark alert as sent
 */
function markAlertSent(userId: string, resourceType: ResourceType, threshold: number): void {
  const key = getAlertKey(userId, resourceType, threshold);
  if (!sentAlerts.has(userId)) {
    sentAlerts.set(userId, new Set());
  }
  sentAlerts.get(userId)!.add(key);
}

/**
 * Clear alerts for a user (call at start of new billing period)
 */
export function clearUserAlerts(userId: string): void {
  sentAlerts.delete(userId);
}

/**
 * Check usage and send alerts if thresholds are crossed
 */
export async function checkAndSendUsageAlerts(
  userId: string,
  resourceType: ResourceType
): Promise<UsageAlert[]> {
  const db = await getDb();
  if (!db) return [];

  // Get user info
  const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!userResult[0]) return [];
  
  const user = userResult[0];
  
  // Only send alerts for free tier users
  if (user.subscriptionStatus === 'active') {
    return [];
  }

  // Get usage limit for user's tier
  const userTier = user.subscriptionTier || 'free';
  const limitResult = await db
    .select()
    .from(usageLimits)
    .where(and(
      eq(usageLimits.tier, userTier),
      eq(usageLimits.resourceType, resourceType)
    ))
    .limit(1);

  if (!limitResult[0]) return [];
  
  const limitValue = limitResult[0].monthlyLimit;
  if (!limitValue) return []; // Unlimited
  
  const limit = parseInt(limitValue);

  // Calculate current billing period
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Get current usage
  const usageResult = await db
    .select({
      total: sql<number>`SUM(CAST(${usageTracking.quantity} AS SIGNED))`,
    })
    .from(usageTracking)
    .where(and(
      eq(usageTracking.userId, userId),
      eq(usageTracking.resourceType, resourceType),
      gte(usageTracking.timestamp, periodStart)
    ));

  const used = Number(usageResult[0]?.total || 0);
  const usagePercent = (used / limit) * 100;

  const alerts: UsageAlert[] = [];

  // Check user email preferences
  const emailPreferences = user.emailPreferences ? JSON.parse(user.emailPreferences) : { usageAlerts80: true, usageAlerts100: true };

  // Check 80% threshold
  if (usagePercent >= 80 && usagePercent < 100 && emailPreferences.usageAlerts80) {
    if (!wasAlertSent(userId, resourceType, 80)) {
      const alert: UsageAlert = {
        userId,
        resourceType,
        threshold: 80,
        used,
        limit,
        timestamp: new Date(),
      };
      
      await sendUsageAlert(user.name || user.email || 'User', user.email || '', alert);
      markAlertSent(userId, resourceType, 80);
      alerts.push(alert);
    }
  }

  // Check 100% threshold
  if (usagePercent >= 100 && emailPreferences.usageAlerts100) {
    if (!wasAlertSent(userId, resourceType, 100)) {
      const alert: UsageAlert = {
        userId,
        resourceType,
        threshold: 100,
        used,
        limit,
        timestamp: new Date(),
      };
      
      await sendUsageAlert(user.name || user.email || 'User', user.email || '', alert);
      markAlertSent(userId, resourceType, 100);
      alerts.push(alert);
    }
  }

  return alerts;
}

/**
 * Send usage alert notification to user
 */
async function sendUsageAlert(userName: string, userEmail: string, alert: UsageAlert): Promise<void> {
  try {
    await sendUsageAlertEmail(
      alert.userId,
      userEmail,
      userName,
      alert.resourceType,
      alert.threshold,
      alert.used,
      alert.limit
    );
    console.log(`[USAGE_ALERT] Sent ${alert.threshold}% alert for ${alert.resourceType} to user ${alert.userId}`);
  } catch (error) {
    console.error('[USAGE_ALERT] Failed to send notification:', error);
  }
}

/**
 * Check all resource types for a user and send alerts
 */
export async function checkAllUsageAlerts(userId: string): Promise<UsageAlert[]> {
  const allAlerts: UsageAlert[] = [];
  
  for (const resourceType of Object.keys(RESOURCE_BASE_COSTS) as ResourceType[]) {
    const alerts = await checkAndSendUsageAlerts(userId, resourceType);
    allAlerts.push(...alerts);
  }
  
  return allAlerts;
}

/**
 * Reset alerts at the start of a new billing period (call from cron)
 */
export async function resetMonthlyAlerts(): Promise<void> {
  console.log('[USAGE_ALERT] Resetting monthly usage alerts');
  sentAlerts.clear();
}
