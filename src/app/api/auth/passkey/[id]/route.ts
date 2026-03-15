import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { passkeys } from "@/lib/db/schema";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const result = await db
    .delete(passkeys)
    .where(and(eq(passkeys.id, id), eq(passkeys.userId, session!.user.id)))
    .returning({ id: passkeys.id });

  if (!result.length) {
    return NextResponse.json({ error: "Passkey not found." }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
