import { auth } from "@/auth";
import { db } from "@/lib/db";
import { quizAttempts, quizzes, classrooms } from "@/lib/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ClipboardList, Clock, CheckCircle2, AlertTriangle,
  XCircle, Trophy, ArrowRight, BookOpen,
} from "lucide-react";

export default async function QuizHistoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;

  const attempts = await db
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
      flagReason:       quizAttempts.flagReason,
      submittedAt:      quizAttempts.submittedAt,
    })
    .from(quizAttempts)
    .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
    .innerJoin(classrooms, eq(quizzes.classroomId, classrooms.id))
    .where(and(
      eq(quizAttempts.studentId, userId),
      inArray(quizAttempts.status, ["SUBMITTED", "AUTO_SUBMITTED", "FLAGGED"]),
    ))
    .orderBy(desc(quizAttempts.submittedAt));

  // Group by classroom
  const byClassroom = attempts.reduce<
    Record<string, { classroomId: string; classroomName: string; items: typeof attempts }>
  >((acc, a) => {
    if (!acc[a.classroomId]) {
      acc[a.classroomId] = { classroomId: a.classroomId, classroomName: a.classroomName, items: [] };
    }
    acc[a.classroomId].items.push(a);
    return acc;
  }, {});

  const classroomGroups = Object.values(byClassroom);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Quiz History</h1>
          <p className="mt-1 text-sm text-slate-400">
            All your past quiz attempts — {attempts.length} total
          </p>
        </div>
        <ClipboardList className="h-8 w-8 text-slate-600" />
      </div>

      {attempts.length === 0 ? (
        <div className="glass-card rounded-2xl flex flex-col items-center gap-4 py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-500/10">
            <ClipboardList className="h-8 w-8 text-slate-500" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-white">No quiz history yet</p>
            <p className="mt-1 text-sm text-slate-400">Complete a quiz to see your results here.</p>
          </div>
          <Link
            href="/student/classrooms"
            className="btn-gradient rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20"
          >
            Browse Classrooms
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {classroomGroups.map((group) => (
            <div key={group.classroomId} className="space-y-3">
              {/* Classroom header */}
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-400" />
                <Link
                  href={`/student/classrooms/${group.classroomId}`}
                  className="text-sm font-semibold text-slate-300 hover:text-white transition-colors"
                >
                  {group.classroomName}
                </Link>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-500">
                  {group.items.length} attempt{group.items.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Attempts */}
              <div className="space-y-2">
                {group.items.map((a) => {
                  const pct = a.totalMarks > 0 && a.totalScore != null
                    ? Math.round((Number(a.totalScore) / a.totalMarks) * 100)
                    : null;
                  const timeMins = Math.floor(a.timerElapsedSecs / 60);
                  const timeSecs = a.timerElapsedSecs % 60;

                  const statusConfig = {
                    SUBMITTED:      { label: "Submitted",      color: "text-green-400 bg-green-500/10 border-green-500/20",  icon: <CheckCircle2 className="h-4 w-4 text-green-400" /> },
                    AUTO_SUBMITTED: { label: "Auto-Submitted",  color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: <Clock className="h-4 w-4 text-amber-400" /> },
                    FLAGGED:        { label: "Flagged",         color: "text-red-400 bg-red-500/10 border-red-500/20",        icon: <AlertTriangle className="h-4 w-4 text-red-400" /> },
                  } as const;

                  const s = statusConfig[a.status as keyof typeof statusConfig];

                  return (
                    <Link
                      key={a.attemptId}
                      href={`/student/classrooms/${a.classroomId}/quiz/${a.quizId}/result`}
                      className="glass-card flex items-center gap-4 rounded-xl px-4 py-3.5 hover:border-white/15 transition-all group"
                    >
                      {/* Status icon */}
                      <div className="shrink-0">{s.icon}</div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white group-hover:text-blue-300 transition-colors">
                          {a.quizTitle}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />{timeMins}m {timeSecs}s
                          </span>
                          {a.submittedAt && (
                            <>
                              <span>·</span>
                              <span>{new Date(a.submittedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>
                            </>
                          )}
                          {a.isFlagged && a.flagReason && (
                            <>
                              <span>·</span>
                              <span className="text-red-400/70 truncate max-w-[160px]">{a.flagReason}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Score */}
                      <div className="shrink-0 text-right">
                        {a.quizType === "QA" && a.totalScore == null ? (
                          <p className="text-xs font-medium text-amber-400">Pending grading</p>
                        ) : pct !== null ? (
                          <>
                            <p className="text-sm font-bold text-white">{Number(a.totalScore)}/{a.totalMarks}</p>
                            <p className="text-xs text-slate-500">{pct}%</p>
                          </>
                        ) : (
                          <p className="text-xs text-slate-600">—</p>
                        )}
                      </div>

                      {/* Status badge */}
                      <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${s.color}`}>
                        {s.label}
                      </span>

                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-600 group-hover:text-slate-400 transition-colors" />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
