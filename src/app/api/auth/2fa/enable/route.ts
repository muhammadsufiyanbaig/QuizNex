import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyTotpCode } from "@/lib/auth/totp";

const schema = z.object({
  code: z.string().min(6).max(6).regex(/^\d{6}$/, "Code must be 6 digits"),
});

/**
 * POST /api/auth/2fa/enable
 * Authenticated. Verifies the provided TOTP code against the stored
 * (not-yet-enabled) secret and flips twoFactorEnabled = true.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid code format." },
      { status: 422 }
    );
  }

  const [user] = await db
    .select({ twoFactorEnabled: users.twoFactorEnabled, twoFactorSecret: users.twoFactorSecret })
    .from(users)
    .where(eq(users.id, session!.user.id))
    .limit(1);

  if (!user?.twoFactorSecret) {
    return NextResponse.json(
      { error: "No pending 2FA setup found. Please start setup first." },
      { status: 400 }
    );
  }

  if (user.twoFactorEnabled) {
    return NextResponse.json(
      { error: "2FA is already enabled." },
      { status: 400 }
    );
  }

  const valid = verifyTotpCode(parsed.data.code, user.twoFactorSecret);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid code. Please try again — make sure your device time is correct." },
      { status: 400 }
    );
  }

  await db
    .update(users)
    .set({ twoFactorEnabled: true, updatedAt: new Date() })
    .where(eq(users.id, session!.user.id));

  return NextResponse.json({ message: "2FA enabled successfully." });
}
