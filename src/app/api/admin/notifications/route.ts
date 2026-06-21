import { requireAdmin } from "@/lib/admin/guard";
import { logAdminAction, getClientIp } from "@/lib/admin/audit";
import { db } from "@/lib/db";
import { users, notifications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  title:    z.string().min(1).max(255),
  body:     z.string().min(1).max(2000),
  link:     z.string().max(500).optional(),
  // target: "all" | "student" | "teacher" | "organization" | specific userId
  target:   z.union([
    z.enum(["all", "STUDENT", "TEACHER", "ORGANIZATION"]),
    z.string().uuid(),
  ]),
});

export async function POST(req: Request) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const body   = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { title, body: msgBody, link, target } = parsed.data;

  let targetUsers: { id: string }[] = [];

  if (target === "all") {
    targetUsers = await db.select({ id: users.id }).from(users);
  } else if (["STUDENT", "TEACHER", "ORGANIZATION"].includes(target)) {
    targetUsers = await db.select({ id: users.id }).from(users)
      .where(eq(users.role, target as "STUDENT" | "TEACHER" | "ORGANIZATION"));
  } else {
    // specific user ID
    targetUsers = [{ id: target }];
  }

  if (targetUsers.length === 0) {
    return NextResponse.json({ error: "No target users found" }, { status: 400 });
  }

  // Batch insert
  const rows = targetUsers.map(u => ({
    userId: u.id,
    type:   "SYSTEM_ANNOUNCEMENT" as const,
    title,
    body:   msgBody,
    link:   link ?? null,
  }));

  // Insert in chunks of 500
  for (let i = 0; i < rows.length; i += 500) {
    await db.insert(notifications).values(rows.slice(i, i + 500));
  }

  await logAdminAction({
    adminId:  session!.user.id,
    action:   "send_notification",
    metadata: { target, recipientCount: targetUsers.length, title },
    ip:       getClientIp(req),
  });

  return NextResponse.json({ ok: true, sent: targetUsers.length });
}
