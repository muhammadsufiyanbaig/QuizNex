import { requireAdmin } from "@/lib/admin/guard";
import { logAdminAction, getClientIp } from "@/lib/admin/audit";
import { db } from "@/lib/db";
import {
  users, classrooms, classroomStudents, quizAttempts,
  passkeys, notifications, adminAuditLog,
} from "@/lib/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

// ── GET: full user detail ──────────────────────────────────────────────────────
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  // Log access to individual user profiles (sensitive read)
  await logAdminAction({
    adminId:    session!.user.id,
    action:     "view_user",
    targetType: "user",
    targetId:   id,
    ip:         getClientIp(req),
  });

  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const [userPasskeys, userClassrooms, userAttempts, userNotifCount] = await Promise.all([
    db.select({ id: passkeys.id, name: passkeys.name, deviceType: passkeys.deviceType, lastUsedAt: passkeys.lastUsedAt, createdAt: passkeys.createdAt })
      .from(passkeys).where(eq(passkeys.userId, id)),

    user.role === "TEACHER"
      ? db.select({ id: classrooms.id, name: classrooms.name, isArchived: classrooms.isArchived, createdAt: classrooms.createdAt })
          .from(classrooms).where(eq(classrooms.teacherId, id)).orderBy(desc(classrooms.createdAt)).limit(20)
      : user.role === "STUDENT"
      ? db.select({ classroomId: classroomStudents.classroomId, status: classroomStudents.status, joinedAt: classroomStudents.joinedAt })
          .from(classroomStudents).where(eq(classroomStudents.studentId, id)).limit(20)
      : Promise.resolve([]),

    user.role === "STUDENT"
      ? db.select({ id: quizAttempts.id, quizId: quizAttempts.quizId, status: quizAttempts.status, totalScore: quizAttempts.totalScore, isFlagged: quizAttempts.isFlagged, startedAt: quizAttempts.startedAt })
          .from(quizAttempts).where(eq(quizAttempts.studentId, id)).orderBy(desc(quizAttempts.startedAt)).limit(20)
      : Promise.resolve([]),

    db.select({ c: count() }).from(notifications).where(eq(notifications.userId, id)).then(r => r[0].c),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { twoFactorSecret, passwordHash, ...safeUser } = user;

  return NextResponse.json({
    user: safeUser,
    passkeys: userPasskeys,
    activity: userClassrooms,
    attempts: userAttempts,
    notificationCount: userNotifCount,
  });
}

// ── PATCH: update user (role, status, force verify, reset 2FA) ────────────────
const patchSchema = z.object({
  status:        z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  // ADMIN is excluded — promotion to ADMIN must be done via DB/infra directly
  role:          z.enum(["STUDENT", "TEACHER", "ORGANIZATION"]).optional(),
  emailVerified: z.literal(true).optional(),
  reset2FA:      z.literal(true).optional(),
}).refine(d => Object.keys(d).length > 0, { message: "No fields to update" });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  // Admin cannot modify their own account — prevents privilege self-escalation
  if (id === session!.user.id) {
    return NextResponse.json({ error: "Cannot modify your own admin account" }, { status: 400 });
  }

  const [target] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, id)).limit(1);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body   = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { status, role, emailVerified, reset2FA } = parsed.data;

  // Block resetting 2FA on other ADMIN accounts — requires direct DB intervention
  if (reset2FA && target.role === "ADMIN") {
    return NextResponse.json({ error: "Cannot reset 2FA on ADMIN accounts via panel" }, { status: 403 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (status        !== undefined) updates.status           = status;
  if (role          !== undefined) updates.role             = role;
  if (emailVerified !== undefined) updates.emailVerified    = true;
  if (reset2FA      !== undefined) { updates.twoFactorEnabled = false; updates.twoFactorSecret = null; }

  await db.update(users).set(updates).where(eq(users.id, id));

  await logAdminAction({
    adminId:    session!.user.id,
    action:     "update_user",
    targetType: "user",
    targetId:   id,
    metadata:   parsed.data as Record<string, unknown>,
    ip:         getClientIp(req),
  });

  return NextResponse.json({ ok: true });
}

// ── DELETE: hard delete user ───────────────────────────────────────────────────
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  if (id === session!.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const [target] = await db.select({ id: users.id, email: users.email, role: users.role }).from(users).where(eq(users.id, id)).limit(1);

  // Block deleting other ADMIN accounts via the panel
  if (target?.role === "ADMIN") {
    return NextResponse.json({ error: "Cannot delete ADMIN accounts via admin panel" }, { status: 403 });
  }
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await logAdminAction({
    adminId:    session!.user.id,
    action:     "delete_user",
    targetType: "user",
    targetId:   id,
    metadata:   { email: target.email, role: target.role },
    ip:         getClientIp(req),
  });

  await db.delete(users).where(eq(users.id, id));

  return NextResponse.json({ ok: true });
}
