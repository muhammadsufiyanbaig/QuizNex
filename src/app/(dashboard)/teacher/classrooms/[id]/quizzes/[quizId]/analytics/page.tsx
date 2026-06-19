import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  quizzes,
  classrooms,
  classroomStudents,
  quizAttempts,
  questions,
  options,
  answers,
  proctoringEvents,
  users,
} from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function QuizAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string; quizId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "TEACHER") redirect("/login");

  const { id, quizId } = await params;

  // Fetch quiz + verify ownership
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

  // Count enrolled (ACTIVE) students
  const enrolledRows = await db
    .select({ studentId: classroomStudents.studentId })
    .from(classroomStudents)
    .where(
      and(
        eq(classroomStudents.classroomId, classroom.id),
        eq(classroomStudents.status, "ACTIVE")
      )
    );
  const enrolled = enrolledRows.length;

  // Load all completed attempts
  const completedAttempts = await db
    .select()
    .from(quizAttempts)
    .where(
      and(
        eq(quizAttempts.quizId, quizId),
        inArray(quizAttempts.status, ["SUBMITTED", "AUTO_SUBMITTED", "FLAGGED"])
      )
    );

  const uniqueStudentIds = [...new Set(completedAttempts.map((a) => a.studentId))];
  const attempted = uniqueStudentIds.length;

  // Load questions + options
  const quizQuestions = await db
    .select()
    .from(questions)
    .where(eq(questions.quizId, quizId))
    .orderBy(questions.order);

  const questionIds = quizQuestions.map((q) => q.id);
  let allOptions: (typeof options.$inferSelect)[] = [];
  if (questionIds.length > 0) {
    allOptions = await db
      .select()
      .from(options)
      .where(inArray(options.questionId, questionIds));
  }

  const attemptIds = completedAttempts.map((a) => a.id);

  let allAnswers: (typeof answers.$inferSelect)[] = [];
  let allProctoringEvents: (typeof proctoringEvents.$inferSelect)[] = [];
  if (attemptIds.length > 0) {
    allAnswers = await db
      .select()
      .from(answers)
      .where(inArray(answers.attemptId, attemptIds));

    allProctoringEvents = await db
      .select()
      .from(proctoringEvents)
      .where(inArray(proctoringEvents.attemptId, attemptIds));
  }

  let studentInfoRows: { id: string; name: string; email: string }[] = [];
  if (uniqueStudentIds.length > 0) {
    studentInfoRows = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(inArray(users.id, uniqueStudentIds));
  }
  const studentInfoMap = Object.fromEntries(studentInfoRows.map((s) => [s.id, s]));

  // ── Aggregate stats ──────────────────────────────────────────────────────
  const scores = completedAttempts
    .map((a) => a.totalScore)
    .filter((s): s is number => s !== null);

  const avgScore =
    scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : null;

  // Median score
  const sortedScores = [...scores].sort((a, b) => a - b);
  const medianScore = sortedScores.length > 0
    ? sortedScores.length % 2 === 0
      ? (sortedScores[sortedScores.length / 2 - 1]! + sortedScores[sortedScores.length / 2]!) / 2
      : sortedScores[Math.floor(sortedScores.length / 2)]!
    : null;

  const maxScore = scores.length > 0 ? Math.max(...scores) : null;
  const minScore = scores.length > 0 ? Math.min(...scores) : null;

  // Pass/fail: pass threshold = 50% of totalMarks
  const passThreshold = quiz.totalMarks * 0.5;
  const passCount  = scores.filter((s) => s >= passThreshold).length;
  const failCount  = scores.filter((s) => s < passThreshold).length;
  const passPct    = scores.length > 0 ? Math.round((passCount / scores.length) * 100) : null;

  const times = completedAttempts.map((a) => a.timerElapsedSecs);
  const avgTimeSecs =
    times.length > 0 ? times.reduce((sum, t) => sum + t, 0) / times.length : null;
  const flaggedCount = completedAttempts.filter((a) => a.isFlagged).length;

  const attemptRate = enrolled > 0 ? (attempted / enrolled) * 100 : 0;

  // Score distribution buckets
  const buckets = [
    { label: "0-20%", count: 0 },
    { label: "21-40%", count: 0 },
    { label: "41-60%", count: 0 },
    { label: "61-80%", count: 0 },
    { label: "81-100%", count: 0 },
  ];
  for (const a of completedAttempts) {
    if (a.totalScore === null) continue;
    const pct = quiz.totalMarks > 0 ? (a.totalScore / quiz.totalMarks) * 100 : 0;
    if (pct <= 20) buckets[0].count++;
    else if (pct <= 40) buckets[1].count++;
    else if (pct <= 60) buckets[2].count++;
    else if (pct <= 80) buckets[3].count++;
    else buckets[4].count++;
  }
  const bucketMax = Math.max(...buckets.map((b) => b.count), 1);

  // Per-question stats
  const optionsByQuestion = allOptions.reduce<Record<string, typeof allOptions>>(
    (acc, o) => { (acc[o.questionId] ??= []).push(o); return acc; },
    {}
  );
  const answersByQuestion = allAnswers.reduce<Record<string, typeof allAnswers>>(
    (acc, a) => { (acc[a.questionId] ??= []).push(a); return acc; },
    {}
  );

  const questionStats = quizQuestions.map((q) => {
    const qAnswers = answersByQuestion[q.id] ?? [];
    const totalAnswered = qAnswers.length;
    const avgTimeSecsQ =
      totalAnswered > 0
        ? qAnswers.reduce((sum, a) => sum + a.timeTakenSecs, 0) / totalAnswered
        : 0;

    if (q.type === "MCQ") {
      const correctCount = qAnswers.filter(
        (a) =>
          a.selectedOptionId &&
          allOptions.find((o) => o.id === a.selectedOptionId)?.isCorrect
      ).length;
      const correctPct = totalAnswered > 0 ? (correctCount / totalAnswered) * 100 : 0;
      const qOptions = optionsByQuestion[q.id] ?? [];
      const optDist = qOptions.map((o) => ({
        optionId: o.id,
        text: o.text,
        isCorrect: o.isCorrect,
        count: qAnswers.filter((a) => a.selectedOptionId === o.id).length,
      }));
      const optMax = Math.max(...optDist.map((o) => o.count), 1);
      return { ...q, totalAnswered, correctCount, correctPct, avgTimeSecsQ, optDist, optMax };
    }
    return { ...q, totalAnswered, correctCount: null, correctPct: null, avgTimeSecsQ, optDist: [], optMax: 1 };
  });

  // Slowest question (max avg time)
  const slowestQ = questionStats.reduce<typeof questionStats[0] | null>(
    (max, q) => (max === null || q.avgTimeSecsQ > max.avgTimeSecsQ ? q : max),
    null
  );
  const slowestQId = slowestQ && questionStats.length > 1 ? slowestQ.id : null;

  // Per-student rows
  const violationsByAttempt = allProctoringEvents.reduce<Record<string, number>>(
    (acc, e) => { if (e.type === "GAZE_AWAY") { acc[e.attemptId] = (acc[e.attemptId] ?? 0) + 1; } return acc; },
    {}
  );
  const attemptsByStudent = completedAttempts.reduce<Record<string, typeof completedAttempts>>(
    (acc, a) => { (acc[a.studentId] ??= []).push(a); return acc; },
    {}
  );

  // Per-student × question time heatmap (rows = students, cols = questions)
  const heatmapStudentIds = uniqueStudentIds.slice(0, 20); // cap at 20 for display
  const attemptByStudentLatest: Record<string, string> = {};
  for (const [studentId, attempts] of Object.entries(attemptsByStudent)) {
    const latest = attempts.sort((a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0))[0];
    if (latest) attemptByStudentLatest[studentId] = latest.id;
  }
  const heatmapData: { studentName: string; times: (number | null)[] }[] = heatmapStudentIds.map((sid) => {
    const attemptId = attemptByStudentLatest[sid];
    const studentAnswers = attemptId
      ? allAnswers.filter((a) => a.attemptId === attemptId)
      : [];
    const ansMap = Object.fromEntries(studentAnswers.map((a) => [a.questionId, a.timeTakenSecs]));
    return {
      studentName: studentInfoMap[sid]?.name ?? "Unknown",
      times: questionStats.map((q) => ansMap[q.id] ?? null),
    };
  });
  const maxHeatTime = Math.max(
    1,
    ...heatmapData.flatMap((r) => r.times.filter((t): t is number => t !== null))
  );

  const studentRows = uniqueStudentIds.map((studentId) => {
    const studentAttempts = attemptsByStudent[studentId] ?? [];
    const attempt = studentAttempts.sort(
      (a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0)
    )[0];
    const info = studentInfoMap[studentId];
    const violationCount = violationsByAttempt[attempt.id] ?? 0;
    const pct =
      attempt.totalScore !== null && quiz.totalMarks > 0
        ? (attempt.totalScore / quiz.totalMarks) * 100
        : null;
    return { studentId, name: info?.name ?? "Unknown", email: info?.email ?? "", attemptId: attempt.id, score: attempt.totalScore, pct, timeSecs: attempt.timerElapsedSecs, status: attempt.status, isFlagged: attempt.isFlagged, violationCount, submittedAt: attempt.submittedAt };
  });

  function fmtTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  }

  function statusColor(status: string) {
    if (status === "SUBMITTED") return "text-green-400";
    if (status === "AUTO_SUBMITTED") return "text-amber-400";
    if (status === "FLAGGED") return "text-red-400";
    return "text-slate-400";
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/teacher/classrooms/${id}/quizzes/${quizId}`}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-100 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Quiz
        </Link>
      </div>
      <div>
        <h1 className="text-3xl font-bold gradient-text">{quiz.title} — Analytics</h1>
        <p className="text-slate-400 mt-1">{classroom.name}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Enrolled",  value: enrolled },
          { label: "Attempted", value: attempted },
          { label: "Avg Score", value: avgScore !== null ? `${avgScore.toFixed(1)} / ${quiz.totalMarks}` : "N/A" },
          { label: "Avg Time",  value: avgTimeSecs !== null ? fmtTime(Math.round(avgTimeSecs)) : "N/A" },
        ].map((card) => (
          <div key={card.label} className="glass-card p-4 rounded-xl text-center">
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-slate-400 text-sm mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Extra stats: median, min/max, pass/fail */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Median Score", value: medianScore !== null ? `${medianScore.toFixed(1)}` : "N/A" },
          { label: "Highest Score", value: maxScore !== null ? `${maxScore} / ${quiz.totalMarks}` : "N/A" },
          { label: "Lowest Score",  value: minScore !== null ? `${minScore} / ${quiz.totalMarks}` : "N/A" },
          { label: "Flagged",       value: flaggedCount },
        ].map((card) => (
          <div key={card.label} className="glass-card p-4 rounded-xl text-center">
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-slate-400 text-sm mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Pass/Fail ratio */}
      {passPct !== null && (
        <div className="glass-card p-5 rounded-xl">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>Pass / Fail (≥50%)</span>
            <span className="text-green-400">{passCount} passed</span>
          </div>
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-l-full transition-all"
              style={{ width: `${passPct}%` }}
            />
            <div
              className="h-full bg-red-500/40 rounded-r-full transition-all"
              style={{ width: `${100 - passPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1.5">
            <span className="text-green-400">{passPct}% passed ({passCount})</span>
            <span className="text-red-400">{100 - passPct}% failed ({failCount})</span>
          </div>
        </div>
      )}

      {/* Attempt rate */}
      <div className="glass-card p-5 rounded-xl">
        <div className="flex justify-between text-sm text-slate-400 mb-2">
          <span>Attempt Rate</span>
          <span>{attempted}/{enrolled} ({attemptRate.toFixed(1)}%)</span>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all"
            style={{ width: `${attemptRate}%` }}
          />
        </div>
      </div>

      {attempted === 0 ? (
        <div className="glass-card p-10 rounded-xl text-center text-slate-400">
          No attempts yet for this quiz.
        </div>
      ) : (
        <>
          {/* Score Distribution */}
          <div className="glass-card p-5 rounded-xl">
            <h2 className="text-lg font-semibold mb-4">Score Distribution</h2>
            <div className="space-y-3">
              {buckets.map((b) => (
                <div key={b.label} className="flex items-center gap-3">
                  <span className="text-slate-400 text-sm w-16 shrink-0">{b.label}</span>
                  <div className="flex-1 h-6 bg-slate-800 rounded-md overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-md transition-all"
                      style={{ width: `${(b.count / bucketMax) * 100}%` }}
                    />
                  </div>
                  <span className="text-slate-300 text-sm w-6 text-right">{b.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Questions */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Questions</h2>
            <div className="space-y-4">
              {questionStats.map((q, idx) => (
                <div key={q.id} className={`glass-card p-5 rounded-xl ${q.id === slowestQId ? "ring-1 ring-amber-500/40" : ""}`}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-sm">Q{idx + 1} · {q.type} · {q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
                        {q.id === slowestQId && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-medium">Slowest</span>
                        )}
                      </div>
                      <p className="text-white mt-1">{q.text}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-slate-400 text-sm">Answered</p>
                      <p className="text-white font-semibold">{q.totalAnswered}</p>
                    </div>
                  </div>

                  {q.type === "MCQ" && q.correctCount !== null && (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">
                          {q.totalAnswered > 0 ? q.correctPct!.toFixed(1) : 0}% correct
                        </span>
                        <span className="text-slate-400 text-sm">Avg time: {fmtTime(Math.round(q.avgTimeSecsQ))}</span>
                      </div>
                      <div className="space-y-2">
                        {q.optDist.map((o) => (
                          <div key={o.optionId} className="flex items-center gap-2">
                            <span className={`text-xs shrink-0 w-4 ${o.isCorrect ? "text-green-400" : "text-slate-500"}`}>
                              {o.isCorrect ? "✓" : "·"}
                            </span>
                            <span className="text-slate-300 text-sm flex-1 truncate">{o.text}</span>
                            <div className="w-24 h-4 bg-slate-800 rounded overflow-hidden">
                              <div
                                className={`h-full rounded transition-all ${o.isCorrect ? "bg-green-500/60" : "bg-slate-600"}`}
                                style={{ width: `${(o.count / q.optMax) * 100}%` }}
                              />
                            </div>
                            <span className="text-slate-400 text-xs w-4 text-right">{o.count}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {q.type === "QA" && (
                    <div className="text-slate-400 text-sm">
                      Avg time: {fmtTime(Math.round(q.avgTimeSecsQ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Time Heatmap */}
          {heatmapData.length > 0 && questionStats.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-1">Time per Question (Heatmap)</h2>
              <p className="text-slate-400 text-sm mb-4">Seconds each student spent on each question. Darker = longer.</p>
              <div className="glass-card rounded-xl overflow-x-auto">
                <table className="text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400">
                      <th className="text-left px-4 py-3 sticky left-0 bg-slate-900/80 backdrop-blur z-10 min-w-[140px]">Student</th>
                      {questionStats.map((q, idx) => (
                        <th key={q.id} className="px-3 py-3 text-center font-medium">
                          Q{idx + 1}
                          {q.id === slowestQId && <span className="block text-amber-400 text-[10px]">slowest</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapData.map((row) => (
                      <tr key={row.studentName} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-2 text-slate-300 sticky left-0 bg-slate-900/80 backdrop-blur z-10 font-medium">{row.studentName}</td>
                        {row.times.map((t, i) => {
                          const intensity = t !== null ? Math.round((t / maxHeatTime) * 100) : 0;
                          const bg =
                            t === null
                              ? "bg-slate-800/40"
                              : intensity >= 80
                              ? "bg-red-500/70"
                              : intensity >= 60
                              ? "bg-orange-500/60"
                              : intensity >= 40
                              ? "bg-amber-500/50"
                              : intensity >= 20
                              ? "bg-yellow-500/40"
                              : "bg-green-500/30";
                          return (
                            <td key={i} className={`px-3 py-2 text-center ${bg} text-white`}>
                              {t !== null ? `${t}s` : "—"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Students table */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Student Results</h2>
            <div className="glass-card rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="text-left p-4">Name</th>
                    <th className="text-left p-4">Email</th>
                    <th className="text-right p-4">Score</th>
                    <th className="text-right p-4">%</th>
                    <th className="text-right p-4">Time</th>
                    <th className="text-center p-4">Status</th>
                    <th className="text-right p-4">Violations</th>
                  </tr>
                </thead>
                <tbody>
                  {studentRows.map((s) => (
                    <tr
                      key={s.studentId}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="p-4">
                        <Link
                          href={`/teacher/classrooms/${id}/students/${s.studentId}`}
                          className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
                        >
                          {s.name}
                        </Link>
                      </td>
                      <td className="p-4 text-slate-400">{s.email}</td>
                      <td className="p-4 text-right">
                        {s.score !== null ? `${s.score} / ${quiz.totalMarks}` : "—"}
                      </td>
                      <td className="p-4 text-right">
                        {s.pct !== null ? `${s.pct.toFixed(1)}%` : "—"}
                      </td>
                      <td className="p-4 text-right">{fmtTime(s.timeSecs)}</td>
                      <td className={`p-4 text-center font-medium ${statusColor(s.status)}`}>
                        {s.status.replace("_", " ")}
                      </td>
                      <td className="p-4 text-right">{s.violationCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
