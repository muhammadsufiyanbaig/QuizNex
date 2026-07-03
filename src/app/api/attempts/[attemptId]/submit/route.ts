import { auth } from "@/auth";
import { db } from "@/lib/db";
import { quizAttempts, quizzes, questions, options, answers, classrooms, users } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendFlaggedStudentNotification } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

const schema = z.object({
  status:           z.enum(["SUBMITTED", "AUTO_SUBMITTED", "FLAGGED"]),
  timerElapsedSecs: z.number().int().min(0),
  flagReason:       z.string().max(500).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { attemptId } = await params;

  // Load attempt
  const [attempt] = await db
    .select()
    .from(quizAttempts)
    .where(and(eq(quizAttempts.id, attemptId), eq(quizAttempts.studentId, session.user.id)))
    .limit(1);

  if (!attempt)                         return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (attempt.status !== "IN_PROGRESS") return NextResponse.json({ error: "Already submitted" }, { status: 409 });

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { status, timerElapsedSecs, flagReason } = parsed.data;

  // Load quiz for totalMarks validation
  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, attempt.quizId)).limit(1);
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  // Auto-score MCQ answers
  const attemptAnswers = await db
    .select()
    .from(answers)
    .where(eq(answers.attemptId, attemptId));

  const quizQuestions = await db
    .select()
    .from(questions)
    .where(eq(questions.quizId, attempt.quizId));

  const questionIds = quizQuestions.map((q) => q.id);
  let quizOptions: (typeof options.$inferSelect)[] = [];
  if (questionIds.length > 0) {
    quizOptions = await db.select().from(options).where(inArray(options.questionId, questionIds));
  }

  const correctOptionIds = new Set(quizOptions.filter((o) => o.isCorrect).map((o) => o.id));
  const questionMap      = Object.fromEntries(quizQuestions.map((q) => [q.id, q]));

  let totalScore = 0;

  await Promise.all(
    attemptAnswers.map(async (ans) => {
      const question = questionMap[ans.questionId];
      if (!question) return;

      let marks = 0;
      if (question.type === "MCQ") {
        marks = ans.selectedOptionId && correctOptionIds.has(ans.selectedOptionId)
          ? question.marks
          : 0;
        totalScore += marks;
        await db.update(answers).set({ marksAwarded: marks }).where(eq(answers.id, ans.id));
      }
      // QA marks stay null — manual grading
    })
  );

  // Sync quiz.totalMarks with actual sum of question marks — prevents mismatch
  // when teacher edits individual question marks without updating quiz settings.
  const actualTotalMarks = quizQuestions.reduce((sum, q) => sum + q.marks, 0);
  if (actualTotalMarks > 0 && actualTotalMarks !== quiz.totalMarks) {
    await db.update(quizzes).set({ totalMarks: actualTotalMarks }).where(eq(quizzes.id, quiz.id));
  }
  const effectiveTotalMarks = actualTotalMarks > 0 ? actualTotalMarks : quiz.totalMarks;

  // Update attempt
  const [updated] = await db
    .update(quizAttempts)
    .set({
      status,
      submittedAt:      new Date(),
      timerElapsedSecs,
      totalScore:       quiz.type === "QA" ? null : totalScore,
      isFlagged:        status === "FLAGGED",
      flagReason:       status === "FLAGGED" ? (flagReason ?? "Proctoring violation") : null,
    })
    .where(eq(quizAttempts.id, attemptId))
    .returning();

  // Notify student with their result
  try {
    const scoreLine = updated.totalScore !== null
      ? `You scored ${updated.totalScore} / ${effectiveTotalMarks} (${((updated.totalScore / effectiveTotalMarks) * 100).toFixed(1)}%).`
      : "Your answers have been submitted for review.";
    await createNotification({
      userId: session.user.id,
      type:   "QUIZ_RESULT",
      title:  `Quiz submitted: ${quiz.title}`,
      body:   scoreLine,
      link:   `/student/quiz-history`,
      sendEmail: true,
    });
  } catch { /* non-fatal */ }

  // Notify teacher if student was flagged
  if (status === "FLAGGED") {
    try {
      const [classroom] = await db
        .select({ teacherId: classrooms.teacherId, name: classrooms.name, classroomId: classrooms.id })
        .from(quizzes)
        .innerJoin(classrooms, eq(quizzes.classroomId, classrooms.id))
        .where(eq(quizzes.id, attempt.quizId))
        .limit(1);

      if (classroom) {
        const [teacher] = await db
          .select({ name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, classroom.teacherId))
          .limit(1);

        const [student] = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, session.user.id))
          .limit(1);

        if (teacher) {
          await sendFlaggedStudentNotification(
            teacher.email,
            teacher.name,
            student?.name ?? "A student",
            quiz.title,
            classroom.name,
            flagReason ?? "Proctoring violation",
          );
          // In-app notification for teacher
          await createNotification({
            userId: classroom.teacherId,
            type:   "STUDENT_FLAGGED",
            title:  `Student flagged: ${student?.name ?? "A student"}`,
            body:   `${student?.name ?? "A student"} was auto-flagged during "${quiz.title}" in ${classroom.name}. Reason: ${flagReason ?? "Proctoring violation"}.`,
            link:   `/teacher/classrooms/${classroom.classroomId}/quizzes/${quiz.id}/analytics`,
            sendEmail: false, // email already sent above
          });
        }
      }
    } catch {
      // Non-fatal: notification failure should not block submission
    }
  }

  return NextResponse.json(updated);
}
