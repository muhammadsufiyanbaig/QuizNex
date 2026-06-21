import { requireAdmin } from "@/lib/admin/guard";
import { logAdminAction, getClientIp } from "@/lib/admin/audit";
import { db } from "@/lib/db";
import { classrooms, users, classroomStudents, quizzes } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  await logAdminAction({
    adminId:    session!.user.id,
    action:     "view_classroom",
    targetType: "classroom",
    targetId:   id,
    ip:         getClientIp(req),
  });

  const [classroom] = await db
    .select({ classroom: classrooms, teacher: { name: users.name, email: users.email, id: users.id } })
    .from(classrooms)
    .innerJoin(users, eq(classrooms.teacherId, users.id))
    .where(eq(classrooms.id, id))
    .limit(1);

  if (!classroom) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [students, quizList] = await Promise.all([
    db.select({
      id:       users.id,
      name:     users.name,
      email:    users.email,
      joinedAt: classroomStudents.joinedAt,
      status:   classroomStudents.status,
    })
    .from(classroomStudents)
    .innerJoin(users, eq(classroomStudents.studentId, users.id))
    .where(eq(classroomStudents.classroomId, id)),

    db.select()
    .from(quizzes)
    .where(eq(quizzes.classroomId, id))
    .orderBy(quizzes.displayOrder),
  ]);

  return NextResponse.json({ ...classroom, students, quizzes: quizList });
}

const patchSchema = z.object({
  isArchived: z.boolean().optional(),
  name:       z.string().min(1).max(255).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body   = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await db.update(classrooms).set({ ...parsed.data, updatedAt: new Date() }).where(eq(classrooms.id, id));

  await logAdminAction({ adminId: session!.user.id, action: "update_classroom", targetType: "classroom", targetId: id, metadata: parsed.data as Record<string, unknown>, ip: getClientIp(req) });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const [c] = await db.select({ name: classrooms.name }).from(classrooms).where(eq(classrooms.id, id)).limit(1);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAdminAction({ adminId: session!.user.id, action: "delete_classroom", targetType: "classroom", targetId: id, metadata: { name: c.name }, ip: getClientIp(req) });
  await db.delete(classrooms).where(eq(classrooms.id, id));

  return NextResponse.json({ ok: true });
}
