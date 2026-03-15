import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, emailVerifications } from "@/lib/db/schema";
import { hashPassword, generateOtp } from "@/lib/auth/utils";
import { registerSchema } from "@/lib/validations/auth";
import { sendVerificationEmail } from "@/lib/email";

const emailServiceConfigured = !!(
  process.env.EMAIL_FROM &&
  process.env.EMAIL_APP_PASSWORD
);

async function sendOtp(email: string, otp: string) {
  if (emailServiceConfigured) {
    await sendVerificationEmail(email, otp);
  } else {
    // No SMTP configured — print OTP to server console for development
    console.log(`\n========================================`);
    console.log(`  📧  OTP for ${email}`);
    console.log(`  Code: ${otp}`);
    console.log(`========================================\n`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { name, email, password, role, confirmPassword: _ } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const [existing] = await db
      .select({ id: users.id, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing) {
      if (existing.emailVerified) {
        return NextResponse.json(
          { error: "An account with this email already exists." },
          { status: 409 }
        );
      }

      // Unverified account — invalidate old OTPs and resend
      const otp       = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await db
        .update(emailVerifications)
        .set({ usedAt: new Date() })
        .where(eq(emailVerifications.userId, existing.id));

      await db.insert(emailVerifications).values({
        userId: existing.id, token: otp, expiresAt,
      });

      sendOtp(normalizedEmail, otp).catch(console.error);

      return NextResponse.json(
        { requiresVerification: true, email: normalizedEmail },
        { status: 200 }
      );
    }

    const passwordHash = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email: normalizedEmail,
        passwordHash,
        role,
        emailVerified: false,   // always require verification
      })
      .returning({ id: users.id, email: users.email });

    const otp       = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.insert(emailVerifications).values({
      userId: newUser.id, token: otp, expiresAt,
    });

    sendOtp(newUser.email, otp).catch(console.error);

    return NextResponse.json(
      { requiresVerification: true, email: newUser.email },
      { status: 201 }
    );
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
