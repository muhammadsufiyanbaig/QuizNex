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
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function ClassroomAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "TEACHER") redirect("/login");

  const { id } = await params;

  // Load classroom + verify ownership
  const [classroom] = await db
    .select()
    .from(classrooms)
    .where(and(eq(classrooms.id, id), eq(classrooms.teacherId, session.user.id)))
    .limit(1);

  if (!classroom) notFound();

  // All ACTIVE students
  const studentRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      joinedAt: classroomStudents.joinedAt,
      status: classroomStudents.status,
    })
    .from(classroomStudents)
    .innerJoin(users, eq(classroomStudents.studentId, users.id))
    .where(
      and(eq(classroomStudents.classroomId, id), eq(classroomStudents.status, "ACTIVE"))
    );

  // All quizzes in classroom
  const classroomQuizzes = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.classroomId, id))
    .orderBy(quizzes.displayOrder);

  const quizIdList = classroomQuizzes.map((q) => q.id);

  // All completed attempts for this classroom's quizzes
  let allAttempts: (typeof quizAttempts.$inferSelect)[] = [];
  if (quizIdList.length > 0) {
    allAttempts = await db
      .select()
      .from(quizAttempts)
      .where(
        and(
          inArray(quizAttempts.quizId, quizIdList),
          inArray(quizAttempts.status, ["SUBMITTED", "AUTO_SUBMITTED", "FLAGGED"])
        )
      );
  }

  // ── Per-quiz stats ────────────────────────────────────────────────────────
  const quizStats = classroomQuizzes.map((quiz) => {
    const qAttempts = allAttempts.filter((a) => a.quizId === quiz.id);
    const uniqueStudents = new Set(qAttempts.map((a) => a.studentId)).size;
    const scores = qAttempts
      .map((a) => a.totalScore)
      .filter((s): s is number => s !== null);
    const avgScore =
      scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : null;
    const avgScorePct =
      avgScore !== null && quiz.totalMarks > 0
        ? (avgScore / quiz.totalMarks) * 100
        : null;
    const flaggedCount = qAttempts.filter((a) => a.isFlagged).length;
    // Difficulty: based on avg score %
    const difficulty: "Easy" | "Medium" | "Hard" | null =
      avgScorePct === null ? null
      : avgScorePct >= 70 ? "Easy"
      : avgScorePct >= 40 ? "Medium"
      : "Hard";

    return {
      id: quiz.id,
      title: quiz.title,
      type: quiz.type,
      totalMarks: quiz.totalMarks,
      attempted: uniqueStudents,
      avgScore,
      avgScorePct,
      flaggedCount,
      difficulty,
    };
  });

  // ── Student rankings ──────────────────────────────────────────────────────
  const studentRankings = studentRows
    .map((student) => {
      const sAttempts = allAttempts.filter((a) => a.studentId === student.id);
      const scores = sAttempts
        .map((a) => a.totalScore)
        .filter((s): s is number => s !== null);
      const avgScore =
        scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : null;
      const totalScore = scores.reduce((sum, s) => sum + s, 0);
      const flaggedCount = sAttempts.filter((a) => a.isFlagged).length;

      // Unique quizzes attempted
      const quizzesAttempted = new Set(sAttempts.map((a) => a.quizId)).size;

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        quizzesAttempted,
        avgScore,
        totalScore,
        flaggedCount,
      };
    })
    .sort((a, b) => {
      if (a.avgScore === null && b.avgScore === null) return 0;
      if (a.avgScore === null) return 1;
      if (b.avgScore === null) return -1;
      return b.avgScore - a.avgScore;
    });

  // ── Overall stats ─────────────────────────────────────────────────────────
  const totalStudents = studentRows.length;
  const totalQuizzes = classroomQuizzes.length;

  const allScores = allAttempts
    .map((a) => a.totalScore)
    .filter((s): s is number => s !== null);
  const overallAvgScore =
    allScores.length > 0
      ? allScores.reduce((sum, s) => sum + s, 0) / allScores.length
      : null;

  // Completion rate: students who attempted at least 1 quiz / total enrolled
  const studentsWithAttempts = new Set(allAttempts.map((a) => a.studentId)).size;
  const completionRate =
    totalStudents > 0 ? (studentsWithAttempts / totalStudents) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/teacher/classrooms/${id}`}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-100 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Classroom
        </Link>
      </div>
      <div>
        <h1 className="text-3xl font-bold gradient-text">{classroom.name} — Analytics</h1>
        {classroom.subject && (
          <p className="text-slate-400 mt-1">{classroom.subject}</p>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Students", value: totalStudents },
          { label: "Total Quizzes", value: totalQuizzes },
          {
            label: "Avg Score",
            value: overallAvgScore !== null ? overallAvgScore.toFixed(1) : "N/A",
          },
          { label: "Completion Rate", value: `${completionRate.toFixed(1)}%` },
        ].map((card) => (
          <div key={card.label} className="glass-card p-4 rounded-xl text-center">
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-slate-400 text-sm mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Quiz performance trend */}
      {quizStats.filter((q) => q.avgScorePct !== null).length > 1 && (
        <div className="glass-card p-5 rounded-xl">
          <h2 className="text-lg font-semibold mb-4">Quiz Difficulty Trend</h2>
          <div className="flex items-end gap-3 h-36">
            {quizStats.map((q, i) => {
              const pct = q.avgScorePct ?? 0;
              const color =
                q.difficulty === "Easy" ? "bg-green-500"
                : q.difficulty === "Medium" ? "bg-amber-500"
                : "bg-red-500";
              return (
                <div key={q.id} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <span className="text-xs text-slate-400">{pct.toFixed(0)}%</span>
                  <div className="w-full relative flex items-end" style={{ height: "96px" }}>
                    <div
                      className={`w-full rounded-t-md transition-all ${color}`}
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 text-center truncate w-full">{q.title}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-green-500 inline-block" />Easy (≥70%)</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-amber-500 inline-block" />Medium (40–69%)</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-red-500 inline-block" />Hard (&lt;40%)</span>
          </div>
        </div>
      )}

      {/* Quiz Performance table */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quiz Performance</h2>
        {classroomQuizzes.length === 0 ? (
          <div className="glass-card p-8 rounded-xl text-center text-slate-400">
            No quizzes in this classroom yet.
          </div>
        ) : (
          <div className="glass-card rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="text-left p-4">Quiz</th>
                  <th className="text-right p-4">Enrolled</th>
                  <th className="text-right p-4">Attempted</th>
                  <th className="text-right p-4">Avg Score</th>
                  <th className="text-center p-4">Difficulty</th>
                  <th className="text-right p-4">Flagged</th>
                  <th className="text-center p-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {quizStats.map((q) => (
                  <tr
                    key={q.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4">
                      <p className="font-medium text-white">{q.title}</p>
                      <p className="text-slate-500 text-xs">{q.type} · {q.totalMarks} marks</p>
                    </td>
                    <td className="p-4 text-right text-slate-300">{totalStudents}</td>
                    <td className="p-4 text-right text-slate-300">{q.attempted}</td>
                    <td className="p-4 text-right">
                      {q.avgScore !== null ? q.avgScore.toFixed(1) : "—"}
                      {q.avgScorePct !== null && (
                        <span className="text-slate-500 text-xs ml-1">({q.avgScorePct.toFixed(0)}%)</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {q.difficulty ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          q.difficulty === "Easy"
                            ? "bg-green-500/15 text-green-400"
                            : q.difficulty === "Medium"
                            ? "bg-amber-500/15 text-amber-400"
                            : "bg-red-500/15 text-red-400"
                        }`}>
                          {q.difficulty}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {q.flaggedCount > 0 ? (
                        <span className="text-red-400">{q.flaggedCount}</span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <Link
                        href={`/teacher/classrooms/${id}/quizzes/${q.id}/analytics`}
                        className="text-violet-400 hover:text-violet-300 transition-colors text-xs font-medium"
                      >
                        View Analytics
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Rankings table */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Student Rankings</h2>
        {studentRows.length === 0 ? (
          <div className="glass-card p-8 rounded-xl text-center text-slate-400">
            No active students in this classroom.
          </div>
        ) : (
          <div className="glass-card rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="text-center p-4 w-12">Rank</th>
                  <th className="text-left p-4">Name</th>
                  <th className="text-right p-4">Quizzes Attempted</th>
                  <th className="text-right p-4">Avg Score</th>
                  <th className="text-right p-4">Total Score</th>
                  <th className="text-right p-4">Flagged</th>
                </tr>
              </thead>
              <tbody>
                {studentRankings.map((s, idx) => (
                  <tr
                    key={s.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4 text-center">
                      {idx === 0 && <span className="text-amber-400 font-bold">#1</span>}
                      {idx === 1 && <span className="text-slate-300 font-bold">#2</span>}
                      {idx === 2 && <span className="text-amber-700 font-bold">#3</span>}
                      {idx > 2 && <span className="text-slate-500">#{idx + 1}</span>}
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/teacher/classrooms/${id}/students/${s.id}`}
                        className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
                      >
                        {s.name}
                      </Link>
                      <p className="text-slate-500 text-xs">{s.email}</p>
                    </td>
                    <td className="p-4 text-right text-slate-300">{s.quizzesAttempted}</td>
                    <td className="p-4 text-right">
                      {s.avgScore !== null ? s.avgScore.toFixed(1) : "—"}
                    </td>
                    <td className="p-4 text-right text-slate-300">{s.totalScore}</td>
                    <td className="p-4 text-right">
                      {s.flaggedCount > 0 ? (
                        <span className="text-red-400">{s.flaggedCount}</span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
