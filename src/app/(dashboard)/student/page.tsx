import { auth } from "@/auth";
import { db } from "@/lib/db";
import { classroomStudents, quizAttempts, classrooms, quizzes } from "@/lib/db/schema";
import { eq, and, count, desc, inArray, avg, isNotNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BookOpen, ClipboardList, GraduationCap, ArrowRight,
  TrendingUp, PlayCircle, Clock, CheckCircle2, AlertTriangle, Trophy,
} from "lucide-react";

export default async function StudentDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;

  // ── Stats ──────────────────────────────────────────────────────────────────
  const [enrollmentCount] = await db
    .select({ count: count() })
    .from(classroomStudents)
    .where(and(eq(classroomStudents.studentId, userId), eq(classroomStudents.status, "ACTIVE")));

  const [attemptCount] = await db
    .select({ count: count() })
    .from(quizAttempts)
    .where(and(
      eq(quizAttempts.studentId, userId),
      inArray(quizAttempts.status, ["SUBMITTED", "AUTO_SUBMITTED", "FLAGGED"])
    ));

  const [avgRow] = await db
    .select({ avg: avg(quizAttempts.totalScore) })
    .from(quizAttempts)
    .where(and(
      eq(quizAttempts.studentId, userId),
      inArray(quizAttempts.status, ["SUBMITTED", "AUTO_SUBMITTED", "FLAGGED"]),
      isNotNull(quizAttempts.totalScore),
    ));
  const avgScore = avgRow?.avg != null ? Math.round(Number(avgRow.avg) * 10) / 10 : null;

  // ── Active quizzes across all enrolled classrooms ─────────────────────────
  const activeQuizzes = await db
    .select({
      quizId:        quizzes.id,
      title:         quizzes.title,
      timeLimitMins: quizzes.timeLimitMins,
      totalMarks:    quizzes.totalMarks,
      classroomId:   classrooms.id,
      classroomName: classrooms.name,
    })
    .from(classroomStudents)
    .innerJoin(classrooms, eq(classroomStudents.classroomId, classrooms.id))
    .innerJoin(quizzes, eq(quizzes.classroomId, classrooms.id))
    .where(and(
      eq(classroomStudents.studentId, userId),
      eq(classroomStudents.status, "ACTIVE"),
      eq(quizzes.status, "ACTIVE"),
    ))
    .limit(5);

  // ── Recent quiz results ───────────────────────────────────────────────────
  const recentResults = await db
    .select({
      attemptId:        quizAttempts.id,
      quizId:           quizAttempts.quizId,
      quizTitle:        quizzes.title,
      quizType:         quizzes.type,
      classroomId:      classrooms.id,
      classroomName:    classrooms.name,
      totalScore:       quizAttempts.totalScore,
      totalMarks:       quizzes.totalMarks,
      timerElapsedSecs: quizAttempts.timerElapsedSecs,
      status:           quizAttempts.status,
      isFlagged:        quizAttempts.isFlagged,
      submittedAt:      quizAttempts.submittedAt,
    })
    .from(quizAttempts)
    .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
    .innerJoin(classrooms, eq(quizzes.classroomId, classrooms.id))
    .where(and(
      eq(quizAttempts.studentId, userId),
      inArray(quizAttempts.status, ["SUBMITTED", "AUTO_SUBMITTED", "FLAGGED"]),
    ))
    .orderBy(desc(quizAttempts.submittedAt))
    .limit(5);

  const firstName = session.user.name?.split(" ")[0] ?? "Student";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Welcome back, {firstName}!</h1>
        <p className="mt-1 text-sm text-slate-400">Here&apos;s what&apos;s happening with your learning.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 ring-1 ring-blue-500/25">
            <BookOpen className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{Number(enrollmentCount?.count ?? 0)}</p>
            <p className="text-xs text-slate-400">Enrolled Classrooms</p>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 ring-1 ring-indigo-500/25">
            <ClipboardList className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{Number(attemptCount?.count ?? 0)}</p>
            <p className="text-xs text-slate-400">Quizzes Attempted</p>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-500/15 ring-1 ring-green-500/25">
            <TrendingUp className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">
              {avgScore !== null ? avgScore : "—"}
            </p>
            <p className="text-xs text-slate-400">Average Score</p>
          </div>
        </div>
      </div>

      {/* Active Quizzes */}
      {activeQuizzes.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-green-400" />
              <h2 className="font-semibold text-white">Active Quizzes</h2>
              <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-400">
                {activeQuizzes.length}
              </span>
            </div>
            <Link
              href="/student/classrooms"
              className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              All classrooms <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-2">
            {activeQuizzes.map((q) => (
              <Link
                key={q.quizId}
                href={`/student/classrooms/${q.classroomId}/quiz/${q.quizId}`}
                className="flex items-center justify-between rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 hover:bg-green-500/10 transition-colors group"
              >
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-green-300 transition-colors">
                    {q.title}
                  </p>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />{q.timeLimitMins} min
                    </span>
                    <span>·</span>
                    <span>{q.totalMarks} marks</span>
                    <span>·</span>
                    <span className="text-slate-400">{q.classroomName}</span>
                  </div>
                </div>
                <PlayCircle className="h-5 w-5 text-green-400 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Results */}
      <div className="glass-card rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-slate-400" />
            <h2 className="font-semibold text-white">Recent Results</h2>
          </div>
          {recentResults.length > 0 && (
            <Link
              href="/student/quiz-history"
              className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {recentResults.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-500/10">
              <GraduationCap className="h-7 w-7 text-slate-500" />
            </div>
            <p className="text-sm text-slate-400">No quiz results yet.</p>
            {activeQuizzes.length === 0 && (
              <Link
                href="/student/classrooms"
                className="btn-gradient rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20"
              >
                Browse Classrooms
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {recentResults.map((r) => {
              const pct = r.totalMarks > 0 && r.totalScore != null
                ? Math.round((Number(r.totalScore) / r.totalMarks) * 100)
                : null;
              const timeMins = Math.floor(r.timerElapsedSecs / 60);
              const timeSecs = r.timerElapsedSecs % 60;
              const statusColor =
                r.status === "FLAGGED"        ? "text-red-400 bg-red-500/10 border-red-500/20" :
                r.status === "AUTO_SUBMITTED"  ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
                                                 "text-green-400 bg-green-500/10 border-green-500/20";
              return (
                <Link
                  key={r.attemptId}
                  href={`/student/classrooms/${r.classroomId}/quiz/${r.quizId}/result`}
                  className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-4 py-3 hover:bg-white/5 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{r.quizTitle}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                      <span>{r.classroomName}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />{timeMins}m {timeSecs}s
                      </span>
                      {r.submittedAt && (
                        <>
                          <span>·</span>
                          <span>{new Date(r.submittedAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      {r.quizType === "QA" && r.totalScore == null ? (
                        <p className="text-xs font-medium text-amber-400">Pending</p>
                      ) : pct !== null ? (
                        <>
                          <p className="text-sm font-bold text-white">{Number(r.totalScore)}/{r.totalMarks}</p>
                          <p className="text-xs text-slate-500">{pct}%</p>
                        </>
                      ) : null}
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusColor}`}>
                      {r.status === "AUTO_SUBMITTED" ? "Auto" : r.status === "FLAGGED" ? "Flagged" : "Done"}
                    </span>
                    {r.isFlagged
                      ? <AlertTriangle className="h-4 w-4 text-red-400" />
                      : <CheckCircle2 className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                    }
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
