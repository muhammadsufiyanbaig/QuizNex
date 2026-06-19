import { auth } from "@/auth";
import { db } from "@/lib/db";
import { quizAttempts, answers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { submitAnswerSchema } from "@/lib/validations/quiz";

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

  if (!attempt)                         return NextResponse.json({ error: "Not found" },          { status: 404 });
  if (attempt.status !== "IN_PROGRESS") return NextResponse.json({ error: "Attempt is closed" }, { status: 409 });

  const body   = await req.json();
  const parsed = submitAnswerSchema.safeParse({ ...body, attemptId });
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { questionId, selectedOptionId, textAnswer, timeTakenSecs } = parsed.data;

  // Upsert: check for existing answer
  const [existing] = await db
    .select({ id: answers.id })
    .from(answers)
    .where(and(eq(answers.attemptId, attemptId), eq(answers.questionId, questionId)))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(answers)
      .set({
        selectedOptionId: selectedOptionId ?? null,
        textAnswer:       textAnswer       ?? null,
        timeTakenSecs,
      })
      .where(eq(answers.id, existing.id))
      .returning();
    return NextResponse.json(updated);
  }

  const [inserted] = await db
    .insert(answers)
    .values({ attemptId, questionId, selectedOptionId: selectedOptionId ?? null, textAnswer: textAnswer ?? null, timeTakenSecs })
    .returning();

  return NextResponse.json(inserted, { status: 201 });
}
