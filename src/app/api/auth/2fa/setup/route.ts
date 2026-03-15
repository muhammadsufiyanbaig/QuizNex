import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  generateTotpSecret,
  generateOtpAuthUri,
  generateQrCodeDataUrl,
  encryptSecret,
} from "@/lib/auth/totp";

/**
 * POST /api/auth/2fa/setup
 * Authenticated. Generates a new TOTP secret, stores it (unconfirmed),
 * and returns the QR code + plain secret for display.
 * 2FA is NOT enabled until /2fa/enable is called with a valid code.
 */
export async function POST() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const [user] = await db
    .select({ twoFactorEnabled: users.twoFactorEnabled })
    .from(users)
    .where(eq(users.id, session!.user.id))
    .limit(1);

  if (user?.twoFactorEnabled) {
    return NextResponse.json(
      { error: "2FA is already enabled on this account." },
      { status: 400 }
    );
  }

  const secret = generateTotpSecret();
  const otpAuthUri = generateOtpAuthUri(session!.user.email!, secret);
  const qrCodeDataUrl = await generateQrCodeDataUrl(otpAuthUri);

  // Store encrypted secret (marked as not yet enabled — twoFactorEnabled stays false)
  await db
    .update(users)
    .set({ twoFactorSecret: encryptSecret(secret), updatedAt: new Date() })
    .where(eq(users.id, session!.user.id));

  return NextResponse.json({
    qrCodeDataUrl,
    secret, // shown to user as manual entry fallback
    otpAuthUri,
  });
}
