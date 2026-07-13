import { getDb } from './db';
import { usageTracking, usageLimits, users } from './schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { checkAndSendUsageAlerts } from './usageAlerts';

/**
 * Usage Tracking Service
 * Track resource consumption with 2.5x markup for billing
 */

// Markup multiplier for profit margin
const MARKUP_MULTIPLIER = 2.5;

// Base costs per resource type (in cents)
export const RESOURCE_BASE_COSTS = {
  ai_email_analysis: 2,        // $0.02 per email analyzed
  ai_document_analysis: 5,     // $0.05 per document analyzed
  ai_legal_inference: 3,       // $0.03 per legal inference
  email_sync: 0.1,             // $0.001 per email fetched
  lawyer_outreach: 1,          // $0.01 per lawyer contacted
  document_generation: 2,      // $0.02 per document generated
  case_analysis: 10,           // $0.10 per case analysis
  other: 1,                    // $0.01 default
} as const;

export type ResourceType = keyof typeof RESOURCE_BASE_COSTS;

/**
 * Calculate billed cost with 2.5x markup
 */
export function calculateBilledCost(baseCost: number): number {
  return Math.ceil(baseCost * MARKUP_MULTIPLIER);
}

/**
 * Track resource usage
 */
export async function trackUsage(params: {
  userId: string;
  resourceType: ResourceType;
  quantity?: number;
  metadata?: Record<string, any>;
  caseId?: string;
}): Promise<{ success: boolean; usageId: string; billedCost: number }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const quantity = params.quantity || 1;
  const baseCostPerUnit = RESOURCE_BASE_COSTS[params.resourceType];
  const totalBaseCost = baseCostPerUnit * quantity;
  const totalBilledCost = calculateBilledCost(totalBaseCost);

  const usageId = crypto.randomBytes(16).toString('hex');

  await db.insert(usageTracking).values({
    id: usageId,
    userId: params.userId,
    resourceType: params.resourceType,
    quantity: quantity.toString(),
    baseCost: totalBaseCost.toFixed(2),
    billedCost: totalBilledCost.toFixed(2),
    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    caseId: params.caseId,
    reportedToStripe: false,
    timestamp: new Date(),
  });

  console.log(`[USAGE_TRACKING] Tracked ${params.resourceType} for user ${params.userId}: ${quantity} units, $${(totalBilledCost / 100).toFixed(2)}`);

  // Check for usage alerts (async, don't block response)
  checkAndSendUsageAlerts(params.userId, params.resourceType).catch((err: any) => {
    console.error('[USAGE_TRACKING] Failed to check usage alerts:', err);
  });

  return {
    success: true,
    usageId,
    billedCost: totalBilledCost,
  };
}

/**
 * Get user's usage for current billing period
 */
export async function getUserUsage(
  userId: string,
  periodStart?: Date,
  periodEnd?: Date
): Promise<{
  total: number;
  byResourceType: Record<string, { quantity: number; cost: number }>;
  records: any[];
}> {
  const db = await getDb();
  if (!db) return { total: 0, byResourceType: {}, records: [] };

  // Default to current month if no period specified
  const start = periodStart || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = periodEnd || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

  const records = await db
    .select()
    .from(usageTracking)
    .where(and(
      eq(usageTracking.userId, userId),
      gte(usageTracking.timestamp, start),
      lte(usageTracking.timestamp, end)
    ))
    .orderBy(usageTracking.timestamp);

  // Calculate totals
  let total = 0;
  const byResourceType: Record<string, { quantity: number; cost: number }> = {};

  for (const record of records) {
    const cost = parseFloat(record.billedCost || '0');
    total += cost;

    if (record.resourceType) {
      if (!byResourceType[record.resourceType]) {
        byResourceType[record.resourceType] = { quantity: 0, cost: 0 };
      }

      byResourceType[record.resourceType].quantity += parseInt(record.quantity || '0');
      byResourceType[record.resourceType].cost += cost;
    }
  }

  return {
    total,
    byResourceType,
    records,
  };
}

/**
 * Check if user has exceeded usage limits (free tier)
 */
export async function checkUsageLimit(
  userId: string,
  resourceType: ResourceType
): Promise<{ allowed: boolean; limit: number; used: number; remaining: number }> {
  const db = await getDb();
  if (!db) return { allowed: true, limit: -1, used: 0, remaining: -1 };

  // Get user's subscription tier
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user[0]) {
    throw new Error('User not found');
  }

  const tier = user[0].subscriptionTier;
  const subscriptionStatus = user[0].subscriptionStatus;

  // Pro and Enterprise tiers have unlimited usage (metered billing)
  if (tier === 'pro' || tier === 'enterprise') {
    return { allowed: true, limit: -1, used: 0, remaining: -1 };
  }

  // Users in grace period (past_due) still get Pro access
  if (subscriptionStatus === 'past_due') {
    const { isInGracePeriod } = await import('./gracePeriod');
    const inGracePeriod = await isInGracePeriod(user[0].id);
    
    if (inGracePeriod) {
      console.log(`[USAGE_TRACKING] User ${user[0].id} in grace period, allowing unlimited usage`);
      return { allowed: true, limit: -1, used: 0, remaining: -1 };
    }
  }

  // Get limit for free tier
  const limits = await db
    .select()
    .from(usageLimits)
    .where(and(
      eq(usageLimits.tier, tier || 'free'),
      eq(usageLimits.resourceType, resourceType)
    ))
    .limit(1);

  if (!limits[0] || !limits[0].monthlyLimit) {
    // No limit defined, allow
    return { allowed: true, limit: -1, used: 0, remaining: -1 };
  }

  const limit = parseInt(limits[0].monthlyLimit);

  // Get current month usage
  const { byResourceType } = await getUserUsage(userId);
  const used = byResourceType[resourceType]?.quantity || 0;
  const remaining = Math.max(0, limit - used);

  return {
    allowed: used < limit,
    limit,
    used,
    remaining,
  };
}

/**
 * Get unreported usage for Stripe reporting
 */
export async function getUnreportedUsage(userId?: string): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(usageTracking.reportedToStripe, false)];
  
  if (userId) {
    conditions.push(eq(usageTracking.userId, userId));
  }

  return await db
    .select()
    .from(usageTracking)
    .where(and(...conditions))
    .orderBy(usageTracking.timestamp);
}

/**
 * Mark usage as reported to Stripe
 */
export async function markUsageReported(
  usageIds: string[],
  stripeUsageRecordId?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  for (const usageId of usageIds) {
    await db
      .update(usageTracking)
      .set({
        reportedToStripe: true,
        stripeUsageRecordId,
      })
      .where(eq(usageTracking.id, usageId));
  }
}

/**
 * Initialize default usage limits for free tier
 */
export async function initializeUsageLimits(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const defaultLimits = [
    { tier: 'free' as const, resourceType: 'ai_email_analysis' as const, monthlyLimit: '10', description: 'AI email analysis (10 per month)' },
    { tier: 'free' as const, resourceType: 'ai_document_analysis' as const, monthlyLimit: '5', description: 'AI document analysis (5 per month)' },
    { tier: 'free' as const, resourceType: 'ai_legal_inference' as const, monthlyLimit: '10', description: 'AI legal inference (10 per month)' },
    { tier: 'free' as const, resourceType: 'email_sync' as const, monthlyLimit: '50', description: 'Email sync (50 emails per month)' },
    { tier: 'free' as const, resourceType: 'lawyer_outreach' as const, monthlyLimit: '5', description: 'Lawyer outreach (5 per month)' },
    { tier: 'free' as const, resourceType: 'document_generation' as const, monthlyLimit: '3', description: 'Document generation (3 per month)' },
    { tier: 'free' as const, resourceType: 'case_analysis' as const, monthlyLimit: '2', description: 'Case analysis (2 per month)' },
  ];

  for (const limit of defaultLimits) {
    const existing = await db
      .select()
      .from(usageLimits)
      .where(and(
        eq(usageLimits.tier, limit.tier),
        eq(usageLimits.resourceType, limit.resourceType)
      ))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(usageLimits).values({
        id: crypto.randomBytes(16).toString('hex'),
        ...limit,
      });
    }
  }

  console.log('[USAGE_TRACKING] Initialized default usage limits');
}

