import { auth } from "@/auth";
import { getPresignedPutUrl, getS3Url } from "@/lib/s3";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
};

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { mimeType?: string; fileSize?: number; fileName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { mimeType, fileSize, fileName } = body;

  const ext = mimeType ? ALLOWED_MIME_TYPES[mimeType] : undefined;
  if (!ext) {
    return NextResponse.json(
      { error: "Invalid file type. Allowed: PDF, DOCX, TXT, PPT" },
      { status: 400 }
    );
  }

  if (!fileSize || fileSize > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 20 MB" },
      { status: 400 }
    );
  }

  const s3Key = `ai-documents/${session.user.id}/${randomUUID()}.${ext}`;
  const uploadUrl = await getPresignedPutUrl(s3Key, mimeType!, 300);
  const fileUrl = getS3Url(s3Key);

  return NextResponse.json({ uploadUrl, s3Key, fileUrl, fileName });
}
