import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  organizations,
  orgTeachers,
  classrooms,
  classroomStudents,
  quizzes,
  quizAttempts,
  users,
} from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ORGANIZATION") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.userId, session.user.id))
    .limit(1);

  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  // Load all data needed for CSV
  const activeTeachers = await db
    .select({ teacherId: orgTeachers.teacherId })
    .from(orgTeachers)
    .where(and(eq(orgTeachers.orgId, org.id), eq(orgTeachers.status, "ACTIVE")));

  const teacherIds = activeTeachers.map((t) => t.teacherId);

  let classroomRows: { id: string; name: string; teacherId: string }[] = [];
  if (teacherIds.length > 0) {
    classroomRows = await db
      .select({ id: classrooms.id, name: classrooms.name, teacherId: classrooms.teacherId })
      .from(classrooms)
      .where(inArray(classrooms.teacherId, teacherIds));
  }

  const classroomIds = classroomRows.map((c) => c.id);

  let quizRows: { id: string; title: string; classroomId: string; totalMarks: number }[] = [];
  if (classroomIds.length > 0) {
    quizRows = await db
      .select({ id: quizzes.id, title: quizzes.title, classroomId: quizzes.classroomId, totalMarks: quizzes.totalMarks })
      .from(quizzes)
      .where(inArray(quizzes.classroomId, classroomIds));
  }

  const quizIds = quizRows.map((q) => q.id);

  let attemptRows: { studentId: string; quizId: string; totalScore: number | null; status: string; isFlagged: boolean; submittedAt: Date | null }[] = [];
  if (quizIds.length > 0) {
    attemptRows = await db
      .select({
        studentId: quizAttempts.studentId,
        quizId: quizAttempts.quizId,
        totalScore: quizAttempts.totalScore,
        status: quizAttempts.status,
        isFlagged: quizAttempts.isFlagged,
        submittedAt: quizAttempts.submittedAt,
      })
      .from(quizAttempts)
      .where(
        and(
          inArray(quizAttempts.quizId, quizIds),
          inArray(quizAttempts.status, ["SUBMITTED", "AUTO_SUBMITTED", "FLAGGED"])
        )
      );
  }

  // Load student + teacher names
  const allUserIds = Array.from(
    new Set([...attemptRows.map((a) => a.studentId), ...teacherIds])
  );
  let userRows: { id: string; name: string; email: string }[] = [];
  if (allUserIds.length > 0) {
    userRows = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(inArray(users.id, allUserIds));
  }
  const userMap = Object.fromEntries(userRows.map((u) => [u.id, u]));
  const classroomMap = Object.fromEntries(classroomRows.map((c) => [c.id, c]));
  const quizMap = Object.fromEntries(quizRows.map((q) => [q.id, q]));

  // Build CSV rows
  const header = ["Student Name", "Student Email", "Classroom", "Teacher", "Quiz", "Score", "Total Marks", "Score %", "Status", "Flagged", "Submitted At"];

  const rows = attemptRows.map((a) => {
    const student = userMap[a.studentId];
    const quiz = quizMap[a.quizId];
    const classroom = quiz ? classroomMap[quiz.classroomId] : null;
    const teacher = classroom ? userMap[classroom.teacherId] : null;
    const scorePct =
      a.totalScore !== null && quiz && quiz.totalMarks > 0
        ? ((a.totalScore / quiz.totalMarks) * 100).toFixed(1)
        : "";
    return [
      student?.name ?? "",
      student?.email ?? "",
      classroom?.name ?? "",
      teacher?.name ?? "",
      quiz?.title ?? "",
      a.totalScore !== null ? String(a.totalScore) : "",
      quiz ? String(quiz.totalMarks) : "",
      scorePct,
      a.status,
      a.isFlagged ? "Yes" : "No",
      a.submittedAt ? a.submittedAt.toISOString() : "",
    ];
  });

  function escapeCSV(val: string) {
    const neutralized = /^[=+\-@\t\r]/.test(val) ? `'${val}` : val;
    if (neutralized.includes(",") || neutralized.includes('"') || neutralized.includes("\n")) {
      return `"${neutralized.replace(/"/g, '""')}"`;
    }
    return neutralized;
  }

  const csvLines = [header, ...rows]
    .map((row) => row.map(escapeCSV).join(","))
    .join("\n");

  return new NextResponse(csvLines, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="org-analytics-${org.id}.csv"`,
    },
  });
}
