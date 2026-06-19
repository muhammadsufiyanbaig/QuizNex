import { auth } from "@/auth";
import { db } from "@/lib/db";
import { quizzes, classroomStudents, quizAttempts } from "@/lib/db/schema";
import { and, eq, count, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const startSchema = z.object({ quizId: z.string().uuid() });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user)              return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "STUDENT") return NextResponse.json({ error: "Forbidden" },    { status: 403 });

  const body   = await req.json();
  const parsed = startSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { quizId }  = parsed.data;
  const studentId   = session.user.id;

  // Load quiz
  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  if (quiz.status !== "ACTIVE") return NextResponse.json({ error: "This quiz is not currently active" }, { status: 409 });

  // Check active enrollment
  const [enrollment] = await db
    .select({ id: classroomStudents.id })
    .from(classroomStudents)
    .where(and(
      eq(classroomStudents.classroomId, quiz.classroomId),
      eq(classroomStudents.studentId, studentId),
      eq(classroomStudents.status, "ACTIVE")
    ))
    .limit(1);
  if (!enrollment) return NextResponse.json({ error: "You are not enrolled in this classroom" }, { status: 403 });

  // Return existing IN_PROGRESS attempt if one exists (handles page refresh)
  const [existing] = await db
    .select()
    .from(quizAttempts)
    .where(and(
      eq(quizAttempts.quizId, quizId),
      eq(quizAttempts.studentId, studentId),
      eq(quizAttempts.status, "IN_PROGRESS")
    ))
    .limit(1);
  if (existing) return NextResponse.json({ attemptId: existing.id, resumed: true });

  // Check completed attempt count against maxAttempts
  const [{ used }] = await db
    .select({ used: count(quizAttempts.id) })
    .from(quizAttempts)
    .where(and(
      eq(quizAttempts.quizId, quizId),
      eq(quizAttempts.studentId, studentId),
      inArray(quizAttempts.status, ["SUBMITTED", "AUTO_SUBMITTED", "FLAGGED"])
    ));
  if (Number(used) >= quiz.maxAttempts) {
    return NextResponse.json({ error: "Maximum attempts reached for this quiz" }, { status: 409 });
  }

  // Create new attempt
  const [attempt] = await db
    .insert(quizAttempts)
    .values({ quizId, studentId, status: "IN_PROGRESS" })
    .returning({ id: quizAttempts.id });

  return NextResponse.json({ attemptId: attempt.id, resumed: false }, { status: 201 });
}
