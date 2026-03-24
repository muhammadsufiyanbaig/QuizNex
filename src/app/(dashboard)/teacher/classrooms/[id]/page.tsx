import { auth } from "@/auth";
import { db } from "@/lib/db";
import { classrooms, classroomStudents, users, quizAttempts, quizzes } from "@/lib/db/schema";
import { eq, and, count, avg, inArray, sql } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import ClassroomDetailClient from "./classroom-detail-client";

export default async function TeacherClassroomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const [classroom] = await db
    .select()
    .from(classrooms)
    .where(and(eq(classrooms.id, id), eq(classrooms.teacherId, session.user.id)))
    .limit(1);

  if (!classroom) notFound();

  const studentRows = await db
    .select({
      id:       users.id,
      name:     users.name,
      email:    users.email,
      joinedAt: classroomStudents.joinedAt,
      status:   classroomStudents.status,
    })
    .from(classroomStudents)
    .innerJoin(users, eq(classroomStudents.studentId, users.id))
    .where(eq(classroomStudents.classroomId, id));

  // Fetch per-student attempt stats scoped to this classroom's quizzes
  const classroomQuizIds = await db
    .select({ id: quizzes.id })
    .from(quizzes)
    .where(eq(quizzes.classroomId, id));

  const quizIdList = classroomQuizIds.map((q) => q.id);

  type StatsRow = { studentId: string; attempts: number; avgScore: number | null };
  let statsMap: Record<string, StatsRow> = {};

  if (quizIdList.length > 0) {
    const attemptStats = await db
      .select({
        studentId: quizAttempts.studentId,
        attempts:  count(quizAttempts.id),
        avgScore:  avg(quizAttempts.totalScore),
      })
      .from(quizAttempts)
      .where(
        and(
          inArray(quizAttempts.quizId, quizIdList),
          inArray(quizAttempts.status, ["SUBMITTED", "AUTO_SUBMITTED"])
        )
      )
      .groupBy(quizAttempts.studentId);

    statsMap = Object.fromEntries(
      attemptStats.map((s) => [
        s.studentId,
        {
          studentId: s.studentId,
          attempts:  Number(s.attempts),
          avgScore:  s.avgScore != null ? Number(s.avgScore) : null,
        },
      ])
    );
  }

  const students = studentRows.map((s) => ({
    ...s,
    quizzesAttempted: statsMap[s.id]?.attempts ?? 0,
    averageScore:     statsMap[s.id]?.avgScore ?? null,
  }));

  // Total attempts count across all quizzes (for deletion warning)
  let totalAttempts = 0;
  if (quizIdList.length > 0) {
    const [{ cnt }] = await db
      .select({ cnt: count(quizAttempts.id) })
      .from(quizAttempts)
      .where(inArray(quizAttempts.quizId, quizIdList));
    totalAttempts = Number(cnt);
  }

  return (
    <ClassroomDetailClient
      classroom={classroom}
      students={students}
      quizCount={quizIdList.length}
      totalAttempts={totalAttempts}
    />
  );
}
