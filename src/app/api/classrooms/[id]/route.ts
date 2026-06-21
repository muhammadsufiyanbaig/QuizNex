import { auth } from "@/auth";
import { db } from "@/lib/db";
import { classrooms, classroomStudents, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  name:        z.string().min(1).max(255).trim().optional(),
  description: z.string().max(1000).optional().nullable(),
  subject:     z.string().max(255).optional().nullable(),
  isArchived:  z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [classroom] = await db
    .select()
    .from(classrooms)
    .where(eq(classrooms.id, id))
    .limit(1);

  if (!classroom) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Organization accounts have no per-classroom access — use org analytics endpoints instead
  if (session.user.role === "ORGANIZATION") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Teachers can see their own; students can see classrooms they're enrolled in
  if (session.user.role === "TEACHER" && classroom.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (session.user.role === "STUDENT") {
    const [enrollment] = await db
      .select()
      .from(classroomStudents)
      .where(
        and(
          eq(classroomStudents.classroomId, id),
          eq(classroomStudents.studentId, session.user.id),
          eq(classroomStudents.status, "ACTIVE")
        )
      )
      .limit(1);
    if (!enrollment) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get students
  const studentRows = await db
    .select({
      id:       users.id,
      name:     users.name,
      email:    users.email,
      joinedAt: classroomStudents.joinedAt,
      status:   classroomStudents.status,
    })
    .from(classroomStudents)
    .innerJoin(users, eq(classroomStudents.studentId, users.id))
    .where(eq(classroomStudents.classroomId, id));

  return NextResponse.json({ classroom, students: studentRows });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const [classroom] = await db
    .select({ teacherId: classrooms.teacherId })
    .from(classrooms)
    .where(eq(classrooms.id, id))
    .limit(1);

  if (!classroom) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (classroom.teacherId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const [updated] = await db
    .update(classrooms)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(classrooms.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const [classroom] = await db
    .select({ teacherId: classrooms.teacherId })
    .from(classrooms)
    .where(eq(classrooms.id, id))
    .limit(1);

  if (!classroom) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (classroom.teacherId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.delete(classrooms).where(eq(classrooms.id, id));

  return NextResponse.json({ ok: true });
}
