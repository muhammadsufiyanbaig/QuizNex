import { auth } from "@/auth";
import { db } from "@/lib/db";
import { classrooms, quizzes, questions, options } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import QuizEditorClient from "./quiz-editor-client";

export default async function QuizEditorPage({
  params,
}: {
  params: Promise<{ id: string; quizId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id, quizId } = await params;

  // Fetch quiz and verify ownership via classroom
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

  const { quiz, classroom } = row;

  // Fetch questions ordered by `order`
  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.quizId, quizId))
    .orderBy(questions.order);

  // Fetch options for all questions
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

  return (
    <QuizEditorClient
      quiz={quiz}
      questions={questionsWithOptions}
      classroomId={id}
      classroomName={classroom.name}
    />
  );
}
