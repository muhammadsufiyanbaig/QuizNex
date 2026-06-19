import { auth } from "@/auth";
import { db } from "@/lib/db";
import { classrooms, classroomStudents } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createNotification } from "@/lib/notifications";

const schema = z.object({
  joinKey: z.string().min(1).max(20).trim().toUpperCase(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "STUDENT") return NextResponse.json({ error: "Only students can join classrooms" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid join key" }, { status: 400 });

  const [classroom] = await db
    .select()
    .from(classrooms)
    .where(and(eq(classrooms.joinKey, parsed.data.joinKey), eq(classrooms.isArchived, false)))
    .limit(1);

  if (!classroom) return NextResponse.json({ error: "Classroom not found. Check the join key and try again." }, { status: 404 });

  // Already enrolled?
  const [existing] = await db
    .select()
    .from(classroomStudents)
    .where(
      and(
        eq(classroomStudents.classroomId, classroom.id),
        eq(classroomStudents.studentId, session.user.id)
      )
    )
    .limit(1);

  if (existing) {
    if (existing.status === "ACTIVE") {
      return NextResponse.json({ error: "You are already enrolled in this classroom." }, { status: 409 });
    }
    // Re-activate if removed
    await db
      .update(classroomStudents)
      .set({ status: "ACTIVE" })
      .where(eq(classroomStudents.id, existing.id));
    return NextResponse.json({ classroomId: classroom.id, name: classroom.name });
  }

  await db.insert(classroomStudents).values({
    classroomId: classroom.id,
    studentId:   session.user.id,
    status:      "ACTIVE",
  });

  // Notify teacher
  try {
    await createNotification({
      userId: classroom.teacherId,
      type:   "STUDENT_JOINED",
      title:  `New student joined ${classroom.name}`,
      body:   `${session.user.name ?? "A student"} just joined your classroom "${classroom.name}".`,
      link:   `/teacher/classrooms/${classroom.id}`,
    });
  } catch { /* non-fatal */ }

  return NextResponse.json({ classroomId: classroom.id, name: classroom.name }, { status: 201 });
}
