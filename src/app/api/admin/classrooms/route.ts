import { requireAdmin } from "@/lib/admin/guard";
import { db } from "@/lib/db";
import { classrooms, users, classroomStudents, quizzes } from "@/lib/db/schema";
import { count, ilike, eq, and, desc, or } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url      = new URL(req.url);
  const page     = Math.max(1, Number(url.searchParams.get("page")  ?? 1));
  const limit    = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));
  const search   = url.searchParams.get("search")?.trim() ?? "";
  const archived = url.searchParams.get("archived");

  const filters = [];
  if (search) filters.push(ilike(classrooms.name, `%${search}%`));
  if (archived === "true")  filters.push(eq(classrooms.isArchived, true));
  if (archived === "false") filters.push(eq(classrooms.isArchived, false));

  const where = filters.length > 0 ? and(...filters) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.select({
      id:          classrooms.id,
      name:        classrooms.name,
      subject:     classrooms.subject,
      isArchived:  classrooms.isArchived,
      joinKey:     classrooms.joinKey,
      teacherId:   classrooms.teacherId,
      teacherName: users.name,
      teacherEmail: users.email,
      createdAt:   classrooms.createdAt,
    })
    .from(classrooms)
    .innerJoin(users, eq(classrooms.teacherId, users.id))
    .where(where)
    .orderBy(desc(classrooms.createdAt))
    .limit(limit)
    .offset((page - 1) * limit),

    db.select({ total: count() }).from(classrooms).where(where),
  ]);

  return NextResponse.json({ classrooms: rows, total, page, limit, pages: Math.ceil(Number(total) / limit) });
}
