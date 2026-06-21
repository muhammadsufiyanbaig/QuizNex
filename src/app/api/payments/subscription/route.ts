import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveSubscription } from "@/lib/plans/subscription";
import { getLimits, PLAN_PRICES } from "@/lib/plans/limits";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub    = await getActiveSubscription(session.user.id!, session.user.role ?? "STUDENT");
  const limits = getLimits(sub.plan);

  return NextResponse.json({
    subscription: sub,
    limits,
    prices: PLAN_PRICES,
  });
}
