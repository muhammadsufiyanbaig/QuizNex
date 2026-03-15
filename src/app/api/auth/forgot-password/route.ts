import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, passwordResets } from "@/lib/db/schema";
import { generateToken } from "@/lib/auth/utils";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { sendPasswordResetEmail } from "@/lib/email";
import { APP_CONFIG } from "@/config";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email address." },
        { status: 422 }
      );
    }

    const email = parsed.data.email.toLowerCase();

    // Always return the same response to prevent email enumeration
    const SAFE_RESPONSE = NextResponse.json(
      {
        message:
          "If an account with that email exists, a password reset link has been sent.",
      },
      { status: 200 }
    );

    const [user] = await db
      .select({ id: users.id, email: users.email, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !user.emailVerified) return SAFE_RESPONSE;

    // Generate reset token (expires in 1 hour)
    const token = generateToken();
    const expiresAt = new Date(
      Date.now() + APP_CONFIG.passwordResetExpiryHours * 60 * 60 * 1000
    );

    await db.insert(passwordResets).values({
      userId: user.id,
      token,
      expiresAt,
    });

    sendPasswordResetEmail(user.email, token).catch((err) =>
      console.error("Failed to send password reset email:", err)
    );

    return SAFE_RESPONSE;
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
