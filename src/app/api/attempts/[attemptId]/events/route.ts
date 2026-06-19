import { auth } from "@/auth";
import { db } from "@/lib/db";
import { quizAttempts, proctoringEvents } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  type:     z.enum(["FULLSCREEN_EXIT", "GAZE_AWAY", "KEY_BLOCKED"]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { attemptId } = await params;

  const [attempt] = await db
    .select({ id: quizAttempts.id, status: quizAttempts.status })
    .from(quizAttempts)
    .where(and(eq(quizAttempts.id, attemptId), eq(quizAttempts.studentId, session.user.id)))
    .limit(1);

  if (!attempt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Allow logging events even on FLAGGED/submitting attempts
  if (attempt.status === "SUBMITTED" || attempt.status === "AUTO_SUBMITTED") {
    return NextResponse.json({ ok: true }); // Silently discard
  }

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const [event] = await db
    .insert(proctoringEvents)
    .values({
      attemptId,
      type:       parsed.data.type,
      metadata:   parsed.data.metadata ?? null,
      occurredAt: new Date(),
    })
    .returning();

  return NextResponse.json(event, { status: 201 });
}
