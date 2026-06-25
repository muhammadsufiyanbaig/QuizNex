import { auth } from "@/auth";
import { db } from "@/lib/db";
import { classrooms, quizzes, requizRequests, users } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import RequizRequestsClient from "./requiz-requests-client";

export default async function RequizRequestsPage({
  params,
}: {
  params: Promise<{ id: string; quizId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id, quizId } = await params;

  // Verify teacher owns this quiz/classroom
  const [row] = await db
    .select({ quizTitle: quizzes.title })
    .from(quizzes)
    .innerJoin(classrooms, eq(quizzes.classroomId, classrooms.id))
    .where(
      and(
        eq(quizzes.id, quizId),
        eq(quizzes.classroomId, id),
        eq(classrooms.teacherId, session.user.id)
      )
    )
    .limit(1);

  if (!row) notFound();

  const requestRows = await db
    .select({
      id:           requizRequests.id,
      studentName:  users.name,
      studentEmail: users.email,
      reason:       requizRequests.reason,
      status:       requizRequests.status,
      createdAt:    requizRequests.createdAt,
    })
    .from(requizRequests)
    .innerJoin(users, eq(requizRequests.studentId, users.id))
    .where(eq(requizRequests.quizId, quizId))
    .orderBy(desc(requizRequests.createdAt));

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8 px-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href={`/teacher/classrooms/${id}/quizzes/${quizId}`}
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-blue-400" />
            <h1 className="text-xl font-bold text-white">Re-quiz Requests</h1>
          </div>
          <p className="mt-0.5 text-sm text-slate-400">{row.quizTitle}</p>
        </div>
      </div>

      <RequizRequestsClient
        initialRequests={requestRows.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        }))}
        quizId={quizId}
      />
    </div>
  );
}
