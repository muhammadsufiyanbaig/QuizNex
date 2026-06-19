import { auth } from "@/auth";
import { db } from "@/lib/db";
import { classrooms, quizzes } from "@/lib/db/schema";
import { and, eq, max } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createQuizSchema } from "@/lib/validations/quiz";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createQuizSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const { classroomId, ...quizData } = parsed.data;

  // Verify classroom ownership
  const [classroom] = await db
    .select({ id: classrooms.id })
    .from(classrooms)
    .where(and(eq(classrooms.id, classroomId), eq(classrooms.teacherId, session.user.id)))
    .limit(1);

  if (!classroom) return NextResponse.json({ error: "Classroom not found" }, { status: 404 });

  // Get next displayOrder
  const [{ maxOrder }] = await db
    .select({ maxOrder: max(quizzes.displayOrder) })
    .from(quizzes)
    .where(eq(quizzes.classroomId, classroomId));

  const [quiz] = await db
    .insert(quizzes)
    .values({
      classroomId,
      title: quizData.title,
      description: quizData.description ?? null,
      type: quizData.type,
      totalMarks: quizData.totalMarks,
      timeLimitMins: quizData.timeLimitMins,
      scheduledAt: quizData.scheduledAt ? new Date(quizData.scheduledAt) : null,
      maxAttempts: quizData.maxAttempts ?? 1,
      shuffleQuestions: quizData.shuffleQuestions ?? false,
      shuffleOptions: quizData.shuffleOptions ?? false,
      showResults: quizData.showResults ?? true,
      displayOrder: (maxOrder ?? 0) + 1,
    })
    .returning();

  return NextResponse.json(quiz, { status: 201 });
}
