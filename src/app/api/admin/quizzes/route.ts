import { requireAdmin } from "@/lib/admin/guard";
import { db } from "@/lib/db";
import { quizzes, classrooms, users, quizAttempts } from "@/lib/db/schema";
import { count, ilike, eq, and, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url    = new URL(req.url);
  const page   = Math.max(1, Number(url.searchParams.get("page")  ?? 1));
  const limit  = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));
  const search = url.searchParams.get("search")?.trim() ?? "";
  const status = url.searchParams.get("status") ?? "";
  const type   = url.searchParams.get("type")   ?? "";

  const filters = [];
  if (search) filters.push(ilike(quizzes.title, `%${search}%`));
  if (status) filters.push(eq(quizzes.status, status as "DRAFT" | "PUBLISHED" | "ACTIVE" | "COMPLETED" | "ARCHIVED"));
  if (type)   filters.push(eq(quizzes.type,   type   as "MCQ"   | "QA"        | "MIXED"));

  const where = filters.length > 0 ? and(...filters) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.select({
      id:            quizzes.id,
      title:         quizzes.title,
      type:          quizzes.type,
      status:        quizzes.status,
      totalMarks:    quizzes.totalMarks,
      timeLimitMins: quizzes.timeLimitMins,
      classroomId:   quizzes.classroomId,
      classroomName: classrooms.name,
      teacherName:   users.name,
      teacherId:     users.id,
      createdAt:     quizzes.createdAt,
    })
    .from(quizzes)
    .innerJoin(classrooms, eq(quizzes.classroomId, classrooms.id))
    .innerJoin(users, eq(classrooms.teacherId, users.id))
    .where(where)
    .orderBy(desc(quizzes.createdAt))
    .limit(limit)
    .offset((page - 1) * limit),

    db.select({ total: count() }).from(quizzes).where(where),
  ]);

  return NextResponse.json({ quizzes: rows, total, page, limit, pages: Math.ceil(Number(total) / limit) });
}
