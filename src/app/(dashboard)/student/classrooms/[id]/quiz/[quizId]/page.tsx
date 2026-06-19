import { auth } from "@/auth";
import { db } from "@/lib/db";
import { classroomStudents, quizzes, questions, options, quizAttempts, answers } from "@/lib/db/schema";
import { and, eq, inArray, count } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import QuizSessionClient from "./quiz-session-client";
import { autoActivateIfScheduled } from "@/lib/quiz-utils";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default async function QuizSessionPage({
  params,
}: {
  params: Promise<{ id: string; quizId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id: classroomId, quizId } = await params;
  const studentId = session.user.id;

  // Verify enrollment
  const [enrollment] = await db
    .select({ id: classroomStudents.id })
    .from(classroomStudents)
    .where(and(
      eq(classroomStudents.classroomId, classroomId),
      eq(classroomStudents.studentId, studentId),
      eq(classroomStudents.status, "ACTIVE")
    ))
    .limit(1);
  if (!enrollment) notFound();

  // Load quiz
  const [rawQuiz] = await db
    .select()
    .from(quizzes)
    .where(and(eq(quizzes.id, quizId), eq(quizzes.classroomId, classroomId)))
    .limit(1);
  if (!rawQuiz) notFound();

  // Phase 2: lazy-activate if scheduled time has passed
  const quiz = await autoActivateIfScheduled(rawQuiz);

  // Only ACTIVE quizzes can be attempted
  if (quiz.status !== "ACTIVE") {
    redirect(`/student/classrooms/${classroomId}`);
  }

  // Check if max attempts exhausted
  const [{ used }] = await db
    .select({ used: count(quizAttempts.id) })
    .from(quizAttempts)
    .where(and(
      eq(quizAttempts.quizId, quizId),
      eq(quizAttempts.studentId, studentId),
      inArray(quizAttempts.status, ["SUBMITTED", "AUTO_SUBMITTED", "FLAGGED"])
    ));

  if (Number(used) >= quiz.maxAttempts) {
    redirect(`/student/classrooms/${classroomId}/quiz/${quizId}/result`);
  }

  // Load questions
  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.quizId, quizId))
    .orderBy(questions.order);

  // Load options (student never sees isCorrect)
  const questionIds = questionRows.map((q) => q.id);
  let optionRows: (typeof options.$inferSelect)[] = [];
  if (questionIds.length > 0) {
    optionRows = await db.select().from(options).where(inArray(options.questionId, questionIds));
  }

  const optsByQ = optionRows.reduce<Record<string, typeof optionRows>>((acc, o) => {
    (acc[o.questionId] ??= []).push(o);
    return acc;
  }, {});

  // Build sanitized questions (strip isCorrect + modelAnswer)
  let quizQuestions = questionRows.map((q) => ({
    id:       q.id,
    text:     q.text,
    type:     q.type as "MCQ" | "QA",
    imageUrl: q.imageUrl,
    marks:    q.marks,
    order:    q.order,
    options:  (optsByQ[q.id] ?? []).map((o) => ({ id: o.id, text: o.text })),
  }));

  // Shuffle if needed
  if (quiz.shuffleQuestions) quizQuestions = shuffle(quizQuestions);
  if (quiz.shuffleOptions) {
    quizQuestions = quizQuestions.map((q) => ({
      ...q,
      options: q.type === "MCQ" ? shuffle(q.options) : q.options,
    }));
  }

  // Check for existing IN_PROGRESS attempt (resume case)
  const [existingAttempt] = await db
    .select()
    .from(quizAttempts)
    .where(and(
      eq(quizAttempts.quizId, quizId),
      eq(quizAttempts.studentId, studentId),
      eq(quizAttempts.status, "IN_PROGRESS")
    ))
    .limit(1);

  // Load existing answers if resuming
  type ExistingAnswers = Record<string, { selectedOptionId?: string; textAnswer?: string; timeTakenSecs: number }>;
  let existingAnswers: ExistingAnswers = {};
  if (existingAttempt) {
    const savedAnswers = await db
      .select()
      .from(answers)
      .where(eq(answers.attemptId, existingAttempt.id));
    existingAnswers = Object.fromEntries(
      savedAnswers.map((a) => [
        a.questionId,
        {
          selectedOptionId: a.selectedOptionId ?? undefined,
          textAnswer:       a.textAnswer       ?? undefined,
          timeTakenSecs:    a.timeTakenSecs,
        },
      ])
    );
  }

  return (
    <QuizSessionClient
      quiz={{
        id:            quiz.id,
        title:         quiz.title,
        description:   quiz.description,
        type:          quiz.type,
        totalMarks:    quiz.totalMarks,
        timeLimitMins: quiz.timeLimitMins,
        showResults:   quiz.showResults,
        maxAttempts:   quiz.maxAttempts,
      }}
      questions={quizQuestions}
      classroomId={classroomId}
      existingAttempt={
        existingAttempt
          ? {
              id:               existingAttempt.id,
              timerElapsedSecs: existingAttempt.timerElapsedSecs,
              answers:          existingAnswers,
            }
          : null
      }
    />
  );
}
