export const maxDuration = 60;

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { quizzes, classrooms, aiDocuments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getObjectBuffer, getS3Url } from "@/lib/s3";
import { generateQuestionsFromDocument } from "@/lib/ai/quiz-generator";

const ALLOWED_MIME_TYPES: Record<string, "PDF" | "DOCX" | "TXT" | "PPT"> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "text/plain": "TXT",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPT",
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    s3Key?: string;
    quizId?: string;
    quizType?: string;
    count?: number;
    difficulty?: string;
    fileName?: string;
    mimeType?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { s3Key, quizId, quizType, count, difficulty, fileName, mimeType } = body;

  if (!s3Key || !quizId || !quizType || !count || !difficulty || !fileName || !mimeType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const fileType = ALLOWED_MIME_TYPES[mimeType];
  if (!fileType) {
    return NextResponse.json(
      { error: "Invalid file type. Allowed: PDF, DOCX, TXT, PPT" },
      { status: 400 }
    );
  }

  if (!Number.isInteger(count) || count < 1 || count > 20) {
    return NextResponse.json({ error: "Count must be between 1 and 20" }, { status: 400 });
  }
  if (!["MCQ", "QA", "MIXED"].includes(quizType)) {
    return NextResponse.json({ error: "Invalid quiz type" }, { status: 400 });
  }
  if (!["EASY", "MEDIUM", "HARD"].includes(difficulty)) {
    return NextResponse.json({ error: "Invalid difficulty" }, { status: 400 });
  }

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

  // Download file from S3 (client already uploaded via presigned URL)
  let buffer: Buffer;
  try {
    buffer = await getObjectBuffer(s3Key);
  } catch (err) {
    console.error("[s3 document download]", err);
    return NextResponse.json({ error: "Failed to retrieve uploaded file" }, { status: 500 });
  }

  const base64 = buffer.toString("base64");
  const fileUrl = getS3Url(s3Key);

  // Save to aiDocuments table
  const [savedDoc] = await db
    .insert(aiDocuments)
    .values({
      teacherId: session.user.id!,
      fileName,
      fileType,
      fileUrl,
      s3Key,
    })
    .returning();

  try {
    const { questions } = await generateQuestionsFromDocument({
      fileBase64: base64,
      mimeType,
      fileName,
      quizType: quizType as "MCQ" | "QA" | "MIXED",
      count,
      difficulty: difficulty as "EASY" | "MEDIUM" | "HARD",
    });

    return NextResponse.json({ questions, documentId: savedDoc.id });
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const detail = raw.replace(/^AI generation failed:\s*/i, "").slice(0, 300);
    console.error("[ai generate-from-document]", raw);
    return NextResponse.json({ error: detail || "AI generation failed. Please try again." }, { status: 503 });
  }
}
