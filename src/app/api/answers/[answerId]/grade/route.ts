import { auth } from "@/auth";
import { db } from "@/lib/db";
import { answers, questions, quizAttempts, quizzes, classrooms } from "@/lib/db/schema";
import { eq, and, isNotNull, sum } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const gradeSchema = z.object({
  marksAwarded: z.number().min(0),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ answerId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { answerId } = await params;

  // Load the answer joined up through attempt → quiz → classroom
  const [row] = await db
    .select({
      answer: answers,
      attemptId: quizAttempts.id,
      classroomTeacherId: classrooms.teacherId,
    })
    .from(answers)
    .innerJoin(quizAttempts, eq(answers.attemptId, quizAttempts.id))
    .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
    .innerJoin(classrooms, eq(quizzes.classroomId, classrooms.id))
    .where(eq(answers.id, answerId))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Answer not found" }, { status: 404 });
  if (row.classroomTeacherId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Load the question to validate marks upper bound
  const [question] = await db
    .select({ marks: questions.marks })
    .from(questions)
    .where(eq(questions.id, row.answer.questionId))
    .limit(1);

  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const body = await req.json();
  const parsed = gradeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { marksAwarded } = parsed.data;
  if (marksAwarded > question.marks) {
    return NextResponse.json(
      { error: `marksAwarded cannot exceed question marks (${question.marks})` },
      { status: 400 }
    );
  }

  // Update the answer
  const [updatedAnswer] = await db
    .update(answers)
    .set({ marksAwarded })
    .where(eq(answers.id, answerId))
    .returning();

  // Recalculate totalScore: sum of all marksAwarded for this attempt where not null
  const [scoreRow] = await db
    .select({ total: sum(answers.marksAwarded) })
    .from(answers)
    .where(
      and(
        eq(answers.attemptId, row.attemptId),
        isNotNull(answers.marksAwarded)
      )
    );

  const newTotal = Number(scoreRow?.total ?? 0);

  await db
    .update(quizAttempts)
    .set({ totalScore: newTotal })
    .where(eq(quizAttempts.id, row.attemptId));

  return NextResponse.json(updatedAnswer);
}
