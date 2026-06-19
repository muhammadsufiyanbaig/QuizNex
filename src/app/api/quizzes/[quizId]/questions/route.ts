import { auth } from "@/auth";
import { db } from "@/lib/db";
import { classrooms, quizzes, questions, options } from "@/lib/db/schema";
import { and, eq, count } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createQuestionSchema } from "@/lib/validations/quiz";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { quizId } = await params;

  const [row] = await db
    .select({ quiz: quizzes, classroomTeacherId: classrooms.teacherId })
    .from(quizzes)
    .innerJoin(classrooms, eq(quizzes.classroomId, classrooms.id))
    .where(eq(quizzes.id, quizId))
    .limit(1);

  if (!row || row.classroomTeacherId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const quiz = row.quiz;

  if (quiz.status === "ACTIVE" || quiz.status === "COMPLETED" || quiz.status === "ARCHIVED") {
    return NextResponse.json({ error: "Cannot add questions to this quiz" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = createQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Enforce quiz type constraint
  if (quiz.type === "MCQ" && data.type !== "MCQ") {
    return NextResponse.json({ error: "This quiz only accepts MCQ questions" }, { status: 409 });
  }
  if (quiz.type === "QA" && data.type !== "QA") {
    return NextResponse.json({ error: "This quiz only accepts QA questions" }, { status: 409 });
  }

  // Determine order: use provided or auto-assign
  let order = data.order;
  if (!order && order !== 0) {
    const [{ total }] = await db
      .select({ total: count(questions.id) })
      .from(questions)
      .where(eq(questions.quizId, quizId));
    order = Number(total);
  }

  // Insert question
  const [question] = await db
    .insert(questions)
    .values({
      quizId,
      text: data.text,
      type: data.type,
      marks: data.marks,
      order,
      imageUrl: data.imageUrl ?? null,
      modelAnswer: data.type === "QA" ? (data.modelAnswer ?? null) : null,
    })
    .returning();

  // Insert options for MCQ
  let insertedOptions: (typeof options.$inferSelect)[] = [];
  if (data.type === "MCQ" && data.options.length > 0) {
    insertedOptions = await db
      .insert(options)
      .values(
        data.options.map((o) => ({
          questionId: question.id,
          text: o.text,
          isCorrect: o.isCorrect,
        }))
      )
      .returning();
  }

  return NextResponse.json({ ...question, options: insertedOptions }, { status: 201 });
}
