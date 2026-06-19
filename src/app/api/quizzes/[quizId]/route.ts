import { auth } from "@/auth";
import { db } from "@/lib/db";
import { classrooms, quizzes, questions, options } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateQuizSchema = z.object({
  title:            z.string().min(2).max(255).optional(),
  description:      z.string().max(1000).optional(),
  totalMarks:       z.number().int().positive().optional(),
  timeLimitMins:    z.number().int().min(1).max(360).optional(),
  scheduledAt:      z.string().datetime().optional(),
  maxAttempts:      z.number().int().min(1).max(10).optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleOptions:   z.boolean().optional(),
  showResults:      z.boolean().optional(),
  displayOrder:     z.number().int().min(0).optional(),
});

async function resolveQuiz(quizId: string, teacherId: string) {
  const [row] = await db
    .select({ quiz: quizzes, classroomTeacherId: classrooms.teacherId })
    .from(quizzes)
    .innerJoin(classrooms, eq(quizzes.classroomId, classrooms.id))
    .where(eq(quizzes.id, quizId))
    .limit(1);
  if (!row || row.classroomTeacherId !== teacherId) return null;
  return row.quiz;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { quizId } = await params;

  const [row] = await db
    .select({ quiz: quizzes, classroomTeacherId: classrooms.teacherId })
    .from(quizzes)
    .innerJoin(classrooms, eq(quizzes.classroomId, classrooms.id))
    .where(eq(quizzes.id, quizId))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.classroomTeacherId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const quiz = row.quiz;

  // Fetch questions
  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.quizId, quizId))
    .orderBy(questions.order);

  // Fetch options
  const questionIds = questionRows.map((q) => q.id);
  let optionRows: (typeof options.$inferSelect)[] = [];
  if (questionIds.length > 0) {
    optionRows = await db
      .select()
      .from(options)
      .where(inArray(options.questionId, questionIds));
  }

  const optsByQ = optionRows.reduce<Record<string, typeof optionRows>>((acc, o) => {
    (acc[o.questionId] ??= []).push(o);
    return acc;
  }, {});

  const questionsWithOptions = questionRows.map((q) => ({
    ...q,
    options: optsByQ[q.id] ?? [],
  }));

  return NextResponse.json({ ...quiz, questions: questionsWithOptions });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { quizId } = await params;
  const quiz = await resolveQuiz(quizId, session.user.id);
  if (!quiz) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (quiz.status === "ACTIVE" || quiz.status === "COMPLETED") {
    return NextResponse.json({ error: "Cannot edit an active or completed quiz" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = updateQuizSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const data = parsed.data;
  const [updated] = await db
    .update(quizzes)
    .set({
      ...(data.title            !== undefined && { title: data.title }),
      ...(data.description      !== undefined && { description: data.description || null }),
      ...(data.totalMarks       !== undefined && { totalMarks: data.totalMarks }),
      ...(data.timeLimitMins    !== undefined && { timeLimitMins: data.timeLimitMins }),
      ...(data.scheduledAt      !== undefined && { scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null }),
      ...(data.maxAttempts      !== undefined && { maxAttempts: data.maxAttempts }),
      ...(data.shuffleQuestions !== undefined && { shuffleQuestions: data.shuffleQuestions }),
      ...(data.shuffleOptions   !== undefined && { shuffleOptions: data.shuffleOptions }),
      ...(data.showResults      !== undefined && { showResults: data.showResults }),
      ...(data.displayOrder     !== undefined && { displayOrder: data.displayOrder }),
      updatedAt: new Date(),
    })
    .where(eq(quizzes.id, quizId))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { quizId } = await params;
  const quiz = await resolveQuiz(quizId, session.user.id);
  if (!quiz) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (quiz.status !== "DRAFT" && quiz.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Only DRAFT or PUBLISHED quizzes can be deleted" }, { status: 409 });
  }

  await db.delete(quizzes).where(eq(quizzes.id, quizId));
  return NextResponse.json({ success: true });
}
