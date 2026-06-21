import { requireAdmin } from "@/lib/admin/guard";
import { db } from "@/lib/db";
import { users, classrooms, quizzes, quizAttempts, aiDocuments } from "@/lib/db/schema";
import { count, eq, gte, and, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const since7d  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000);
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    studentCount,
    teacherCount,
    orgCount,
    adminCount,
    activeToday,
    newLast7d,
    totalClassrooms,
    archivedClassrooms,
    totalQuizzes,
    activeQuizzes,
    completedQuizzes,
    totalAttempts,
    flaggedAttempts,
    aiDocsCount,
    aiDocsLast30d,
  ] = await Promise.all([
    db.select({ c: count() }).from(users).then(r => r[0].c),
    db.select({ c: count() }).from(users).where(eq(users.role, "STUDENT")).then(r => r[0].c),
    db.select({ c: count() }).from(users).where(eq(users.role, "TEACHER")).then(r => r[0].c),
    db.select({ c: count() }).from(users).where(eq(users.role, "ORGANIZATION")).then(r => r[0].c),
    db.select({ c: count() }).from(users).where(eq(users.role, "ADMIN")).then(r => r[0].c),
    db.select({ c: count() }).from(users).where(gte(users.lastLoginAt, since24h)).then(r => r[0].c),
    db.select({ c: count() }).from(users).where(gte(users.createdAt, since7d)).then(r => r[0].c),
    db.select({ c: count() }).from(classrooms).then(r => r[0].c),
    db.select({ c: count() }).from(classrooms).where(eq(classrooms.isArchived, true)).then(r => r[0].c),
    db.select({ c: count() }).from(quizzes).then(r => r[0].c),
    db.select({ c: count() }).from(quizzes).where(eq(quizzes.status, "ACTIVE")).then(r => r[0].c),
    db.select({ c: count() }).from(quizzes).where(eq(quizzes.status, "COMPLETED")).then(r => r[0].c),
    db.select({ c: count() }).from(quizAttempts).then(r => r[0].c),
    db.select({ c: count() }).from(quizAttempts).where(eq(quizAttempts.isFlagged, true)).then(r => r[0].c),
    db.select({ c: count() }).from(aiDocuments).then(r => r[0].c),
    db.select({ c: count() }).from(aiDocuments).where(gte(aiDocuments.uploadedAt, since30d)).then(r => r[0].c),
  ]);

  // Daily new users last 30 days
  const dailySignups = await db
    .select({
      date: sql<string>`DATE(${users.createdAt})`,
      count: count(),
    })
    .from(users)
    .where(gte(users.createdAt, since30d))
    .groupBy(sql`DATE(${users.createdAt})`)
    .orderBy(sql`DATE(${users.createdAt})`);

  // Daily attempts last 30 days
  const dailyAttempts = await db
    .select({
      date: sql<string>`DATE(${quizAttempts.startedAt})`,
      count: count(),
    })
    .from(quizAttempts)
    .where(gte(quizAttempts.startedAt, since30d))
    .groupBy(sql`DATE(${quizAttempts.startedAt})`)
    .orderBy(sql`DATE(${quizAttempts.startedAt})`);

  return NextResponse.json({
    users: {
      total: totalUsers,
      byRole: { student: studentCount, teacher: teacherCount, org: orgCount, admin: adminCount },
      activeToday,
      newLast7d,
    },
    classrooms: {
      total: totalClassrooms,
      active: Number(totalClassrooms) - Number(archivedClassrooms),
      archived: archivedClassrooms,
    },
    quizzes: {
      total: totalQuizzes,
      active: activeQuizzes,
      completed: completedQuizzes,
    },
    attempts: {
      total: totalAttempts,
      flagged: flaggedAttempts,
    },
    ai: {
      documentsTotal: aiDocsCount,
      documentsLast30d: aiDocsLast30d,
    },
    charts: {
      dailySignups,
      dailyAttempts,
    },
  });
}
