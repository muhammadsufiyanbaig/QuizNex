import { auth } from "@/auth";
import { db } from "@/lib/db";
import { classrooms, quizzes, questions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const reorderSchema = z.object({
  questions: z.array(
    z.object({
      id:    z.string().uuid(),
      order: z.number().int().min(0),
    })
  ).min(1),
});

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
  if (quiz.status === "ACTIVE" || quiz.status === "COMPLETED") {
    return NextResponse.json({ error: "Cannot reorder questions in this quiz" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Update each question's order
  await Promise.all(
    parsed.data.questions.map(({ id, order }) =>
      db
        .update(questions)
        .set({ order })
        .where(eq(questions.id, id))
    )
  );

  return NextResponse.json({ success: true });
}
