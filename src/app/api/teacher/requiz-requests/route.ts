import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requizRequests, quizzes, classrooms, users } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TEACHER" && session.user.role !== "ORGANIZATION") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const quizId = req.nextUrl.searchParams.get("quizId");

  // Join requizRequests → quizzes → classrooms to verify teacher ownership
  const rows = await db
    .select({
      id:           requizRequests.id,
      attemptId:    requizRequests.attemptId,
      quizId:       requizRequests.quizId,
      classroomId:  requizRequests.classroomId,
      reason:       requizRequests.reason,
      status:       requizRequests.status,
      createdAt:    requizRequests.createdAt,
      reviewedAt:   requizRequests.reviewedAt,
      quizTitle:    quizzes.title,
      studentName:  users.name,
      studentEmail: users.email,
    })
    .from(requizRequests)
    .innerJoin(quizzes,    eq(requizRequests.quizId,      quizzes.id))
    .innerJoin(classrooms, eq(requizRequests.classroomId, classrooms.id))
    .innerJoin(users,      eq(requizRequests.studentId,   users.id))
    .where(
      and(
        eq(classrooms.teacherId, session.user.id),
        ...(quizId ? [eq(requizRequests.quizId, quizId)] : []),
      )
    )
    .orderBy(desc(requizRequests.createdAt))
    .limit(100);

  return NextResponse.json({ requests: rows });
}
