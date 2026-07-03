import { auth } from "@/auth";
import { db } from "@/lib/db";
import { classroomStudents, quizzes, questions, options, quizAttempts, answers, proctoringEvents } from "@/lib/db/schema";
import { and, eq, inArray, desc, count } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Trophy,
  BarChart2,
  Shield,
  Eye,
} from "lucide-react";

export default async function QuizResultPage({
  params,
}: {
  params: Promise<{ id: string; quizId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id: classroomId, quizId } = await params;
  const studentId = session.user.id;

  // Verify enrollment
  const [enrollment] = await db
    .select({ id: classroomStudents.id })
    .from(classroomStudents)
    .where(and(
      eq(classroomStudents.classroomId, classroomId),
      eq(classroomStudents.studentId, studentId),
      eq(classroomStudents.status, "ACTIVE")
    ))
    .limit(1);
  if (!enrollment) notFound();

  // Load quiz
  const [quiz] = await db
    .select()
    .from(quizzes)
    .where(and(eq(quizzes.id, quizId), eq(quizzes.classroomId, classroomId)))
    .limit(1);
  if (!quiz) notFound();

  // Get most recent completed attempt
  const [attempt] = await db
    .select()
    .from(quizAttempts)
    .where(and(
      eq(quizAttempts.quizId, quizId),
      eq(quizAttempts.studentId, studentId),
      inArray(quizAttempts.status, ["SUBMITTED", "AUTO_SUBMITTED", "FLAGGED"])
    ))
    .orderBy(desc(quizAttempts.submittedAt))
    .limit(1);

  if (!attempt) redirect(`/student/classrooms/${classroomId}`);

  // Load questions with options (WITH isCorrect for result display)
  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.quizId, quizId))
    .orderBy(questions.order);

  const questionIds = questionRows.map((q) => q.id);
  let optionRows: (typeof options.$inferSelect)[] = [];
  if (questionIds.length > 0) {
    optionRows = await db.select().from(options).where(inArray(options.questionId, questionIds));
  }

  const optsByQ = optionRows.reduce<Record<string, typeof optionRows>>((acc, o) => {
    (acc[o.questionId] ??= []).push(o);
    return acc;
  }, {});

  // Load student's answers
  const studentAnswers = await db
    .select()
    .from(answers)
    .where(eq(answers.attemptId, attempt.id));

  const answerMap = Object.fromEntries(studentAnswers.map((a) => [a.questionId, a]));

  // Proctoring event counts
  const [{ fsExits }] = await db
    .select({ fsExits: count(proctoringEvents.id) })
    .from(proctoringEvents)
    .where(and(
      eq(proctoringEvents.attemptId, attempt.id),
      eq(proctoringEvents.type, "FULLSCREEN_EXIT")
    ));
  const [{ gazeEvents }] = await db
    .select({ gazeEvents: count(proctoringEvents.id) })
    .from(proctoringEvents)
    .where(and(
      eq(proctoringEvents.attemptId, attempt.id),
      eq(proctoringEvents.type, "GAZE_AWAY")
    ));

  // Derived values
  const timeMins = Math.floor(attempt.timerElapsedSecs / 60);
  const timeSecs = attempt.timerElapsedSecs % 60;
  const scoreNum  = attempt.totalScore ?? 0;
  // Compute actual total from questions — quiz.totalMarks can be stale if teacher edited question marks
  const actualTotalMarks   = questionRows.reduce((sum, q) => sum + q.marks, 0);
  const effectiveTotalMarks = actualTotalMarks > 0 ? actualTotalMarks : quiz.totalMarks;
  const pct = effectiveTotalMarks > 0 ? Math.round((scoreNum / effectiveTotalMarks) * 100) : 0;

  const STATUS_COLORS = {
    SUBMITTED:      "text-green-400 bg-green-500/10 border-green-500/25",
    AUTO_SUBMITTED: "text-amber-400 bg-amber-500/10 border-amber-500/25",
    FLAGGED:        "text-red-400 bg-red-500/10 border-red-500/25",
  } as const;

  const statusColor = STATUS_COLORS[attempt.status as keyof typeof STATUS_COLORS] ?? STATUS_COLORS.SUBMITTED;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/student/classrooms/${classroomId}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs text-slate-500">Back to classroom</p>
          <h1 className="text-xl font-bold text-white">{quiz.title}</h1>
        </div>
      </div>

      {/* Flagged warning */}
      {attempt.isFlagged && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
          <div>
            <p className="font-semibold text-red-300">Quiz Auto-Failed (Flagged)</p>
            <p className="mt-0.5 text-sm text-red-400/80">{attempt.flagReason}</p>
          </div>
        </div>
      )}

      {/* Score card */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10">
              <Trophy className="h-8 w-8 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Your Score</p>
              {quiz.type === "QA" ? (
                <p className="text-3xl font-bold text-white">Pending Grading</p>
              ) : (
                <>
                  <p className="text-3xl font-bold text-white">
                    {scoreNum} <span className="text-lg text-slate-400">/ {effectiveTotalMarks}</span>
                  </p>
                  <p className="text-sm text-slate-400">{pct}%</p>
                </>
              )}
            </div>
          </div>
          <div className="text-right space-y-1">
            <span className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${statusColor}`}>
              {attempt.status.replace("_", " ")}
            </span>
            <div className="flex items-center justify-end gap-1.5 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              {timeMins}m {timeSecs}s
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-5 grid grid-cols-4 gap-3 border-t border-white/8 pt-5">
          {[
            { icon: <BarChart2 className="h-4 w-4" />, label: "Total Marks", value: effectiveTotalMarks },
            { icon: <Clock className="h-4 w-4" />, label: "Time Used", value: `${timeMins}m ${timeSecs}s` },
            { icon: <Eye className="h-4 w-4" />, label: "Gaze Events", value: Number(gazeEvents) },
            { icon: <Shield className="h-4 w-4" />, label: "FS Exits", value: Number(fsExits) },
          ].map(({ icon, label, value }) => (
            <div key={label} className="rounded-xl bg-white/3 p-3 text-center">
              <div className="mb-1 flex justify-center text-slate-500">{icon}</div>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-0.5 font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Answer review */}
      {quiz.showResults && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Answer Review</h2>
          {questionRows.map((q, idx) => {
            const studentAns    = answerMap[q.id];
            const qOptions      = optsByQ[q.id] ?? [];
            const correctOption = qOptions.find((o) => o.isCorrect);
            const isCorrect     = q.type === "MCQ"
              ? studentAns?.selectedOptionId === correctOption?.id
              : null; // QA: can't auto-determine

            return (
              <div
                key={q.id}
                className={`glass-card rounded-xl p-4 border-l-4 ${
                  q.type === "MCQ"
                    ? isCorrect ? "border-l-green-500" : "border-l-red-500"
                    : "border-l-blue-500"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500">Q{idx + 1}</span>
                      <span className="text-xs text-slate-500">·</span>
                      <span className="text-xs text-slate-500">{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
                    </div>
                    <p className="text-sm text-slate-200">{q.text}</p>

                    {q.imageUrl && (
                      <Image
                        src={q.imageUrl}
                        alt="Question image"
                        width={200}
                        height={120}
                        className="mt-2 rounded-lg border border-white/10"
                        unoptimized
                      />
                    )}
                  </div>
                  {q.type === "MCQ" && (
                    <div className="shrink-0">
                      {isCorrect
                        ? <CheckCircle2 className="h-5 w-5 text-green-400" />
                        : <XCircle className="h-5 w-5 text-red-400" />
                      }
                    </div>
                  )}
                </div>

                {/* MCQ options */}
                {q.type === "MCQ" && (
                  <div className="mt-3 space-y-1.5">
                    {qOptions.map((opt) => {
                      const isSelected = studentAns?.selectedOptionId === opt.id;
                      const isCor      = opt.isCorrect;
                      return (
                        <div
                          key={opt.id}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                            isCor && isSelected ? "border border-green-500/30 bg-green-500/10 text-green-300"
                            : isCor             ? "border border-green-500/20 bg-green-500/8 text-green-400"
                            : isSelected        ? "border border-red-500/30 bg-red-500/10 text-red-300"
                            :                     "border border-white/8 bg-white/3 text-slate-400"
                          }`}
                        >
                          {isCor
                            ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" />
                            : isSelected
                            ? <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                            : <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-slate-600" />
                          }
                          {opt.text}
                          {isSelected && <span className="ml-auto text-slate-500">(your answer)</span>}
                        </div>
                      );
                    })}
                    {!studentAns?.selectedOptionId && (
                      <p className="text-xs text-slate-600 italic">Not answered</p>
                    )}
                  </div>
                )}

                {/* QA answer */}
                {q.type === "QA" && (
                  <div className="mt-3 space-y-2">
                    <div className="rounded-lg border border-white/8 bg-white/3 px-3 py-2">
                      <p className="text-xs text-slate-500 mb-1">Your answer</p>
                      <p className="text-sm text-slate-300">
                        {studentAns?.textAnswer || <span className="italic text-slate-600">Not answered</span>}
                      </p>
                    </div>
                    {q.modelAnswer && (
                      <div className="rounded-lg border border-blue-500/15 bg-blue-500/5 px-3 py-2">
                        <p className="text-xs text-blue-400 mb-1">Model answer</p>
                        <p className="text-sm text-slate-300">{q.modelAnswer}</p>
                      </div>
                    )}
                    <p className="text-xs text-slate-600 italic">
                      {studentAns?.marksAwarded !== null && studentAns?.marksAwarded !== undefined
                        ? `Marks awarded: ${studentAns.marksAwarded} / ${q.marks}`
                        : "Marks pending teacher review"}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!quiz.showResults && (
        <div className="glass-card rounded-2xl p-6 text-center">
          <Shield className="mx-auto mb-3 h-8 w-8 text-slate-600" />
          <p className="text-sm text-slate-500">Your teacher has hidden the detailed answers for this quiz.</p>
        </div>
      )}

      <Link
        href={`/student/classrooms/${classroomId}`}
        className="btn-gradient flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Classroom
      </Link>
    </div>
  );
}
