import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  classrooms,
  classroomStudents,
  quizzes,
  quizAttempts,
  users,
} from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

function escapeCSV(val: string): string {
  // Neutralize formula injection: cells starting with =, +, -, @, \t, \r
  // are prefixed with a single quote so spreadsheet apps treat them as text.
  const neutralized = /^[=+\-@\t\r]/.test(val) ? `'${val}` : val;
  if (neutralized.includes(",") || neutralized.includes('"') || neutralized.includes("\n")) {
    return `"${neutralized.replace(/"/g, '""')}"`;
  }
  return neutralized;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  // Verify ownership
  const [classroom] = await db
    .select()
    .from(classrooms)
    .where(and(eq(classrooms.id, id), eq(classrooms.teacherId, session.user.id)))
    .limit(1);
  if (!classroom) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Active students
  const studentRows = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(classroomStudents)
    .innerJoin(users, eq(classroomStudents.studentId, users.id))
    .where(and(eq(classroomStudents.classroomId, id), eq(classroomStudents.status, "ACTIVE")));

  // All quizzes
  const classroomQuizzes = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.classroomId, id))
    .orderBy(quizzes.displayOrder);

  const quizIds = classroomQuizzes.map((q) => q.id);

  // Completed attempts
  let allAttempts: (typeof quizAttempts.$inferSelect)[] = [];
  if (quizIds.length > 0) {
    allAttempts = await db
      .select()
      .from(quizAttempts)
      .where(
        and(
          inArray(quizAttempts.quizId, quizIds),
          inArray(quizAttempts.status, ["SUBMITTED", "AUTO_SUBMITTED", "FLAGGED"])
        )
      );
  }

  // ── Build two sections ───────────────────────────────────────────────────────

  // Section 1: Student Rankings
  const studentRankings = studentRows
    .map((s) => {
      const sAttempts = allAttempts.filter((a) => a.studentId === s.id);
      const scores    = sAttempts.map((a) => a.totalScore).filter((x): x is number => x !== null);
      const avgScore  = scores.length > 0 ? scores.reduce((sum, v) => sum + v, 0) / scores.length : null;
      const totalScore = scores.reduce((sum, v) => sum + v, 0);
      const quizzesAttempted = new Set(sAttempts.map((a) => a.quizId)).size;
      const flaggedCount = sAttempts.filter((a) => a.isFlagged).length;
      return { ...s, quizzesAttempted, avgScore, totalScore, flaggedCount };
    })
    .sort((a, b) => {
      if (a.avgScore === null && b.avgScore === null) return 0;
      if (a.avgScore === null) return 1;
      if (b.avgScore === null) return -1;
      return b.avgScore - a.avgScore;
    });

  // Section 2: Quiz Stats
  const quizStats = classroomQuizzes.map((quiz) => {
    const qAttempts = allAttempts.filter((a) => a.quizId === quiz.id);
    const scores    = qAttempts.map((a) => a.totalScore).filter((x): x is number => x !== null);
    const avgScore  = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : null;
    const avgScorePct = avgScore !== null && quiz.totalMarks > 0
      ? (avgScore / quiz.totalMarks) * 100 : null;
    const uniqueStudents = new Set(qAttempts.map((a) => a.studentId)).size;
    const flaggedCount   = qAttempts.filter((a) => a.isFlagged).length;
    return { ...quiz, attempted: uniqueStudents, avgScore, avgScorePct, flaggedCount };
  });

  // ── Build CSV ────────────────────────────────────────────────────────────────
  const lines: string[] = [];

  // Metadata
  lines.push(`Classroom Analytics — ${classroom.name}`);
  lines.push(`Exported: ${new Date().toISOString()}`);
  lines.push("");

  // Summary
  lines.push("SUMMARY");
  lines.push(["Total Students", "Total Quizzes", "Overall Avg Score", "Completion Rate"].map(escapeCSV).join(","));
  const studentsWithAttempts = new Set(allAttempts.map((a) => a.studentId)).size;
  const allScores = allAttempts.map((a) => a.totalScore).filter((x): x is number => x !== null);
  const overallAvg = allScores.length > 0 ? (allScores.reduce((s, v) => s + v, 0) / allScores.length).toFixed(1) : "N/A";
  const completionRate = studentRows.length > 0
    ? ((studentsWithAttempts / studentRows.length) * 100).toFixed(1) + "%" : "N/A";
  lines.push([
    String(studentRows.length),
    String(classroomQuizzes.length),
    overallAvg,
    completionRate,
  ].map(escapeCSV).join(","));
  lines.push("");

  // Student Rankings
  lines.push("STUDENT RANKINGS");
  lines.push(["Rank", "Name", "Email", "Quizzes Attempted", "Avg Score", "Total Score", "Flagged"].map(escapeCSV).join(","));
  studentRankings.forEach((s, idx) => {
    lines.push([
      String(idx + 1),
      s.name,
      s.email,
      String(s.quizzesAttempted),
      s.avgScore !== null ? s.avgScore.toFixed(1) : "",
      String(s.totalScore),
      s.flaggedCount > 0 ? "Yes" : "No",
    ].map(escapeCSV).join(","));
  });
  lines.push("");

  // Quiz Performance
  lines.push("QUIZ PERFORMANCE");
  lines.push(["Quiz Title", "Type", "Total Marks", "Students Attempted", "Avg Score", "Avg Score %", "Flagged"].map(escapeCSV).join(","));
  quizStats.forEach((q) => {
    lines.push([
      q.title,
      q.type,
      String(q.totalMarks),
      String(q.attempted),
      q.avgScore !== null ? q.avgScore.toFixed(1) : "",
      q.avgScorePct !== null ? q.avgScorePct.toFixed(1) + "%" : "",
      String(q.flaggedCount),
    ].map(escapeCSV).join(","));
  });

  const csv = lines.join("\n");
  const filename = `classroom-analytics-${classroom.name.replace(/[^a-z0-9]/gi, "-")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
