import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createPaymentSession, createTBT, buildCheckoutUrl } from "@/lib/payments/safepay";
import { getPlanPrice, type Plan } from "@/lib/plans/limits";

const schema = z.object({
  plan:   z.enum(["GOLD", "PLATINUM", "ORG_STARTER", "ORG_GROWTH", "ORG_ENTERPRISE"]),
  period: z.enum(["MONTHLY", "YEARLY"]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (role !== "TEACHER" && role !== "ORGANIZATION") {
    return NextResponse.json({ error: "Only teachers and organizations can subscribe" }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid plan or period" }, { status: 400 });

  const { plan, period } = parsed.data;

  if (role === "ORGANIZATION" && !plan.startsWith("ORG_")) {
    return NextResponse.json({ error: "Organizations must select an ORG plan" }, { status: 400 });
  }
  if (role === "TEACHER" && plan.startsWith("ORG_")) {
    return NextResponse.json({ error: "Teachers cannot select ORG plans" }, { status: 400 });
  }

  const amountPkr = getPlanPrice(plan as Plan, period);
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Step 1: Insert pending payment row FIRST so we never have an orphaned Safepay tracker
  const paymentId = crypto.randomUUID();
  const tempToken = `pending_${paymentId}`;
  await db.insert(payments).values({
    id:           paymentId,
    userId:       session.user.id,
    trackerToken: tempToken,
    plan:         plan as Plan,
    period,
    amountPkr,
    status:       "PENDING",
  });

  // Step 2: Create Safepay tracker + TBT
  let trackerToken: string;
  let tbt: string;
  try {
    [trackerToken, tbt] = await Promise.all([
      createPaymentSession(amountPkr),
      createTBT(),
    ]);
  } catch (err) {
    await db.update(payments).set({ status: "FAILED" }).where(eq(payments.id, paymentId));
    console.error("[payments/checkout] Safepay session creation failed:", err);
    return NextResponse.json({ error: "Failed to create payment session" }, { status: 502 });
  }

  // Step 3: Update row with real tracker token
  await db
    .update(payments)
    .set({ trackerToken, updatedAt: new Date() })
    .where(eq(payments.id, paymentId));

  const checkoutUrl = buildCheckoutUrl(
    trackerToken,
    tbt,
    `${appUrl}/payments/success`,
    `${appUrl}/payments/cancel`
  );

  return NextResponse.json({ checkoutUrl, trackerToken });
}
