import { auth } from "@/auth";
import { db } from "@/lib/db";
import { classrooms, classroomStudents, users, quizzes, quizAttempts } from "@/lib/db/schema";
import { eq, and, inArray, count, desc } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, FileQuestion, User, PlayCircle, Eye, Clock, CheckCircle2, Trophy } from "lucide-react";

export default async function StudentClassroomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const studentId = session.user.id;

  // Check enrollment
  const [enrollment] = await db
    .select()
    .from(classroomStudents)
    .where(
      and(
        eq(classroomStudents.classroomId, id),
        eq(classroomStudents.studentId, studentId),
        eq(classroomStudents.status, "ACTIVE")
      )
    )
    .limit(1);

  if (!enrollment) notFound();

  const [classroom] = await db
    .select()
    .from(classrooms)
    .where(eq(classrooms.id, id))
    .limit(1);

  if (!classroom) notFound();

  const [teacher] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, classroom.teacherId))
    .limit(1);

  const classroomQuizzes = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.classroomId, id))
    .orderBy(quizzes.createdAt);

  const visibleQuizzes = classroomQuizzes.filter(
    (q) => q.status === "PUBLISHED" || q.status === "ACTIVE" || q.status === "COMPLETED"
  );

  // For each visible quiz, check if student has a submitted attempt
  const visibleIds = visibleQuizzes.map((q) => q.id);
  const attemptCounts: Record<string, number> = {};
  if (visibleIds.length > 0) {
    const rows = await db
      .select({ quizId: quizAttempts.quizId, cnt: count(quizAttempts.id) })
      .from(quizAttempts)
      .where(
        and(
          inArray(quizAttempts.quizId, visibleIds),
          eq(quizAttempts.studentId, studentId),
          inArray(quizAttempts.status, ["SUBMITTED", "AUTO_SUBMITTED", "FLAGGED"])
        )
      )
      .groupBy(quizAttempts.quizId);
    for (const r of rows) attemptCounts[r.quizId] = Number(r.cnt);
  }

  // Load best score per quiz for display
  const bestScores: Record<string, { score: number | null; totalMarks: number }> = {};
  if (visibleIds.length > 0) {
    const scoreRows = await db
      .select({
        quizId:      quizAttempts.quizId,
        totalScore:  quizAttempts.totalScore,
        totalMarks:  quizzes.totalMarks,
        submittedAt: quizAttempts.submittedAt,
      })
      .from(quizAttempts)
      .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
      .where(and(
        inArray(quizAttempts.quizId, visibleIds),
        eq(quizAttempts.studentId, studentId),
        inArray(quizAttempts.status, ["SUBMITTED", "AUTO_SUBMITTED", "FLAGGED"])
      ))
      .orderBy(desc(quizAttempts.submittedAt));

    // Keep best (highest) score per quiz
    for (const r of scoreRows) {
      if (!bestScores[r.quizId]) {
        bestScores[r.quizId] = { score: r.totalScore != null ? Number(r.totalScore) : null, totalMarks: r.totalMarks };
      } else if (r.totalScore != null) {
        const cur = bestScores[r.quizId].score;
        if (cur === null || Number(r.totalScore) > cur) {
          bestScores[r.quizId].score = Number(r.totalScore);
        }
      }
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back */}
      <div className="flex items-center gap-3">
        <Link
          href="/student/classrooms"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <nav className="text-sm text-slate-500">
          <Link href="/student/classrooms" className="hover:text-slate-300 transition-colors">Classrooms</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-300">{classroom.name}</span>
        </nav>
      </div>

      {/* Header */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 ring-1 ring-blue-500/25">
            <BookOpen className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{classroom.name}</h1>
            {classroom.subject && <p className="mt-0.5 text-sm text-slate-400">{classroom.subject}</p>}
            {classroom.description && (
              <p className="mt-1.5 text-sm text-slate-500">{classroom.description}</p>
            )}
            {teacher && (
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <User className="h-3.5 w-3.5" />
                <span>{teacher.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quizzes */}
      <div className="glass-card rounded-2xl p-6">
        <div className="mb-4 flex items-center gap-2">
          <FileQuestion className="h-5 w-5 text-slate-400" />
          <h2 className="font-semibold text-white">Quizzes</h2>
        </div>

        {visibleQuizzes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <FileQuestion className="h-8 w-8 text-slate-600" />
            <p className="text-sm text-slate-500">No quizzes available yet.</p>
            <p className="text-xs text-slate-600">Your teacher will publish quizzes here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleQuizzes.map((q) => {
              const hasAttempt = (attemptCounts[q.id] ?? 0) > 0;
              const attemptsLeft = q.maxAttempts - (attemptCounts[q.id] ?? 0);
              const isActive = q.status === "ACTIVE";
              const isCompleted = q.status === "COMPLETED";
              const canStart = isActive && attemptsLeft > 0;
              const canViewResult = hasAttempt;

              const best = bestScores[q.id];
              const bestPct = best && best.score != null && best.totalMarks > 0
                ? Math.round((best.score / best.totalMarks) * 100)
                : null;

              const BestScoreLine = best && best.score != null ? (
                <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                  <Trophy className="h-3 w-3 text-amber-400" />
                  <span>Best: {best.score}/{best.totalMarks} pts{bestPct !== null ? ` (${bestPct}%)` : ""}</span>
                </div>
              ) : null;

              if (canStart) {
                return (
                  <Link
                    key={q.id}
                    href={`/student/classrooms/${id}/quiz/${q.id}`}
                    className="flex items-center justify-between rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3.5 hover:bg-green-500/10 transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-green-300 transition-colors">{q.title}</p>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{q.timeLimitMins} min</span>
                        <span>·</span>
                        <span>{q.totalMarks} marks</span>
                        <span>·</span>
                        <span>{attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} left</span>
                      </div>
                      {BestScoreLine}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400 ring-1 ring-green-500/20">
                        Active
                      </span>
                      <PlayCircle className="h-5 w-5 text-green-400" />
                    </div>
                  </Link>
                );
              }

              if (isActive && !canStart && canViewResult) {
                // Used all attempts while quiz still active
                return (
                  <Link
                    key={q.id}
                    href={`/student/classrooms/${id}/quiz/${q.id}/result`}
                    className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-4 py-3.5 hover:bg-white/5 transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{q.title}</p>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{q.timeLimitMins} min</span>
                        <span>·</span>
                        <span>{q.totalMarks} marks</span>
                      </div>
                      {BestScoreLine}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400 ring-1 ring-green-500/20">
                        Active
                      </span>
                      <Eye className="h-4 w-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
                    </div>
                  </Link>
                );
              }

              if (isCompleted && canViewResult) {
                return (
                  <Link
                    key={q.id}
                    href={`/student/classrooms/${id}/quiz/${q.id}/result`}
                    className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-4 py-3.5 hover:bg-white/5 transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{q.title}</p>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{q.timeLimitMins} min</span>
                        <span>·</span>
                        <span>{q.totalMarks} marks</span>
                      </div>
                      {BestScoreLine}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-slate-400 ring-1 ring-slate-500/20">
                        Completed
                      </span>
                      <Eye className="h-4 w-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
                    </div>
                  </Link>
                );
              }

              // PUBLISHED (not yet active) or completed without an attempt
              return (
                <div
                  key={q.id}
                  className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-4 py-3.5 opacity-70"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{q.title}</p>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{q.timeLimitMins} min</span>
                      <span>·</span>
                      <span>{q.totalMarks} marks</span>
                      {q.scheduledAt && (
                        <>
                          <span>·</span>
                          <span>Scheduled: {new Date(q.scheduledAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCompleted ? (
                      <span className="rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-slate-400 ring-1 ring-slate-500/20">
                        Completed
                      </span>
                    ) : (
                      <>
                        <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400 ring-1 ring-blue-500/20">
                          Upcoming
                        </span>
                        <CheckCircle2 className="h-4 w-4 text-slate-600" />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
