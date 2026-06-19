import { auth } from "@/auth";
import { db } from "@/lib/db";
import { classrooms } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { generateJoinKey } from "@/lib/auth/utils";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const [classroom] = await db
    .select({ id: classrooms.id, teacherId: classrooms.teacherId })
    .from(classrooms)
    .where(and(eq(classrooms.id, id), eq(classrooms.teacherId, session.user.id)))
    .limit(1);

  if (!classroom) return NextResponse.json({ error: "Classroom not found" }, { status: 404 });

  // Retry loop in case of key collision (extremely unlikely but safe)
  for (let attempt = 0; attempt < 5; attempt++) {
    const newKey = generateJoinKey();
    try {
      const [updated] = await db
        .update(classrooms)
        .set({ joinKey: newKey, updatedAt: new Date() })
        .where(eq(classrooms.id, id))
        .returning({ joinKey: classrooms.joinKey });

      return NextResponse.json({ joinKey: updated.joinKey });
    } catch (err: unknown) {
      // Unique constraint violation — retry
      const msg = (err as { message?: string })?.message ?? "";
      if (!msg.includes("unique") && !msg.includes("duplicate")) throw err;
    }
  }

  return NextResponse.json({ error: "Failed to generate unique key. Please try again." }, { status: 500 });
}
