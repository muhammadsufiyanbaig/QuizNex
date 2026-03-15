import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

/**
 * GET /api/auth/check-2fa?email=...
 * Returns whether a given email has 2FA enabled.
 * Always returns 200 — never reveals whether an account exists.
 */
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.toLowerCase().trim();

  if (!email) {
    return NextResponse.json({ requires2FA: false });
  }

  const [user] = await db
    .select({ twoFactorEnabled: users.twoFactorEnabled })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return NextResponse.json({
    requires2FA: user?.twoFactorEnabled ?? false,
  });
}
