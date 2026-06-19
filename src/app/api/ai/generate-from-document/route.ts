import { auth } from "@/auth";
import { db } from "@/lib/db";
import { quizzes, classrooms, aiDocuments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { uploadToS3 } from "@/lib/s3";
import { generateQuestionsFromDocument } from "@/lib/ai/quiz-generator";
import { randomUUID } from "crypto";

const ALLOWED_MIME_TYPES: Record<string, "PDF" | "DOCX" | "TXT" | "PPT"> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "text/plain": "TXT",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPT",
};

const MIME_TO_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
};

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file       = formData.get("file") as File | null;
  const quizId     = formData.get("quizId") as string | null;
  const quizType   = formData.get("quizType") as string | null;
  const countStr   = formData.get("count") as string | null;
  const difficulty = formData.get("difficulty") as string | null;

  if (!file || !quizId || !quizType || !countStr || !difficulty) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const fileType = ALLOWED_MIME_TYPES[file.type];
  if (!fileType) {
    return NextResponse.json(
      { error: "Invalid file type. Allowed: PDF, DOCX, TXT, PPT" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 20 MB" },
      { status: 400 }
    );
  }

  const count = parseInt(countStr, 10);
  if (isNaN(count) || count < 1 || count > 20) {
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

  const arrayBuffer = await file.arrayBuffer();
  const buffer      = Buffer.from(arrayBuffer);
  const base64      = buffer.toString("base64");

  // Upload to S3
  const ext   = MIME_TO_EXT[file.type] ?? "bin";
  const s3Key = `ai-documents/${session.user.id}/${randomUUID()}.${ext}`;
  let fileUrl: string;
  try {
    fileUrl = await uploadToS3(buffer, s3Key, file.type);
  } catch (err) {
    console.error("[s3 document upload]", err);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }

  // Save to aiDocuments table
  const [savedDoc] = await db
    .insert(aiDocuments)
    .values({
      teacherId: session.user.id!,
      fileName:  file.name,
      fileType,
      fileUrl,
      s3Key,
    })
    .returning();

  try {
    const { questions } = await generateQuestionsFromDocument({
      fileBase64: base64,
      mimeType:   file.type,
      fileName:   file.name,
      quizType:   quizType as "MCQ" | "QA" | "MIXED",
      count,
      difficulty: difficulty as "EASY" | "MEDIUM" | "HARD",
    });

    return NextResponse.json({ questions, documentId: savedDoc.id });
  } catch (err) {
    console.error("[ai generate-from-document]", err);
    return NextResponse.json(
      {
        error:   "AI generation is temporarily unavailable. Please try again later.",
        partial: [],
      },
      { status: 503 }
    );
  }
}
