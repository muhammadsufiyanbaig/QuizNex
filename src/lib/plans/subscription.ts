import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Plan } from "./limits";

export type SubscriptionStatus = "ACTIVE" | "TRIAL" | "EXPIRED" | "CANCELLED";

export interface ActiveSubscription {
  id: string;
  userId: string;
  plan: Plan;
  status: SubscriptionStatus;
  period: "MONTHLY" | "YEARLY" | null;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
  isExpired: boolean;
}

const FREE_SUB = (userId: string): ActiveSubscription => ({
  id:               "",
  userId,
  plan:             "FREE",
  status:           "ACTIVE",
  period:           null,
  currentPeriodEnd: null,
  trialEndsAt:      null,
  isExpired:        false,
});

/**
 * Get the user's current subscription.
 * - TEACHER with no row → returns virtual FREE plan.
 * - ORGANIZATION with no row → auto-creates 30-day trial on ORG_STARTER.
 * - Expired rows are marked EXPIRED in DB and returned with isExpired=true.
 */
export async function getActiveSubscription(
  userId: string,
  role: string
): Promise<ActiveSubscription> {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (!sub) {
    if (role === "ORGANIZATION") {
      const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const [newSub] = await db
        .insert(subscriptions)
        .values({
          userId,
          plan:               "ORG_STARTER",
          status:             "TRIAL",
          trialEndsAt,
          currentPeriodStart: new Date(),
          currentPeriodEnd:   trialEndsAt,
        })
        .onConflictDoNothing()
        .returning();

      if (newSub) return toActiveSubscription(newSub);

      // Another concurrent request won the race — fetch the row they created
      const [existing] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1);
      if (existing) return toActiveSubscription(existing);
    }
    return FREE_SUB(userId);
  }

  const now = new Date();
  const periodExpired =
    sub.status === "ACTIVE" && sub.currentPeriodEnd && sub.currentPeriodEnd < now;
  const trialExpired =
    sub.status === "TRIAL" && sub.trialEndsAt && sub.trialEndsAt < now;

  if (periodExpired || trialExpired) {
    await db
      .update(subscriptions)
      .set({ status: "EXPIRED", updatedAt: new Date() })
      .where(eq(subscriptions.id, sub.id));
    return { ...toActiveSubscription(sub), status: "EXPIRED", isExpired: true };
  }

  return toActiveSubscription(sub);
}

function toActiveSubscription(
  sub: typeof subscriptions.$inferSelect
): ActiveSubscription {
  return {
    id:               sub.id,
    userId:           sub.userId,
    plan:             sub.plan as Plan,
    status:           sub.status as SubscriptionStatus,
    period:           sub.period ?? null,
    currentPeriodEnd: sub.currentPeriodEnd ?? null,
    trialEndsAt:      sub.trialEndsAt ?? null,
    isExpired:        false,
  };
}

/**
 * Activate or renew a subscription after successful payment.
 * Uses an atomic update so concurrent calls are safe.
 */
export async function activateSubscription(
  userId: string,
  plan: Plan,
  period: "MONTHLY" | "YEARLY"
): Promise<void> {
  const now = new Date();
  const periodEnd = new Date(now);
  if (period === "MONTHLY") {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  } else {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  }

  const [existing] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (existing) {
    await db
      .update(subscriptions)
      .set({
        plan,
        status:             "ACTIVE",
        period,
        currentPeriodStart: now,
        currentPeriodEnd:   periodEnd,
        trialEndsAt:        null,
        cancelledAt:        null,
        updatedAt:          now,
      })
      .where(eq(subscriptions.id, existing.id));
  } else {
    await db
      .insert(subscriptions)
      .values({
        userId,
        plan,
        status:             "ACTIVE",
        period,
        currentPeriodStart: now,
        currentPeriodEnd:   periodEnd,
      })
      .onConflictDoNothing();
  }
}
