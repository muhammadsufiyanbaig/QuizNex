import { requireAdmin } from "@/lib/admin/guard";
import { db } from "@/lib/db";
import { quizAttempts, users, quizzes, classrooms, proctoringEvents } from "@/lib/db/schema";
import { count, eq, and, desc, gte } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url   = new URL(req.url);
  const page  = Math.max(1, Number(url.searchParams.get("page")  ?? 1));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));

  const [rows, [{ total }]] = await Promise.all([
    db.select({
      attemptId:    quizAttempts.id,
      studentName:  users.name,
      studentEmail: users.email,
      studentId:    users.id,
      quizTitle:    quizzes.title,
      quizId:       quizzes.id,
      classroomName: classrooms.name,
      classroomId:  classrooms.id,
      totalScore:   quizAttempts.totalScore,
      flagReason:   quizAttempts.flagReason,
      status:       quizAttempts.status,
      startedAt:    quizAttempts.startedAt,
      submittedAt:  quizAttempts.submittedAt,
    })
    .from(quizAttempts)
    .innerJoin(users,      eq(quizAttempts.studentId, users.id))
    .innerJoin(quizzes,    eq(quizAttempts.quizId, quizzes.id))
    .innerJoin(classrooms, eq(quizzes.classroomId, classrooms.id))
    .where(eq(quizAttempts.isFlagged, true))
    .orderBy(desc(quizAttempts.submittedAt))
    .limit(limit)
    .offset((page - 1) * limit),

    db.select({ total: count() }).from(quizAttempts).where(eq(quizAttempts.isFlagged, true)),
  ]);

  return NextResponse.json({ attempts: rows, total, page, limit, pages: Math.ceil(Number(total) / limit) });
}
