import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { passkeys } from "@/lib/db/schema";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const list = await db
    .select({
      id:         passkeys.id,
      name:       passkeys.name,
      deviceType: passkeys.deviceType,
      backedUp:   passkeys.backedUp,
      createdAt:  passkeys.createdAt,
      lastUsedAt: passkeys.lastUsedAt,
    })
    .from(passkeys)
    .where(eq(passkeys.userId, session!.user.id))
    .orderBy(passkeys.createdAt);

  return NextResponse.json({ passkeys: list });
}
