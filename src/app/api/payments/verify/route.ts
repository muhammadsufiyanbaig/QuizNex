import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyPayment } from "@/lib/payments/safepay";
import { activateSubscription } from "@/lib/plans/subscription";
import type { Plan } from "@/lib/plans/limits";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tracker = req.nextUrl.searchParams.get("tracker");
  if (!tracker) return NextResponse.json({ error: "Missing tracker" }, { status: 400 });

  const [payment] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.trackerToken, tracker),
        eq(payments.userId, session.user.id)
      )
    )
    .limit(1);

  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  // Already activated by webhook or a prior verify call
  if (payment.status === "SUCCEEDED") {
    return NextResponse.json({ success: true, plan: payment.plan, alreadyProcessed: true });
  }

  const { succeeded, reference } = await verifyPayment(tracker);

  if (!succeeded) {
    // Re-check in case the webhook activated the payment between our DB read and the Safepay call
    const [recheck] = await db
      .select({ status: payments.status })
      .from(payments)
      .where(eq(payments.id, payment.id))
      .limit(1);

    if (recheck?.status === "SUCCEEDED") {
      return NextResponse.json({ success: true, plan: payment.plan });
    }

    // Atomically mark FAILED only if still PENDING (prevents overwriting webhook SUCCEEDED)
    await db
      .update(payments)
      .set({ status: "FAILED", updatedAt: new Date() })
      .where(and(eq(payments.id, payment.id), eq(payments.status, "PENDING")));

    return NextResponse.json({ success: false, error: "Payment not completed" }, { status: 402 });
  }

  if (!payment.period) {
    return NextResponse.json({ error: "Payment period missing" }, { status: 500 });
  }

  // Atomically claim processing rights — only one of (verify / webhook) will win
  const [claimed] = await db
    .update(payments)
    .set({ status: "SUCCEEDED", safepayReference: reference ?? null, updatedAt: new Date() })
    .where(and(eq(payments.id, payment.id), eq(payments.status, "PENDING")))
    .returning({ id: payments.id });

  if (claimed) {
    await activateSubscription(session.user.id, payment.plan as Plan, payment.period);
  }

  return NextResponse.json({ success: true, plan: payment.plan });
}
