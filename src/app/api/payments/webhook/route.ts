import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { verifyWebhookSignature } from "@/lib/payments/safepay";
import { activateSubscription } from "@/lib/plans/subscription";
import type { Plan } from "@/lib/plans/limits";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-sfpy-signature") ?? "";
  const rawBody   = await req.text();

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tracker = (payload?.data as Record<string, unknown>)?.tracker as Record<string, unknown>;
  const token   = tracker?.token as string | undefined;
  const state   = tracker?.state as string | undefined;

  if (!token) return NextResponse.json({ received: true });

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.trackerToken, token))
    .limit(1);

  if (!payment) return NextResponse.json({ received: true });

  if (state === "TRACKER_ENDED") {
    if (!payment.period) {
      console.error(`[webhook] Payment ${payment.id} has no period — cannot activate`);
      return NextResponse.json({ received: true });
    }

    // Atomic claim — only one of (webhook / verify) will win
    const [claimed] = await db
      .update(payments)
      .set({ status: "SUCCEEDED", updatedAt: new Date() })
      .where(and(eq(payments.id, payment.id), eq(payments.status, "PENDING")))
      .returning({ id: payments.id });

    if (claimed) {
      await activateSubscription(payment.userId, payment.plan as Plan, payment.period);
    }
  } else if (payment.status === "PENDING") {
    // TRACKER_EXPIRED, TRACKER_CANCELLED, or other failure — only downgrade if still PENDING
    await db
      .update(payments)
      .set({ status: "FAILED", updatedAt: new Date() })
      .where(and(eq(payments.id, payment.id), eq(payments.status, "PENDING")));
  }

  // Must respond within 10s with 200 or Safepay retries
  return NextResponse.json({ received: true });
}
