import { auth } from "@/auth";
import { db } from "@/lib/db";
import { quizzes, classrooms, aiDocuments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary";
import { generateQuestionsFromDocument } from "@/lib/ai/quiz-generator";
import { Readable } from "stream";

const ALLOWED_MIME_TYPES: Record<string, "PDF" | "DOCX" | "TXT" | "PPT"> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "text/plain": "TXT",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPT",
};

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

function uploadToCloudinary(
  buffer: Buffer,
  options: { resource_type: "raw"; folder: string; public_id?: string }
): Promise<{ secure_url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
        } else {
          resolve({ secure_url: result.secure_url, public_id: result.public_id });
        }
      }
    );
    const readable = Readable.from(buffer);
    readable.pipe(uploadStream);
  });
}

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

  const file = formData.get("file") as File | null;
  const quizId = formData.get("quizId") as string | null;
  const quizType = formData.get("quizType") as string | null;
  const countStr = formData.get("count") as string | null;
  const difficulty = formData.get("difficulty") as string | null;

  if (!file || !quizId || !quizType || !countStr || !difficulty) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Validate file type
  const fileType = ALLOWED_MIME_TYPES[file.type];
  if (!fileType) {
    return NextResponse.json(
      { error: "Invalid file type. Allowed: PDF, DOCX, TXT, PPT" },
      { status: 400 }
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 20MB" },
      { status: 400 }
    );
  }

  // Validate other fields
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

  // Convert file to buffer and base64
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString("base64");

  // Upload to Cloudinary
  let cloudinaryUrl: string;
  let publicId: string;
  try {
    const uploadResult = await uploadToCloudinary(buffer, {
      resource_type: "raw",
      folder: "quiznex/ai-documents",
    });
    cloudinaryUrl = uploadResult.secure_url;
    publicId = uploadResult.public_id;
    // publicId is stored but not used further in this request
    void publicId;
  } catch {
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }

  // Save to aiDocuments table
  const [savedDoc] = await db
    .insert(aiDocuments)
    .values({
      teacherId: session.user.id!,
      fileName: file.name,
      fileType,
      cloudinaryUrl,
    })
    .returning();

  // Map MIME type for AI
  const mimeType = file.type;

  try {
    const { questions } = await generateQuestionsFromDocument({
      fileBase64: base64,
      mimeType,
      fileName: file.name,
      quizType: quizType as "MCQ" | "QA" | "MIXED",
      count,
      difficulty: difficulty as "EASY" | "MEDIUM" | "HARD",
    });

    return NextResponse.json({ questions, documentId: savedDoc.id });
  } catch {
    return NextResponse.json(
      {
        error: "AI generation is temporarily unavailable. Please try again later.",
        partial: [],
      },
      { status: 503 }
    );
  }
}
