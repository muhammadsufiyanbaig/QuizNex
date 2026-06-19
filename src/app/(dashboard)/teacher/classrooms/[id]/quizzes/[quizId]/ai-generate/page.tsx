import { auth } from "@/auth";
import { db } from "@/lib/db";
import { quizzes, classrooms } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import AiGenerateClient from "./ai-generate-client";

export default async function AiGeneratePage({
  params,
}: {
  params: Promise<{ id: string; quizId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id: classroomId, quizId } = await params;

  const [quiz] = await db
    .select({ id: quizzes.id, title: quizzes.title, type: quizzes.type, status: quizzes.status })
    .from(quizzes)
    .innerJoin(classrooms, eq(quizzes.classroomId, classrooms.id))
    .where(and(eq(quizzes.id, quizId), eq(classrooms.teacherId, session.user.id!)))
    .limit(1);

  if (!quiz) notFound();

  // Can only add questions to DRAFT or PUBLISHED quizzes
  if (
    quiz.status === "ACTIVE" ||
    quiz.status === "COMPLETED" ||
    quiz.status === "ARCHIVED"
  ) {
    redirect(`/teacher/classrooms/${classroomId}/quizzes/${quizId}`);
  }

  return (
    <AiGenerateClient
      quiz={{ id: quiz.id, title: quiz.title, type: quiz.type as "MCQ" | "QA" | "MIXED" }}
      classroomId={classroomId}
    />
  );
}
