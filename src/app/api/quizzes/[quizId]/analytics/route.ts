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
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { quizId } = await params;

  // Load quiz + verify ownership via classrooms.teacherId
  const [row] = await db
    .select({ quiz: quizzes, classroom: classrooms })
    .from(quizzes)
    .innerJoin(classrooms, eq(quizzes.classroomId, classrooms.id))
    .where(
      and(eq(quizzes.id, quizId), eq(classrooms.teacherId, session.user.id))
    )
    .limit(1);

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

  // Unique students who attempted
  const uniqueStudentIds = [...new Set(completedAttempts.map((a) => a.studentId))];
  const attempted = uniqueStudentIds.length;

  // Load all questions
  const quizQuestions = await db
    .select()
    .from(questions)
    .where(eq(questions.quizId, quizId))
    .orderBy(questions.order);

  const questionIds = quizQuestions.map((q) => q.id);

  // Load options for all questions
  let allOptions: (typeof options.$inferSelect)[] = [];
  if (questionIds.length > 0) {
    allOptions = await db
      .select()
      .from(options)
      .where(inArray(options.questionId, questionIds));
  }

  const attemptIds = completedAttempts.map((a) => a.id);

  // Load all answers and proctoring events if there are attempts
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

  // Load student info
  let studentInfoRows: { id: string; name: string; email: string }[] = [];
  if (uniqueStudentIds.length > 0) {
    studentInfoRows = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(inArray(users.id, uniqueStudentIds));
  }
  const studentInfoMap = Object.fromEntries(studentInfoRows.map((s) => [s.id, s]));

  // ── Compute aggregate stats ──────────────────────────────────────────────

  const scores = completedAttempts
    .map((a) => a.totalScore)
    .filter((s): s is number => s !== null);

  const avgScore = scores.length > 0
    ? scores.reduce((sum, s) => sum + s, 0) / scores.length
    : null;
  const maxScore = scores.length > 0 ? Math.max(...scores) : null;
  const minScore = scores.length > 0 ? Math.min(...scores) : null;

  const times = completedAttempts.map((a) => a.timerElapsedSecs);
  const avgTimeSecs = times.length > 0
    ? times.reduce((sum, t) => sum + t, 0) / times.length
    : null;

  const flaggedCount = completedAttempts.filter((a) => a.isFlagged).length;

  // ── Score distribution ────────────────────────────────────────────────────
  const buckets = [
    { label: "0-20%", count: 0 },
    { label: "21-40%", count: 0 },
    { label: "41-60%", count: 0 },
    { label: "61-80%", count: 0 },
    { label: "81-100%", count: 0 },
  ];

  for (const a of completedAttempts) {
    if (a.totalScore === null) continue; // QA quizzes — skip
    const pct = quiz.totalMarks > 0 ? (a.totalScore / quiz.totalMarks) * 100 : 0;
    if (pct <= 20) buckets[0].count++;
    else if (pct <= 40) buckets[1].count++;
    else if (pct <= 60) buckets[2].count++;
    else if (pct <= 80) buckets[3].count++;
    else buckets[4].count++;
  }

  // ── Per-question stats ────────────────────────────────────────────────────
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

      const qOptions = optionsByQuestion[q.id] ?? [];
      const optionDistribution = qOptions.map((o) => ({
        optionId: o.id,
        text: o.text,
        isCorrect: o.isCorrect,
        count: qAnswers.filter((a) => a.selectedOptionId === o.id).length,
      }));

      return {
        id: q.id,
        text: q.text,
        type: q.type as "MCQ" | "QA",
        marks: q.marks,
        order: q.order,
        totalAnswered,
        correctCount,
        avgTimeSecs: avgTimeSecsQ,
        optionDistribution,
      };
    } else {
      return {
        id: q.id,
        text: q.text,
        type: q.type as "MCQ" | "QA",
        marks: q.marks,
        order: q.order,
        totalAnswered,
        correctCount: null,
        avgTimeSecs: avgTimeSecsQ,
        optionDistribution: [],
      };
    }
  });

  // ── Per-student attempt stats ─────────────────────────────────────────────
  // Per attempt: count GAZE_AWAY events as violations
  const violationsByAttempt = allProctoringEvents.reduce<Record<string, number>>(
    (acc, e) => {
      if (e.type === "GAZE_AWAY") {
        acc[e.attemptId] = (acc[e.attemptId] ?? 0) + 1;
      }
      return acc;
    },
    {}
  );

  // One row per student: take the most recent completed attempt
  const attemptsByStudent = completedAttempts.reduce<
    Record<string, typeof completedAttempts>
  >((acc, a) => {
    (acc[a.studentId] ??= []).push(a);
    return acc;
  }, {});

  const studentRows = uniqueStudentIds.map((studentId) => {
    const studentAttempts = attemptsByStudent[studentId] ?? [];
    // Most recent attempt
    const attempt = studentAttempts.sort(
      (a, b) =>
        (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0)
    )[0];

    const info = studentInfoMap[studentId];
    const violationCount = violationsByAttempt[attempt.id] ?? 0;
    const pct =
      attempt.totalScore !== null && quiz.totalMarks > 0
        ? (attempt.totalScore / quiz.totalMarks) * 100
        : null;

    return {
      studentId,
      name: info?.name ?? "Unknown",
      email: info?.email ?? "",
      attemptId: attempt.id,
      score: attempt.totalScore,
      totalMarks: quiz.totalMarks,
      pct,
      timeSecs: attempt.timerElapsedSecs,
      status: attempt.status,
      isFlagged: attempt.isFlagged,
      violationCount,
      submittedAt: attempt.submittedAt,
    };
  });

  return NextResponse.json({
    quiz: {
      id: quiz.id,
      title: quiz.title,
      type: quiz.type,
      totalMarks: quiz.totalMarks,
      timeLimitMins: quiz.timeLimitMins,
    },
    enrolled,
    attempted,
    avgScore,
    maxScore,
    minScore,
    avgTimeSecs,
    flaggedCount,
    scoreDistribution: buckets,
    questions: questionStats,
    students: studentRows,
  });
}
