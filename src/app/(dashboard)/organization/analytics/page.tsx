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
import { eq, and, inArray, count, avg, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Building2, BarChart2 } from "lucide-react";

export default async function OrgAnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.userId, session.user.id))
    .limit(1);

  if (!org) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Organization Analytics</h1>
        </div>
        <div className="glass-card rounded-2xl flex flex-col items-center gap-4 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-500/10">
            <Building2 className="h-8 w-8 text-slate-500" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-white">Organization not set up</p>
            <p className="mt-1 text-sm text-slate-400">
              Complete your organization profile first.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Load ACTIVE teachers
  const activeOrgTeachers = await db
    .select({ teacherId: orgTeachers.teacherId })
    .from(orgTeachers)
    .where(
      and(
        eq(orgTeachers.orgId, org.id),
        eq(orgTeachers.status, "ACTIVE")
      )
    );

  const teacherIds = activeOrgTeachers.map((t) => t.teacherId);
  const teacherCount = teacherIds.length;

  let classroomRows: { id: string; name: string; teacherId: string }[] = [];
  if (teacherIds.length > 0) {
    classroomRows = await db
      .select({ id: classrooms.id, name: classrooms.name, teacherId: classrooms.teacherId })
      .from(classrooms)
      .where(inArray(classrooms.teacherId, teacherIds));
  }

  const classroomIds = classroomRows.map((c) => c.id);
  const classroomCount = classroomIds.length;

  // Unique students
  let uniqueStudentIds: string[] = [];
  let totalEnrollments = 0;
  if (classroomIds.length > 0) {
    const enrollmentRows = await db
      .select({ studentId: classroomStudents.studentId })
      .from(classroomStudents)
      .where(
        and(
          inArray(classroomStudents.classroomId, classroomIds),
          eq(classroomStudents.status, "ACTIVE")
        )
      );
    totalEnrollments = enrollmentRows.length;
    uniqueStudentIds = Array.from(new Set(enrollmentRows.map((e) => e.studentId)));
  }

  const uniqueStudentCount = uniqueStudentIds.length;

  // Quizzes and attempts
  let quizRows: { id: string; title: string; classroomId: string }[] = [];
  if (classroomIds.length > 0) {
    quizRows = await db
      .select({ id: quizzes.id, title: quizzes.title, classroomId: quizzes.classroomId })
      .from(quizzes)
      .where(inArray(quizzes.classroomId, classroomIds));
  }

  const quizIds = quizRows.map((q) => q.id);
  const quizCount = quizIds.length;

  let totalAttempts = 0;
  let overallAvgScore: number | null = null;

  if (quizIds.length > 0) {
    const [attemptRow] = await db
      .select({ cnt: count() })
      .from(quizAttempts)
      .where(inArray(quizAttempts.quizId, quizIds));
    totalAttempts = Number(attemptRow?.cnt ?? 0);

    const [avgRow] = await db
      .select({ avg: avg(quizAttempts.totalScore) })
      .from(quizAttempts)
      .where(
        and(
          inArray(quizAttempts.quizId, quizIds),
          sql`${quizAttempts.totalScore} is not null`
        )
      );
    overallAvgScore = avgRow?.avg != null ? Number(avgRow.avg) : null;
  }

  // Per-teacher summary
  type TeacherSummary = {
    teacherId: string;
    teacherName: string;
    classroomCount: number;
    studentCount: number;
    quizCount: number;
    avgScore: number | null;
  };

  const teacherSummaries: TeacherSummary[] = [];

  if (teacherIds.length > 0) {
    const teacherUserRows = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, teacherIds));

    for (const teacher of teacherUserRows) {
      const teacherClassrooms = classroomRows.filter(
        (c) => c.teacherId === teacher.id
      );
      const tClassroomIds = teacherClassrooms.map((c) => c.id);

      let tStudentCount = 0;
      let tQuizCount = 0;
      let tAvgScore: number | null = null;

      if (tClassroomIds.length > 0) {
        const enrollRows = await db
          .select({ studentId: classroomStudents.studentId })
          .from(classroomStudents)
          .where(
            and(
              inArray(classroomStudents.classroomId, tClassroomIds),
              eq(classroomStudents.status, "ACTIVE")
            )
          );
        tStudentCount = new Set(enrollRows.map((e) => e.studentId)).size;

        const tQuizRows = await db
          .select({ id: quizzes.id })
          .from(quizzes)
          .where(inArray(quizzes.classroomId, tClassroomIds));
        tQuizCount = tQuizRows.length;

        const tQuizIds = tQuizRows.map((q) => q.id);
        if (tQuizIds.length > 0) {
          const [tAvgRow] = await db
            .select({ avg: avg(quizAttempts.totalScore) })
            .from(quizAttempts)
            .where(
              and(
                inArray(quizAttempts.quizId, tQuizIds),
                sql`${quizAttempts.totalScore} is not null`
              )
            );
          tAvgScore = tAvgRow?.avg != null ? Number(tAvgRow.avg) : null;
        }
      }

      teacherSummaries.push({
        teacherId: teacher.id,
        teacherName: teacher.name,
        classroomCount: tClassroomIds.length,
        studentCount: tStudentCount,
        quizCount: tQuizCount,
        avgScore: tAvgScore,
      });
    }
  }

  // ── Student leaderboard ───────────────────────────────────────────────────
  type StudentRank = {
    studentId: string;
    name: string;
    email: string;
    quizzesAttempted: number;
    avgScorePct: number | null;
    totalScore: number;
  };

  const studentLeaderboard: StudentRank[] = [];

  if (uniqueStudentIds.length > 0 && quizIds.length > 0) {
    const studentUserRows = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(inArray(users.id, uniqueStudentIds));

    // Load all completed attempts for org quizzes
    const leaderboardAttempts = await db
      .select()
      .from(quizAttempts)
      .where(
        and(
          inArray(quizAttempts.quizId, quizIds),
          inArray(quizAttempts.status, ["SUBMITTED", "AUTO_SUBMITTED", "FLAGGED"])
        )
      );

    // Build quiz totalMarks lookup
    const quizMarksMap = Object.fromEntries(
      (await db.select({ id: quizzes.id, totalMarks: quizzes.totalMarks })
        .from(quizzes)
        .where(inArray(quizzes.id, quizIds)))
        .map((q) => [q.id, q.totalMarks])
    );

    for (const student of studentUserRows) {
      const sAttempts = leaderboardAttempts.filter((a) => a.studentId === student.id);
      // Latest attempt per quiz
      const attemptsByQuizId = sAttempts.reduce<Record<string, typeof sAttempts[0]>>(
        (acc, a) => {
          const existing = acc[a.quizId];
          if (!existing || (a.submittedAt?.getTime() ?? 0) > (existing.submittedAt?.getTime() ?? 0)) {
            acc[a.quizId] = a;
          }
          return acc;
        },
        {}
      );
      const latestAttempts = Object.values(attemptsByQuizId);
      if (latestAttempts.length === 0) continue;
      const scoredAttempts = latestAttempts.filter((a) => a.totalScore !== null);
      const totalMarksForAttempted = scoredAttempts.reduce(
        (sum, a) => sum + (quizMarksMap[a.quizId] ?? 0), 0
      );
      const totalScore = scoredAttempts.reduce((sum, a) => sum + (a.totalScore ?? 0), 0);
      const avgScorePct = totalMarksForAttempted > 0 ? (totalScore / totalMarksForAttempted) * 100 : null;

      studentLeaderboard.push({
        studentId: student.id,
        name: student.name,
        email: student.email,
        quizzesAttempted: latestAttempts.length,
        avgScorePct,
        totalScore,
      });
    }
    studentLeaderboard.sort((a, b) => {
      if (a.avgScorePct === null) return 1;
      if (b.avgScorePct === null) return -1;
      return b.avgScorePct - a.avgScorePct;
    });
  }

  // Top 5 quizzes by attempt count
  type TopQuiz = {
    id: string;
    title: string;
    classroomName: string;
    attemptCount: number;
    avgScore: number | null;
  };

  const topQuizzes: TopQuiz[] = [];

  if (quizIds.length > 0) {
    for (const quiz of quizRows) {
      const [aRow] = await db
        .select({ cnt: count(), avg: avg(quizAttempts.totalScore) })
        .from(quizAttempts)
        .where(eq(quizAttempts.quizId, quiz.id));

      topQuizzes.push({
        id: quiz.id,
        title: quiz.title,
        classroomName:
          classroomRows.find((c) => c.id === quiz.classroomId)?.name ?? "—",
        attemptCount: Number(aRow?.cnt ?? 0),
        avgScore: aRow?.avg != null ? Number(aRow.avg) : null,
      });
    }
    topQuizzes.sort((a, b) => b.attemptCount - a.attemptCount);
    topQuizzes.splice(5);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-500/25">
            <BarChart2 className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Organization Analytics</h1>
            <p className="text-sm text-slate-400">Aggregate data across all teachers and classrooms.</p>
          </div>
        </div>
        <a
          href="/api/organization/analytics/export"
          download="org-analytics.csv"
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          Export CSV
        </a>
      </div>

      {/* 5 stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "Teachers", value: teacherCount, color: "text-violet-400" },
          { label: "Classrooms", value: classroomCount, color: "text-blue-400" },
          { label: "Students", value: uniqueStudentCount, color: "text-green-400" },
          { label: "Quizzes", value: quizCount, color: "text-amber-400" },
          {
            label: "Avg Score",
            value: overallAvgScore != null ? overallAvgScore.toFixed(1) : "—",
            color: "text-pink-400",
          },
        ].map((stat) => (
          <div key={stat.label} className="glass-card rounded-2xl p-5 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="mt-1 text-xs text-slate-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Teacher Performance table */}
      <div className="space-y-3">
        <h2 className="font-semibold text-white">Teacher Performance</h2>
        {teacherSummaries.length === 0 ? (
          <div className="glass-card rounded-2xl px-6 py-10 text-center text-sm text-slate-500">
            No active teachers yet.
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="hidden grid-cols-[1fr_80px_80px_80px_100px] gap-4 border-b border-white/8 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:grid">
              <span>Teacher</span>
              <span className="text-center">Classrooms</span>
              <span className="text-center">Students</span>
              <span className="text-center">Quizzes</span>
              <span className="text-center">Avg Score</span>
            </div>
            <div className="divide-y divide-white/5">
              {teacherSummaries.map((t) => (
                <div
                  key={t.teacherId}
                  className="grid grid-cols-1 gap-2 px-6 py-4 sm:grid-cols-[1fr_80px_80px_80px_100px] sm:items-center sm:gap-4"
                >
                  <p className="text-sm font-medium text-white">{t.teacherName}</p>
                  <p className="text-center text-sm text-white">{t.classroomCount}</p>
                  <p className="text-center text-sm text-white">{t.studentCount}</p>
                  <p className="text-center text-sm text-white">{t.quizCount}</p>
                  <p className="text-center text-sm text-white">
                    {t.avgScore != null ? t.avgScore.toFixed(1) : "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Student Leaderboard */}
      {studentLeaderboard.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-white">Student Leaderboard</h2>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="hidden grid-cols-[40px_1fr_1fr_100px_100px_100px] gap-4 border-b border-white/8 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:grid">
              <span>#</span>
              <span>Student</span>
              <span>Email</span>
              <span className="text-center">Quizzes</span>
              <span className="text-center">Avg %</span>
              <span className="text-center">Total Score</span>
            </div>
            <div className="divide-y divide-white/5">
              {studentLeaderboard.slice(0, 20).map((s, idx) => (
                <div
                  key={s.studentId}
                  className="grid grid-cols-1 gap-2 px-6 py-3 sm:grid-cols-[40px_1fr_1fr_100px_100px_100px] sm:items-center sm:gap-4"
                >
                  <p className={`text-sm font-bold ${idx === 0 ? "text-amber-400" : idx === 1 ? "text-slate-300" : idx === 2 ? "text-amber-700" : "text-slate-500"}`}>
                    #{idx + 1}
                  </p>
                  <p className="text-sm font-medium text-white">{s.name}</p>
                  <p className="text-sm text-slate-400 truncate">{s.email}</p>
                  <p className="text-center text-sm text-slate-300">{s.quizzesAttempted}</p>
                  <p className="text-center text-sm font-semibold">
                    {s.avgScorePct !== null ? (
                      <span className={s.avgScorePct >= 70 ? "text-green-400" : s.avgScorePct >= 40 ? "text-amber-400" : "text-red-400"}>
                        {s.avgScorePct.toFixed(1)}%
                      </span>
                    ) : "—"}
                  </p>
                  <p className="text-center text-sm text-slate-300">{s.totalScore}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Quizzes */}
      {topQuizzes.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-white">Top Quizzes by Attempts</h2>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="hidden grid-cols-[1fr_1fr_100px_100px] gap-4 border-b border-white/8 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:grid">
              <span>Quiz</span>
              <span>Classroom</span>
              <span className="text-center">Attempts</span>
              <span className="text-center">Avg Score</span>
            </div>
            <div className="divide-y divide-white/5">
              {topQuizzes.map((q) => (
                <div
                  key={q.id}
                  className="grid grid-cols-1 gap-2 px-6 py-4 sm:grid-cols-[1fr_1fr_100px_100px] sm:items-center sm:gap-4"
                >
                  <p className="text-sm font-medium text-white">{q.title}</p>
                  <p className="text-sm text-slate-400">{q.classroomName}</p>
                  <p className="text-center text-sm text-white">{q.attemptCount}</p>
                  <p className="text-center text-sm text-white">
                    {q.avgScore != null ? q.avgScore.toFixed(1) : "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
