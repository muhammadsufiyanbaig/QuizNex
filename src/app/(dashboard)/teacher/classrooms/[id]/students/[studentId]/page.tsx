import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  classrooms,
  classroomStudents,
  quizzes,
  quizAttempts,
  answers,
  questions,
  options,
  proctoringEvents,
  users,
} from "@/lib/db/schema";
import { and, eq, inArray, desc } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "TEACHER") redirect("/login");

  const { id, studentId } = await params;

  // Verify teacher owns classroom
  const [classroom] = await db
    .select()
    .from(classrooms)
    .where(and(eq(classrooms.id, id), eq(classrooms.teacherId, session.user.id)))
    .limit(1);

  if (!classroom) notFound();

  // Load student info + enrollment
  const [enrollmentRow] = await db
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
      and(
        eq(classroomStudents.classroomId, id),
        eq(classroomStudents.studentId, studentId)
      )
    )
    .limit(1);

  if (!enrollmentRow) notFound();

  // Load all quizzes in classroom
  const classroomQuizzes = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.classroomId, id))
    .orderBy(quizzes.displayOrder);

  const quizIdList = classroomQuizzes.map((q) => q.id);

  // Load all completed attempts by this student
  let studentAttempts: (typeof quizAttempts.$inferSelect)[] = [];
  if (quizIdList.length > 0) {
    studentAttempts = await db
      .select()
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.studentId, studentId),
          inArray(quizAttempts.quizId, quizIdList),
          inArray(quizAttempts.status, ["SUBMITTED", "AUTO_SUBMITTED", "FLAGGED"])
        )
      )
      .orderBy(desc(quizAttempts.submittedAt));
  }

  const attemptIds = studentAttempts.map((a) => a.id);

  // Load full answer details
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

  // Load questions for all quizzes
  let allQuestions: (typeof questions.$inferSelect)[] = [];
  if (quizIdList.length > 0) {
    allQuestions = await db
      .select()
      .from(questions)
      .where(inArray(questions.quizId, quizIdList))
      .orderBy(questions.order);
  }

  const questionIds = allQuestions.map((q) => q.id);
  let allOptions: (typeof options.$inferSelect)[] = [];
  if (questionIds.length > 0) {
    allOptions = await db
      .select()
      .from(options)
      .where(inArray(options.questionId, questionIds));
  }

  // Build lookup maps
  const questionsByQuiz = allQuestions.reduce<Record<string, typeof allQuestions>>(
    (acc, q) => { (acc[q.quizId] ??= []).push(q); return acc; },
    {}
  );
  const optionsByQuestion = allOptions.reduce<Record<string, typeof allOptions>>(
    (acc, o) => { (acc[o.questionId] ??= []).push(o); return acc; },
    {}
  );
  const answersByAttempt = allAnswers.reduce<Record<string, typeof allAnswers>>(
    (acc, a) => { (acc[a.attemptId] ??= []).push(a); return acc; },
    {}
  );
  const violationsByAttempt = allProctoringEvents.reduce<Record<string, number>>(
    (acc, e) => {
      if (e.type === "GAZE_AWAY") acc[e.attemptId] = (acc[e.attemptId] ?? 0) + 1;
      return acc;
    },
    {}
  );

  // For each quiz, get the most recent attempt
  const quizMap = Object.fromEntries(classroomQuizzes.map((q) => [q.id, q]));
  const attemptsByQuiz = studentAttempts.reduce<Record<string, typeof studentAttempts>>(
    (acc, a) => { (acc[a.quizId] ??= []).push(a); return acc; },
    {}
  );

  const quizRows = classroomQuizzes
    .map((quiz) => {
      const qAttempts = attemptsByQuiz[quiz.id] ?? [];
      if (qAttempts.length === 0) return null;
      const attempt = qAttempts[0]; // desc by submittedAt → latest first
      const violationCount = violationsByAttempt[attempt.id] ?? 0;
      const pct =
        attempt.totalScore !== null && quiz.totalMarks > 0
          ? (attempt.totalScore / quiz.totalMarks) * 100
          : null;

      // Build answer sheet
      const quizQuestions = questionsByQuiz[quiz.id] ?? [];
      const attemptAnswers = answersByAttempt[attempt.id] ?? [];
      const answerByQuestion = Object.fromEntries(
        attemptAnswers.map((a) => [a.questionId, a])
      );
      const answerSheet = quizQuestions.map((q) => {
        const ans = answerByQuestion[q.id];
        const qOptions = optionsByQuestion[q.id] ?? [];
        const selectedOption = ans?.selectedOptionId
          ? qOptions.find((o) => o.id === ans.selectedOptionId) ?? null
          : null;
        const correctOption = qOptions.find((o) => o.isCorrect) ?? null;
        const isCorrect =
          q.type === "MCQ" && selectedOption ? selectedOption.isCorrect : null;
        return { q, ans: ans ?? null, selectedOption, correctOption, isCorrect, qOptions };
      });

      return { quiz, attempt, violationCount, pct, answerSheet };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  // Summary stats
  const quizzesAttempted = quizRows.length;
  const scores = quizRows
    .map((r) => r.attempt.totalScore)
    .filter((s): s is number => s !== null);
  const avgScore =
    scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : null;
  const totalViolations = quizRows.reduce((sum, r) => sum + r.violationCount, 0);

  // Score-over-time data (chronological)
  const scoreTimeline = [...quizRows]
    .filter((r) => r.pct !== null)
    .sort(
      (a, b) =>
        (a.attempt.submittedAt?.getTime() ?? 0) - (b.attempt.submittedAt?.getTime() ?? 0)
    )
    .map((r) => ({ title: r.quiz.title, pct: r.pct!, date: r.attempt.submittedAt }));

  function fmtTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  }

  function fmtDate(date: Date | null) {
    if (!date) return "—";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function statusBadge(status: string) {
    if (status === "SUBMITTED")
      return "bg-green-500/20 text-green-400 border border-green-500/30";
    if (status === "AUTO_SUBMITTED")
      return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
    if (status === "FLAGGED")
      return "bg-red-500/20 text-red-400 border border-red-500/30";
    return "bg-slate-500/20 text-slate-400";
  }

  function scoreColor(pct: number) {
    if (pct >= 80) return "bg-green-500";
    if (pct >= 60) return "bg-emerald-500";
    if (pct >= 40) return "bg-amber-500";
    return "bg-red-500";
  }

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

      {/* Student info card */}
      <div className="glass-card p-6 rounded-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold gradient-text">{enrollmentRow.name}</h1>
            <p className="text-slate-400 mt-1">{enrollmentRow.email}</p>
            <p className="text-slate-500 text-sm mt-2">
              Joined {fmtDate(enrollmentRow.joinedAt)} ·{" "}
              <span
                className={
                  enrollmentRow.status === "ACTIVE" ? "text-green-400" : "text-red-400"
                }
              >
                {enrollmentRow.status}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-sm">{classroom.name}</p>
            {classroom.subject && (
              <p className="text-slate-500 text-xs">{classroom.subject}</p>
            )}
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Quizzes Attempted", value: quizzesAttempted },
          {
            label: "Avg Score",
            value: avgScore !== null ? `${avgScore.toFixed(1)}%` : "N/A",
          },
          { label: "Total Violations", value: totalViolations },
        ].map((card) => (
          <div key={card.label} className="glass-card p-4 rounded-xl text-center">
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-slate-400 text-sm mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {quizRows.length === 0 ? (
        <div className="glass-card p-10 rounded-xl text-center text-slate-400">
          This student has not attempted any quizzes yet.
        </div>
      ) : (
        <>
          {/* Score over time */}
          {scoreTimeline.length > 1 && (
            <div className="glass-card p-5 rounded-xl">
              <h2 className="text-lg font-semibold mb-4">Score Over Time</h2>
              <div className="flex items-end gap-3 h-32">
                {scoreTimeline.map((entry, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <span className="text-xs text-slate-400 font-medium">{entry.pct.toFixed(0)}%</span>
                    <div className="w-full relative flex items-end" style={{ height: "80px" }}>
                      <div
                        className={`w-full rounded-t-md transition-all ${scoreColor(entry.pct)}`}
                        style={{ height: `${entry.pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 text-center truncate w-full">{entry.title}</span>
                    <span className="text-[10px] text-slate-600">{fmtDate(entry.date)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-green-500 inline-block" />≥80%</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-amber-500 inline-block" />40–79%</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-red-500 inline-block" />&lt;40%</span>
              </div>
            </div>
          )}

          {/* Answer sheet per quiz */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Answer Sheets</h2>
            <div className="space-y-6">
              {quizRows.map(({ quiz, attempt, violationCount, pct, answerSheet }) => (
                <div key={attempt.id} className="glass-card rounded-xl overflow-hidden">
                  {/* Quiz header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                    <div>
                      <p className="font-semibold text-white">{quiz.title}</p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {fmtDate(attempt.submittedAt)} · {fmtTime(attempt.timerElapsedSecs)} · {violationCount} violation{violationCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {pct !== null && (
                        <span className={`text-sm font-bold ${pct >= 50 ? "text-green-400" : "text-red-400"}`}>
                          {attempt.totalScore} / {quiz.totalMarks} ({pct.toFixed(1)}%)
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(attempt.status)}`}>
                        {attempt.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {/* Questions */}
                  <div className="divide-y divide-white/5">
                    {answerSheet.length === 0 ? (
                      <p className="text-slate-500 text-sm p-5">No questions found for this quiz.</p>
                    ) : (
                      answerSheet.map(({ q, ans, selectedOption, correctOption, isCorrect, qOptions }, qi) => (
                        <div key={q.id} className="p-5">
                          <div className="flex items-start gap-3">
                            {/* Correctness indicator */}
                            <div className="shrink-0 mt-0.5">
                              {q.type === "MCQ" ? (
                                isCorrect === true ? (
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20 text-green-400 text-xs">✓</span>
                                ) : isCorrect === false ? (
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 text-red-400 text-xs">✗</span>
                                ) : (
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-slate-500 text-xs">—</span>
                                )
                              ) : (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-slate-500 text-xs">?</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-slate-500">Q{qi + 1} · {q.type} · {q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
                                {ans && <span className="text-xs text-slate-600">{ans.timeTakenSecs}s</span>}
                              </div>
                              <p className="text-slate-200 text-sm mb-2">{q.text}</p>

                              {q.type === "MCQ" && (
                                <div className="space-y-1.5 mt-2">
                                  {qOptions.map((o) => {
                                    const isSelected = ans?.selectedOptionId === o.id;
                                    const base = "flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg";
                                    const style =
                                      isSelected && o.isCorrect
                                        ? `${base} bg-green-500/15 text-green-300 ring-1 ring-green-500/30`
                                        : isSelected && !o.isCorrect
                                        ? `${base} bg-red-500/15 text-red-300 ring-1 ring-red-500/30`
                                        : o.isCorrect
                                        ? `${base} bg-green-500/8 text-green-400/70 ring-1 ring-green-500/15`
                                        : `${base} bg-white/5 text-slate-400`;
                                    return (
                                      <div key={o.id} className={style}>
                                        <span className="shrink-0">
                                          {isSelected ? "●" : "○"}
                                        </span>
                                        <span>{o.text}</span>
                                        {o.isCorrect && !isSelected && (
                                          <span className="ml-auto text-green-500/70 text-[10px]">correct answer</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {!ans && <p className="text-slate-600 text-xs italic">Not answered</p>}
                                </div>
                              )}

                              {q.type === "QA" && (
                                <div className="mt-2">
                                  {ans?.textAnswer ? (
                                    <div className="bg-white/5 rounded-lg px-3 py-2 text-sm text-slate-300 border border-white/10">
                                      {ans.textAnswer}
                                    </div>
                                  ) : (
                                    <p className="text-slate-600 text-xs italic">Not answered</p>
                                  )}
                                  {q.modelAnswer && (
                                    <p className="text-xs text-slate-500 mt-1.5">
                                      Expected: <span className="text-green-400/80">{q.modelAnswer}</span>
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
