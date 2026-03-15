import { NextRequest, NextResponse } from "next/server";
import { eq, and, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, emailVerifications } from "@/lib/db/schema";
import { APP_CONFIG } from "@/config";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(
        new URL("/login?error=missing-token", APP_CONFIG.url)
      );
    }

    // Find valid, unused, non-expired token
    const [record] = await db
      .select()
      .from(emailVerifications)
      .where(
        and(
          eq(emailVerifications.token, token),
          isNull(emailVerifications.usedAt),
          gt(emailVerifications.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!record) {
      return NextResponse.redirect(
        new URL("/login?error=invalid-or-expired-token", APP_CONFIG.url)
      );
    }

    // Mark user as verified and token as used — run both in parallel
    await Promise.all([
      db
        .update(users)
        .set({ emailVerified: true })
        .where(eq(users.id, record.userId)),
      db
        .update(emailVerifications)
        .set({ usedAt: new Date() })
        .where(eq(emailVerifications.id, record.id)),
    ]);

    return NextResponse.redirect(
      new URL("/login?verified=true", APP_CONFIG.url)
    );
  } catch (err) {
    console.error("Email verification error:", err);
    return NextResponse.redirect(
      new URL("/login?error=server-error", APP_CONFIG.url)
    );
  }
}
