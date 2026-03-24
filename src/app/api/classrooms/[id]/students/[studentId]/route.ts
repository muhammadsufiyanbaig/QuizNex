import { auth } from "@/auth";
import { db } from "@/lib/db";
import { classrooms, classroomStudents } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, studentId } = await params;

  // Verify teacher owns the classroom
  const [classroom] = await db
    .select({ id: classrooms.id })
    .from(classrooms)
    .where(and(eq(classrooms.id, id), eq(classrooms.teacherId, session.user.id)))
    .limit(1);

  if (!classroom) return NextResponse.json({ error: "Classroom not found" }, { status: 404 });

  // Find the active enrollment
  const [enrollment] = await db
    .select({ id: classroomStudents.id })
    .from(classroomStudents)
    .where(
      and(
        eq(classroomStudents.classroomId, id),
        eq(classroomStudents.studentId, studentId),
        eq(classroomStudents.status, "ACTIVE")
      )
    )
    .limit(1);

  if (!enrollment) return NextResponse.json({ error: "Student not found in this classroom" }, { status: 404 });

  await db
    .update(classroomStudents)
    .set({ status: "REMOVED" })
    .where(eq(classroomStudents.id, enrollment.id));

  return NextResponse.json({ ok: true });
}
