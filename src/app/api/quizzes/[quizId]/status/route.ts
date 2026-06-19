import { auth } from "@/auth";
import { db } from "@/lib/db";
import { classrooms, quizzes, quizAttempts, questions, classroomStudents } from "@/lib/db/schema";
import { and, eq, count } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createNotificationForMany } from "@/lib/notifications";

const statusSchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ACTIVE", "COMPLETED", "ARCHIVED"]),
});

// Valid transitions
const TRANSITIONS: Record<string, string[]> = {
  DRAFT:     ["PUBLISHED"],
  PUBLISHED: ["DRAFT", "ACTIVE"],
  ACTIVE:    ["COMPLETED"],
  COMPLETED: ["ARCHIVED"],
  ARCHIVED:  [],
};

export async function PATCH(
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

  const body = await req.json();
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const { status: newStatus } = parsed.data;

  const allowed = TRANSITIONS[quiz.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return NextResponse.json(
      { error: `Cannot transition from ${quiz.status} to ${newStatus}` },
      { status: 409 }
    );
  }

  // DRAFT → PUBLISHED: require at least 1 question
  if (newStatus === "PUBLISHED") {
    const [{ total }] = await db
      .select({ total: count(questions.id) })
      .from(questions)
      .where(eq(questions.quizId, quizId));
    if (Number(total) === 0) {
      return NextResponse.json({ error: "Add at least one question before publishing" }, { status: 409 });
    }
  }

  // ACTIVE → COMPLETED: auto-submit all in-progress attempts
  if (newStatus === "COMPLETED") {
    await db
      .update(quizAttempts)
      .set({ status: "AUTO_SUBMITTED", submittedAt: new Date() })
      .where(
        and(
          eq(quizAttempts.quizId, quizId),
          eq(quizAttempts.status, "IN_PROGRESS")
        )
      );
  }

  const [updated] = await db
    .update(quizzes)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(quizzes.id, quizId))
    .returning();

  // Notify enrolled students when quiz goes ACTIVE
  if (newStatus === "ACTIVE") {
    try {
      const enrolledStudents = await db
        .select({ studentId: classroomStudents.studentId })
        .from(classroomStudents)
        .where(
          and(
            eq(classroomStudents.classroomId, quiz.classroomId),
            eq(classroomStudents.status, "ACTIVE")
          )
        );
      const studentIds = enrolledStudents.map((s) => s.studentId);
      await createNotificationForMany(studentIds, {
        type:  "QUIZ_STARTED",
        title: `Quiz started: ${quiz.title}`,
        body:  `Your teacher has started "${quiz.title}". Open it now before time runs out!`,
        link:  `/student/classrooms`,
      });
    } catch { /* non-fatal */ }
  }

  return NextResponse.json(updated);
}
