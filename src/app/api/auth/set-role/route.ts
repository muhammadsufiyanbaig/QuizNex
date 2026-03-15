import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const schema = z.object({
  role: z.enum(["STUDENT", "TEACHER", "ORGANIZATION"]),
});

/**
 * POST /api/auth/set-role
 * Authenticated. Sets the role for a new OAuth user who has no role yet.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid role." }, { status: 422 });
  }

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session!.user.id))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (user.role) {
    return NextResponse.json({ error: "Role already set." }, { status: 400 });
  }

  await db
    .update(users)
    .set({ role: parsed.data.role, updatedAt: new Date() })
    .where(eq(users.id, session!.user.id));

  return NextResponse.json({ role: parsed.data.role });
}
