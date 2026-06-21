import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt, isNull, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, emailVerifications } from "@/lib/db/schema";
import { generateOtp } from "@/lib/auth/utils";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { sendVerificationEmail } from "@/lib/email";

const emailServiceConfigured = !!(
  process.env.EMAIL_FROM &&
  process.env.EMAIL_APP_PASSWORD
);

const SAFE = NextResponse.json(
  { message: "If an unverified account exists, a new code has been sent." },
  { status: 200 }
);

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid email." }, { status: 422 });

    const email = parsed.data.email.toLowerCase();

    const [user] = await db
      .select({ id: users.id, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || user.emailVerified) return SAFE;

    // Rate-limit: max 5 OTPs sent in the last hour
    const [{ value: recentCount }] = await db
      .select({ value: count() })
      .from(emailVerifications)
      .where(
        and(
          eq(emailVerifications.userId, user.id),
          gt(emailVerifications.createdAt, new Date(Date.now() - 60 * 60 * 1000))
        )
      );

    if (Number(recentCount) >= 5) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before requesting another code." },
        { status: 429 }
      );
    }

    // Invalidate existing unused OTPs
    await db
      .update(emailVerifications)
      .set({ usedAt: new Date() })
      .where(
        and(eq(emailVerifications.userId, user.id), isNull(emailVerifications.usedAt))
      );

    const otp       = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.insert(emailVerifications).values({ userId: user.id, token: otp, expiresAt });

    if (emailServiceConfigured) {
      sendVerificationEmail(email, otp).catch(console.error);
    } else {
      // SMTP not configured — OTP is NOT logged to avoid leaking it to log aggregators.
      console.warn(`[resend-verification] SMTP not configured — verification email not sent for ${email}`);
    }

    return SAFE;
  } catch (err) {
    console.error("Resend verification error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
