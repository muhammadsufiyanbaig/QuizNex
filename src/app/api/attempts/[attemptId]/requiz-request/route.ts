import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { quizAttempts, quizzes, classrooms, requizRequests } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { createNotification } from "@/lib/notifications";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "STUDENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { attemptId } = await params;
  const body = await req.json().catch(() => ({}));
  const reason = (body.reason as string | undefined) ?? "Proctoring violation";

  // Load attempt and verify ownership
  const [attempt] = await db
    .select({
      id:        quizAttempts.id,
      quizId:    quizAttempts.quizId,
      studentId: quizAttempts.studentId,
      status:    quizAttempts.status,
    })
    .from(quizAttempts)
    .where(
      and(
        eq(quizAttempts.id, attemptId),
        eq(quizAttempts.studentId, session.user.id)
      )
    )
    .limit(1);

  if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  if (attempt.status !== "FLAGGED" && attempt.status !== "AUTO_SUBMITTED") {
    return NextResponse.json({ error: "Only flagged or auto-submitted attempts can request a re-quiz" }, { status: 400 });
  }

  // Check no existing PENDING request for this attempt
  const [existing] = await db
    .select({ id: requizRequests.id })
    .from(requizRequests)
    .where(
      and(
        eq(requizRequests.attemptId, attemptId),
        eq(requizRequests.status, "PENDING")
      )
    )
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: "A re-quiz request is already pending for this attempt" }, { status: 409 });
  }

  // Load quiz + classroom to get teacher id and classroom id
  const [quizRow] = await db
    .select({ classroomId: quizzes.classroomId, quizTitle: quizzes.title, teacherId: classrooms.teacherId })
    .from(quizzes)
    .innerJoin(classrooms, eq(quizzes.classroomId, classrooms.id))
    .where(eq(quizzes.id, attempt.quizId))
    .limit(1);

  if (!quizRow) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  // Create request
  const [request] = await db
    .insert(requizRequests)
    .values({
      attemptId,
      studentId:   session.user.id,
      quizId:      attempt.quizId,
      classroomId: quizRow.classroomId,
      reason:      reason.slice(0, 255),
      status:      "PENDING",
    })
    .returning({ id: requizRequests.id });

  // Notify teacher
  await createNotification({
    userId: quizRow.teacherId,
    type:   "REQUIZ_REQUESTED",
    title:  "Re-quiz Request",
    body:   `${session.user.name ?? "A student"} is requesting to retake "${quizRow.quizTitle}".`,
    link:   `/teacher/classrooms/${quizRow.classroomId}/quizzes/${attempt.quizId}/requiz-requests`,
    sendEmail: false,
  });

  return NextResponse.json({ requestId: request.id }, { status: 201 });
}
