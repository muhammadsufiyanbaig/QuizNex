import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requizRequests, quizzes, classrooms, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { createNotification } from "@/lib/notifications";

const schema = z.object({
  action: z.enum(["APPROVED", "DENIED"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TEACHER" && session.user.role !== "ORGANIZATION") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  const { action } = parsed.data;

  // Load request + verify teacher owns the classroom
  const [row] = await db
    .select({
      id:          requizRequests.id,
      status:      requizRequests.status,
      studentId:   requizRequests.studentId,
      quizId:      requizRequests.quizId,
      classroomId: requizRequests.classroomId,
      quizTitle:   quizzes.title,
      teacherId:   classrooms.teacherId,
      studentName: users.name,
    })
    .from(requizRequests)
    .innerJoin(quizzes,    eq(requizRequests.quizId,      quizzes.id))
    .innerJoin(classrooms, eq(requizRequests.classroomId, classrooms.id))
    .innerJoin(users,      eq(requizRequests.studentId,   users.id))
    .where(
      and(
        eq(requizRequests.id, id),
        eq(classrooms.teacherId, session.user.id)
      )
    )
    .limit(1);

  if (!row) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (row.status !== "PENDING") {
    return NextResponse.json({ error: "Request already reviewed" }, { status: 409 });
  }

  // Update status
  await db
    .update(requizRequests)
    .set({ status: action, reviewedAt: new Date(), updatedAt: new Date() })
    .where(eq(requizRequests.id, id));

  // Notify student
  if (action === "APPROVED") {
    await createNotification({
      userId: row.studentId,
      type:   "REQUIZ_APPROVED",
      title:  "Re-quiz Approved!",
      body:   `Your teacher approved your re-quiz request for "${row.quizTitle}". You can now retake it.`,
      link:   `/student/classrooms/${row.classroomId}`,
      sendEmail: false,
    });
  }

  return NextResponse.json({ ok: true });
}
