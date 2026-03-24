import { auth } from "@/auth";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  name:         z.string().min(1).max(255).trim().optional(),
  description:  z.string().max(2000).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  logoUrl:      z.string().url().max(500).optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ORGANIZATION") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.userId, session.user.id))
    .limit(1);

  return NextResponse.json(org ?? null);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ORGANIZATION") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.userId, session.user.id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const data = parsed.data;
  const [updated] = await db
    .update(organizations)
    .set({
      ...(data.name         !== undefined && { name: data.name }),
      ...(data.description  !== undefined && { description: data.description }),
      ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail }),
      ...(data.logoUrl      !== undefined && { logoUrl: data.logoUrl }),
    })
    .where(eq(organizations.id, existing.id))
    .returning();

  return NextResponse.json(updated);
}
