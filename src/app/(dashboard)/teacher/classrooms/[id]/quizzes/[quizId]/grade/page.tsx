import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  classrooms,
  quizzes,
  questions,
  quizAttempts,
  answers,
  users,
} from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import GradeClient from "../grade-client";

export default async function GradePage({
  params,
}: {
  params: Promise<{ id: string; quizId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id, quizId } = await params;

  // Verify teacher owns classroom + quiz
  const [row] = await db
    .select({ quiz: quizzes, classroom: classrooms })
    .from(quizzes)
    .innerJoin(classrooms, eq(quizzes.classroomId, classrooms.id))
    .where(
      and(
        eq(quizzes.id, quizId),
        eq(quizzes.classroomId, id),
        eq(classrooms.teacherId, session.user.id)
      )
    )
    .limit(1);

  if (!row) notFound();

  const { quiz } = row;

  // Only QA or MIXED quizzes can be manually graded
  if (quiz.type !== "QA" && quiz.type !== "MIXED") {
    redirect(`/teacher/classrooms/${id}/quizzes/${quizId}`);
  }

  // Load all QA questions for this quiz
  const qaQuestions = await db
    .select({
      id: questions.id,
      text: questions.text,
      marks: questions.marks,
      order: questions.order,
    })
    .from(questions)
    .where(
      and(
        eq(questions.quizId, quizId),
        eq(questions.type, "QA")
      )
    )
    .orderBy(questions.order);

  // Load all submitted/auto-submitted/flagged attempts with student info
  const attemptRows = await db
    .select({
      attempt: quizAttempts,
      studentName: users.name,
      studentEmail: users.email,
    })
    .from(quizAttempts)
    .innerJoin(users, eq(quizAttempts.studentId, users.id))
    .where(
      and(
        eq(quizAttempts.quizId, quizId),
        inArray(quizAttempts.status, ["SUBMITTED", "AUTO_SUBMITTED", "FLAGGED"])
      )
    )
    .orderBy(quizAttempts.submittedAt);

  // For each attempt load QA answers
  const attemptIds = attemptRows.map((r) => r.attempt.id);
  const qaQuestionIds = qaQuestions.map((q) => q.id);

  let answerRows: {
    id: string;
    attemptId: string;
    questionId: string;
    textAnswer: string | null;
    marksAwarded: number | null;
  }[] = [];

  if (attemptIds.length > 0 && qaQuestionIds.length > 0) {
    answerRows = await db
      .select({
        id: answers.id,
        attemptId: answers.attemptId,
        questionId: answers.questionId,
        textAnswer: answers.textAnswer,
        marksAwarded: answers.marksAwarded,
      })
      .from(answers)
      .where(
        and(
          inArray(answers.attemptId, attemptIds),
          inArray(answers.questionId, qaQuestionIds)
        )
      );
  }

  // Build answers map per attempt: Record<attemptId, Record<questionId, answer>>
  const answersMap: Record<
    string,
    Record<string, { id: string; textAnswer: string | null; marksAwarded: number | null }>
  > = {};
  for (const a of answerRows) {
    (answersMap[a.attemptId] ??= {})[a.questionId] = {
      id: a.id,
      textAnswer: a.textAnswer,
      marksAwarded: a.marksAwarded,
    };
  }

  const attemptsForClient = attemptRows.map((r) => ({
    id: r.attempt.id,
    studentName: r.studentName,
    studentEmail: r.studentEmail,
    submittedAt: r.attempt.submittedAt,
    status: r.attempt.status,
    answers: answersMap[r.attempt.id] ?? {},
  }));

  return (
    <GradeClient
      quiz={{ id: quiz.id, title: quiz.title, type: quiz.type }}
      classroomId={id}
      questions={qaQuestions}
      attempts={attemptsForClient}
    />
  );
}
