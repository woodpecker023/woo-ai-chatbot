import { getDbClient } from '@woo-ai/database';
import { usageMetrics, stores, pricingPlans } from '@woo-ai/database';
import { eq, and, sql, desc } from 'drizzle-orm';
import { getCurrentMonthKey } from '@woo-ai/shared';

export type UsageStatus = 'ok' | 'warning' | 'critical' | 'exceeded';

export interface StoreUsage {
  storeId: string;
  plan: {
    id: string | null;
    name: string;
    displayName: string;
    limit: number;
  };
  currentMonth: string;
  messageCount: number;
  remaining: number;
  percentUsed: number;
  resetsAt: string;
  status: UsageStatus;
}

export interface UsageHistory {
  month: string;
  count: number;
}

/**
 * Get the first day of next month as ISO string
 */
function getNextMonthReset(): string {
  const now = new Date();
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return nextMonth.toISOString();
}

/**
 * Determine usage status based on percentage used
 */
function getUsageStatus(percentUsed: number, limit: number): UsageStatus {
  if (limit === -1) return 'ok'; // Unlimited
  if (percentUsed >= 100) return 'exceeded';
  if (percentUsed >= 95) return 'critical';
  if (percentUsed >= 80) return 'warning';
  return 'ok';
}

/**
 * Get current usage stats for a store
 */
export async function getStoreUsage(storeId: string): Promise<StoreUsage> {
  const db = getDbClient();
  const monthKey = getCurrentMonthKey();

  // Get store with its plan
  const store = await db.query.stores.findFirst({
    where: eq(stores.id, storeId),
  });

  if (!store) {
    throw new Error('Store not found');
  }

  // Get plan details (or default to free)
  let plan = null;
  if (store.planId) {
    plan = await db.query.pricingPlans.findFirst({
      where: eq(pricingPlans.id, store.planId),
    });
  }

  // Default to free tier if no plan
  const planName = plan?.name || 'free';
  const planDisplayName = plan?.displayName || 'Free';
  const limit = plan?.monthlyMessageLimit ?? 100; // Free tier = 100

  // Get current month's usage
  const usage = await db.query.usageMetrics.findFirst({
    where: and(
      eq(usageMetrics.storeId, storeId),
      eq(usageMetrics.month, monthKey)
    ),
  });

  const messageCount = usage?.messageCount || 0;
  const remaining = limit === -1 ? Infinity : Math.max(0, limit - messageCount);
  const percentUsed = limit === -1 ? 0 : (messageCount / limit) * 100;

  return {
    storeId,
    plan: {
      id: plan?.id || null,
      name: planName,
      displayName: planDisplayName,
      limit,
    },
    currentMonth: monthKey,
    messageCount,
    remaining: limit === -1 ? -1 : remaining,
    percentUsed: Math.round(percentUsed * 10) / 10,
    resetsAt: getNextMonthReset(),
    status: getUsageStatus(percentUsed, limit),
  };
}

/**
 * Check if a store can send messages (hasn't exceeded limit)
 */
export async function canSendMessage(storeId: string): Promise<{
  allowed: boolean;
  usage: StoreUsage;
}> {
  const usage = await getStoreUsage(storeId);
  const allowed = usage.status !== 'exceeded';
  return { allowed, usage };
}

/**
 * Increment message count for a store
 */
export async function incrementUsage(storeId: string): Promise<void> {
  const db = getDbClient();
  const monthKey = getCurrentMonthKey();

  await db
    .insert(usageMetrics)
    .values({
      storeId,
      month: monthKey,
      messageCount: 1,
    })
    .onConflictDoUpdate({
      target: [usageMetrics.storeId, usageMetrics.month],
      set: {
        messageCount: sql`${usageMetrics.messageCount} + 1`,
        updatedAt: new Date(),
      },
    });
}

/**
 * Get usage history for the last N months
 */
export async function getUsageHistory(storeId: string, months: number = 6): Promise<UsageHistory[]> {
  const db = getDbClient();

  const history = await db
    .select({
      month: usageMetrics.month,
      count: usageMetrics.messageCount,
    })
    .from(usageMetrics)
    .where(eq(usageMetrics.storeId, storeId))
    .orderBy(desc(usageMetrics.month))
    .limit(months);

  return history.map(h => ({
    month: h.month,
    count: h.count,
  }));
}
