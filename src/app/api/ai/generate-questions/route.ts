export const maxDuration = 60;

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { quizzes, classrooms } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateQuestionsFromTopic } from "@/lib/ai/quiz-generator";

const bodySchema = z.object({
  quizId: z.string().uuid(),
  topic: z.string().min(2).max(500),
  quizType: z.enum(["MCQ", "QA", "MIXED"]),
  count: z.number().int().min(1).max(20),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { quizId, topic, quizType, count, difficulty, messages } = parsed.data;

  // Verify teacher owns the quiz
  const [row] = await db
    .select({ id: quizzes.id })
    .from(quizzes)
    .innerJoin(classrooms, eq(quizzes.classroomId, classrooms.id))
    .where(and(eq(quizzes.id, quizId), eq(classrooms.teacherId, session.user.id!)))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  try {
    const { questions, updatedMessages } = await generateQuestionsFromTopic({
      topic,
      quizType,
      count,
      difficulty,
      messages,
    });

    return NextResponse.json({ questions, messages: updatedMessages });
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const detail = raw.replace(/^AI generation failed:\s*/i, "").slice(0, 300);
    console.error("[ai generate-questions]", raw);
    return NextResponse.json({ error: detail || "AI generation failed. Please try again." }, { status: 503 });
  }
}
