import { auth } from "@/auth";
import { db } from "@/lib/db";
import { quizAttempts } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ timerElapsedSecs: z.number().int().min(0) });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { attemptId } = await params;

  const [attempt] = await db
    .select()
    .from(quizAttempts)
    .where(and(eq(quizAttempts.id, attemptId), eq(quizAttempts.studentId, session.user.id)))
    .limit(1);

  if (!attempt)                         return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (attempt.status !== "IN_PROGRESS") return NextResponse.json({ error: "Attempt already closed" }, { status: 409 });

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Clamp to server-calculated elapsed time — prevents clients from submitting
  // manipulated timer values (e.g. 0 to fake instant completion in analytics).
  const serverElapsedSecs = Math.floor(
    (Date.now() - new Date(attempt.startedAt).getTime()) / 1000
  );
  const timerElapsedSecs = Math.min(parsed.data.timerElapsedSecs, serverElapsedSecs);

  await db
    .update(quizAttempts)
    .set({ timerElapsedSecs })
    .where(eq(quizAttempts.id, attemptId));

  return NextResponse.json({ ok: true });
}
