import { requireAdmin } from "@/lib/admin/guard";
import { logAdminAction, getClientIp } from "@/lib/admin/audit";
import { db } from "@/lib/db";
import { quizAttempts, users, quizzes, classrooms, answers, questions, options, proctoringEvents } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const [attempt] = await db
    .select({
      attempt:      quizAttempts,
      studentName:  users.name,
      studentEmail: users.email,
      quizTitle:    quizzes.title,
      quizType:     quizzes.type,
      totalMarks:   quizzes.totalMarks,
      classroomName: classrooms.name,
    })
    .from(quizAttempts)
    .innerJoin(users,      eq(quizAttempts.studentId, users.id))
    .innerJoin(quizzes,    eq(quizAttempts.quizId, quizzes.id))
    .innerJoin(classrooms, eq(quizzes.classroomId, classrooms.id))
    .where(eq(quizAttempts.id, id))
    .limit(1);

  if (!attempt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [events, attemptAnswers] = await Promise.all([
    db.select().from(proctoringEvents).where(eq(proctoringEvents.attemptId, id)).orderBy(proctoringEvents.occurredAt),
    db.select({
      answerId:         answers.id,
      questionId:       answers.questionId,
      questionText:     questions.text,
      questionType:     questions.type,
      questionMarks:    questions.marks,
      modelAnswer:      questions.modelAnswer,
      textAnswer:       answers.textAnswer,
      selectedOptionId: answers.selectedOptionId,
      marksAwarded:     answers.marksAwarded,
      timeTakenSecs:    answers.timeTakenSecs,
    })
    .from(answers)
    .innerJoin(questions, eq(answers.questionId, questions.id))
    .where(eq(answers.attemptId, id))
    .orderBy(questions.order),
  ]);

  return NextResponse.json({ ...attempt, proctoringEvents: events, answers: attemptAnswers });
}

const patchSchema = z.object({
  isFlagged:  z.boolean().optional(),
  flagReason: z.string().max(1000).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id }  = await params;
  const body    = await req.json().catch(() => ({}));
  const parsed  = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await db.update(quizAttempts).set(parsed.data).where(eq(quizAttempts.id, id));

  await logAdminAction({ adminId: session!.user.id, action: "update_attempt", targetType: "attempt", targetId: id, metadata: parsed.data as Record<string, unknown>, ip: getClientIp(req) });

  return NextResponse.json({ ok: true });
}
