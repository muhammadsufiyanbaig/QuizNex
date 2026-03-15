import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/utils";
import { verifyTotpCode } from "@/lib/auth/totp";

const schema = z.object({
  password: z.string().min(1),
  code: z.string().min(6).max(6).regex(/^\d{6}$/, "Code must be 6 digits"),
});

/**
 * DELETE /api/auth/2fa/disable
 * Authenticated. Requires current password + valid TOTP code to disable 2FA.
 */
export async function DELETE(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const [user] = await db
    .select({
      passwordHash: users.passwordHash,
      twoFactorEnabled: users.twoFactorEnabled,
      twoFactorSecret: users.twoFactorSecret,
    })
    .from(users)
    .where(eq(users.id, session!.user.id))
    .limit(1);

  if (!user?.twoFactorEnabled) {
    return NextResponse.json(
      { error: "2FA is not enabled on this account." },
      { status: 400 }
    );
  }

  // Verify password
  if (!user.passwordHash) {
    return NextResponse.json(
      { error: "OAuth accounts cannot disable 2FA with a password." },
      { status: 400 }
    );
  }
  const passwordValid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!passwordValid) {
    return NextResponse.json(
      { error: "Incorrect password." },
      { status: 400 }
    );
  }

  // Verify TOTP
  const codeValid = verifyTotpCode(parsed.data.code, user.twoFactorSecret!);
  if (!codeValid) {
    return NextResponse.json(
      { error: "Invalid authenticator code. Please try again." },
      { status: 400 }
    );
  }

  await db
    .update(users)
    .set({ twoFactorEnabled: false, twoFactorSecret: null, updatedAt: new Date() })
    .where(eq(users.id, session!.user.id));

  return NextResponse.json({ message: "2FA disabled successfully." });
}
