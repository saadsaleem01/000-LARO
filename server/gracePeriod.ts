// @ts-nocheck

import { getDb } from './db';
import { users } from './schema';
import { eq } from 'drizzle-orm';
import { notifyOwner } from './notification';

/**
 * Grace Period Service
 * Handle payment failure grace periods to prevent immediate access loss
 */

// Grace period duration in days
export const GRACE_PERIOD_DAYS = 7;

/**
 * Check if user is in grace period
 */
export async function isInGracePeriod(userId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!userResult[0]) return false;

  const user = userResult[0];
  
  // No grace period if not set
  if (!user.gracePeriodEndsAt) return false;

  // Check if grace period has expired
  const now = new Date();
  return now < user.gracePeriodEndsAt;
}

/**
 * Get grace period status for a user
 */
export async function getGracePeriodStatus(userId: string): Promise<{
  inGracePeriod: boolean;
  gracePeriodEndsAt: Date | null;
  daysRemaining: number | null;
}> {
  const db = await getDb();
  if (!db) {
    return { inGracePeriod: false, gracePeriodEndsAt: null, daysRemaining: null };
  }

  const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!userResult[0]) {
    return { inGracePeriod: false, gracePeriodEndsAt: null, daysRemaining: null };
  }

  const user = userResult[0];
  
  if (!user.gracePeriodEndsAt) {
    return { inGracePeriod: false, gracePeriodEndsAt: null, daysRemaining: null };
  }

  const now = new Date();
  const inGracePeriod = now < user.gracePeriodEndsAt;
  
  let daysRemaining = null;
  if (inGracePeriod) {
    const msRemaining = user.gracePeriodEndsAt.getTime() - now.getTime();
    daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
  }

  return {
    inGracePeriod,
    gracePeriodEndsAt: user.gracePeriodEndsAt,
    daysRemaining,
  };
}

/**
 * Start grace period for a user
 */
export async function startGracePeriod(userId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const now = new Date();
  const gracePeriodEndsAt = new Date(now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  await db.update(users)
    .set({
      paymentFailedAt: now,
      gracePeriodEndsAt,
      subscriptionStatus: 'past_due',
    })
    .where(eq(users.id, userId));

  console.log(`[GRACE_PERIOD] Started ${GRACE_PERIOD_DAYS}-day grace period for user ${userId}, expires at ${gracePeriodEndsAt.toISOString()}`);

  // Notify owner
  const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const userName = userResult[0]?.name || userResult[0]?.email || 'User';
  
  await notifyOwner({
    title: `⚠️ Payment Failed - Grace Period Started`,
    content: `User "${userName}" (${userId}) payment failed. Grace period started: ${GRACE_PERIOD_DAYS} days until access is restricted. Expires: ${gracePeriodEndsAt.toLocaleString()}`,
  });
}

/**
 * Clear grace period (payment succeeded)
 */
export async function clearGracePeriod(userId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.update(users)
    .set({
      paymentFailedAt: null,
      gracePeriodEndsAt: null,
      subscriptionStatus: 'active',
    })
    .where(eq(users.id, userId));

  console.log(`[GRACE_PERIOD] Cleared grace period for user ${userId} (payment succeeded)`);
}

/**
 * Send grace period reminder notifications
 */
export async function sendGracePeriodReminders(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();
  
  // Find users in grace period
  const usersInGracePeriod = await db
    .select()
    .from(users)
    .where(eq(users.subscriptionStatus, 'past_due'));

  for (const user of usersInGracePeriod) {
    if (!user.gracePeriodEndsAt) continue;

    const msRemaining = user.gracePeriodEndsAt.getTime() - now.getTime();
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

    // Send reminders at day 3 and day 1
    if (daysRemaining === 3 || daysRemaining === 1) {
      const userName = user.name || user.email || 'User';
      
      await notifyOwner({
        title: `🚨 Grace Period Reminder: ${daysRemaining} day${daysRemaining > 1 ? 's' : ''} remaining`,
        content: `User "${userName}" (${user.id}) has ${daysRemaining} day${daysRemaining > 1 ? 's' : ''} left in their grace period. Payment failed on ${user.paymentFailedAt?.toLocaleDateString()}. Access will be restricted on ${user.gracePeriodEndsAt.toLocaleDateString()}.`,
      });
      
      console.log(`[GRACE_PERIOD] Sent ${daysRemaining}-day reminder for user ${user.id}`);
    }

    // Expire grace period if time is up
    if (daysRemaining <= 0) {
      await db.update(users)
        .set({
          subscriptionStatus: 'canceled',
          subscriptionTier: 'free',
        })
        .where(eq(users.id, user.id));

      await notifyOwner({
        title: `🔒 Grace Period Expired`,
        content: `User "${userName}" (${user.id}) grace period has expired. Account downgraded to free tier. Payment failed on ${user.paymentFailedAt?.toLocaleDateString()}.`,
      });

      console.log(`[GRACE_PERIOD] Expired grace period for user ${user.id}, downgraded to free tier`);
    }
  }
}
