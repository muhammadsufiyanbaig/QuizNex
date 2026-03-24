import { auth } from "@/auth";
import { db } from "@/lib/db";
import { classrooms } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJoinKey } from "@/lib/auth/utils";

const createSchema = z.object({
  name:        z.string().min(1).max(255).trim(),
  description: z.string().max(1000).optional(),
  subject:     z.string().max(255).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await db
    .select()
    .from(classrooms)
    .where(eq(classrooms.teacherId, session.user.id))
    .orderBy(classrooms.createdAt);

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const joinKey = generateJoinKey();

  const [classroom] = await db
    .insert(classrooms)
    .values({
      teacherId:   session.user.id,
      name:        parsed.data.name,
      description: parsed.data.description ?? null,
      subject:     parsed.data.subject ?? null,
      joinKey,
    })
    .returning();

  return NextResponse.json(classroom, { status: 201 });
}
