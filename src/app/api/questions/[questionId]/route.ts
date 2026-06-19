import { auth } from "@/auth";
import { db } from "@/lib/db";
import { classrooms, quizzes, questions, options } from "@/lib/db/schema";
import { and, eq, gt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { mcqOptionSchema } from "@/lib/validations/quiz";

const updateMcqSchema = z.object({
  type:      z.literal("MCQ"),
  text:      z.string().min(1).max(2000).optional(),
  marks:     z.number().int().positive().optional(),
  imageUrl:  z.string().url().optional(),
  options:   z
    .array(mcqOptionSchema)
    .min(2)
    .max(6)
    .refine((opts) => opts.some((o) => o.isCorrect), {
      message: "At least one option must be marked correct",
    })
    .optional(),
});

const updateQaSchema = z.object({
  type:        z.literal("QA"),
  text:        z.string().min(1).max(2000).optional(),
  marks:       z.number().int().positive().optional(),
  imageUrl:    z.string().url().optional(),
  modelAnswer: z.string().max(5000).optional(),
});

const updateQuestionSchema = z.discriminatedUnion("type", [updateMcqSchema, updateQaSchema]);

async function resolveQuestion(questionId: string, teacherId: string) {
  const [row] = await db
    .select({
      question:            questions,
      quizStatus:          quizzes.status,
      classroomTeacherId:  classrooms.teacherId,
    })
    .from(questions)
    .innerJoin(quizzes, eq(questions.quizId, quizzes.id))
    .innerJoin(classrooms, eq(quizzes.classroomId, classrooms.id))
    .where(eq(questions.id, questionId))
    .limit(1);

  if (!row || row.classroomTeacherId !== teacherId) return null;
  return row;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { questionId } = await params;
  const row = await resolveQuestion(questionId, session.user.id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (row.quizStatus === "ACTIVE" || row.quizStatus === "COMPLETED") {
    return NextResponse.json({ error: "Cannot edit questions in this quiz" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = updateQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const [updated] = await db
    .update(questions)
    .set({
      ...(data.text      !== undefined && { text: data.text }),
      ...(data.marks     !== undefined && { marks: data.marks }),
      ...("imageUrl" in data && data.imageUrl !== undefined && { imageUrl: data.imageUrl || null }),
      ...("modelAnswer" in data && data.modelAnswer !== undefined && { modelAnswer: data.modelAnswer || null }),
    })
    .where(eq(questions.id, questionId))
    .returning();

  // Replace options for MCQ
  let updatedOptions: (typeof options.$inferSelect)[] = [];
  if (data.type === "MCQ" && data.options) {
    await db.delete(options).where(eq(options.questionId, questionId));
    updatedOptions = await db
      .insert(options)
      .values(
        data.options.map((o) => ({
          questionId,
          text: o.text,
          isCorrect: o.isCorrect,
        }))
      )
      .returning();
  } else if (data.type === "MCQ") {
    updatedOptions = await db
      .select()
      .from(options)
      .where(eq(options.questionId, questionId));
  }

  return NextResponse.json({ ...updated, options: updatedOptions });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { questionId } = await params;
  const row = await resolveQuestion(questionId, session.user.id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (row.quizStatus === "ACTIVE" || row.quizStatus === "COMPLETED") {
    return NextResponse.json({ error: "Cannot delete questions in this quiz" }, { status: 409 });
  }

  const { question } = row;

  await db.delete(questions).where(eq(questions.id, questionId));

  // Re-number remaining questions that come after the deleted one
  await db
    .update(questions)
    .set({ order: sql`${questions.order} - 1` })
    .where(
      and(
        eq(questions.quizId, question.quizId),
        gt(questions.order, question.order)
      )
    );

  return NextResponse.json({ success: true });
}
