import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function requireAdmin() {
  const session = await auth();

  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }

  // Fast JWT check first
  if (session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
  }

  // Live DB check — JWT role can be stale; verify account is still ACTIVE ADMIN with 2FA
  const [admin] = await db
    .select({ id: users.id, role: users.role, status: users.status, twoFactorEnabled: users.twoFactorEnabled })
    .from(users)
    .where(eq(users.id, session.user.id!))
    .limit(1);

  if (!admin || admin.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
  }

  if (admin.status !== "ACTIVE") {
    return { error: NextResponse.json({ error: "Admin account is suspended" }, { status: 403 }), session: null };
  }

  if (!admin.twoFactorEnabled) {
    return { error: NextResponse.json({ error: "2FA is required for admin access" }, { status: 403 }), session: null };
  }

  return { error: null, session };
}
