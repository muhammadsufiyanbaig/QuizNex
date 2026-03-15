import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, emailVerifications } from "@/lib/db/schema";

const schema = z.object({
  email: z.string().email(),
  otp:   z.string().length(6).regex(/^\d{6}$/, "Must be 6 digits"),
});

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request." },
        { status: 422 }
      );
    }

    const { email, otp } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // Find the user
    const [user] = await db
      .select({ id: users.id, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email address." },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "This account is already verified." },
        { status: 400 }
      );
    }

    // Find a valid, unused, non-expired OTP for this user
    const [record] = await db
      .select()
      .from(emailVerifications)
      .where(
        and(
          eq(emailVerifications.userId, user.id),
          eq(emailVerifications.token, otp),
          isNull(emailVerifications.usedAt),
          gt(emailVerifications.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!record) {
      return NextResponse.json(
        { error: "Invalid or expired code. Please request a new one." },
        { status: 400 }
      );
    }

    // Activate account and consume the OTP
    await Promise.all([
      db.update(users)
        .set({ emailVerified: true, updatedAt: new Date() })
        .where(eq(users.id, user.id)),
      db.update(emailVerifications)
        .set({ usedAt: new Date() })
        .where(eq(emailVerifications.id, record.id)),
    ]);

    return NextResponse.json({ message: "Email verified successfully." });
  } catch (err) {
    console.error("Verify OTP error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
