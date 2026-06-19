import { auth } from "@/auth";
import { db } from "@/lib/db";
import { classrooms, quizzes, questions } from "@/lib/db/schema";
import { and, eq, count } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  ArrowLeft,
  BookOpen,
  Clock,
  Users,
  BarChart2,
  CheckCircle2,
  Circle,
  PlayCircle,
  Archive,
  FileEdit,
  ClipboardCheck,
} from "lucide-react";

const STATUS_META: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: "Draft",     color: "text-slate-400 bg-slate-500/15 border-slate-500/30" },
  PUBLISHED: { label: "Published", color: "text-blue-400 bg-blue-500/15 border-blue-500/30" },
  ACTIVE:    { label: "Active",    color: "text-green-400 bg-green-500/15 border-green-500/30" },
  COMPLETED: { label: "Completed", color: "text-purple-400 bg-purple-500/15 border-purple-500/30" },
  ARCHIVED:  { label: "Archived",  color: "text-slate-500 bg-slate-600/15 border-slate-600/30" },
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  DRAFT:     <FileEdit className="h-3.5 w-3.5" />,
  PUBLISHED: <Circle className="h-3.5 w-3.5" />,
  ACTIVE:    <PlayCircle className="h-3.5 w-3.5" />,
  COMPLETED: <CheckCircle2 className="h-3.5 w-3.5" />,
  ARCHIVED:  <Archive className="h-3.5 w-3.5" />,
};

export default async function TeacherQuizzesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const [classroom] = await db
    .select()
    .from(classrooms)
    .where(and(eq(classrooms.id, id), eq(classrooms.teacherId, session.user.id)))
    .limit(1);

  if (!classroom) notFound();

  // Get quizzes with question count
  const rows = await db
    .select({
      quiz:          quizzes,
      questionCount: count(questions.id),
    })
    .from(quizzes)
    .leftJoin(questions, eq(questions.quizId, quizzes.id))
    .where(eq(quizzes.classroomId, id))
    .groupBy(quizzes.id)
    .orderBy(quizzes.displayOrder, quizzes.createdAt);

  // Group by status
  const groups: Record<string, typeof rows> = {
    ACTIVE:    [],
    PUBLISHED: [],
    DRAFT:     [],
    COMPLETED: [],
    ARCHIVED:  [],
  };
  for (const row of rows) {
    (groups[row.quiz.status] ??= []).push(row);
  }

  const orderedStatuses = ["ACTIVE", "PUBLISHED", "DRAFT", "COMPLETED", "ARCHIVED"];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/teacher/classrooms/${id}`}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-xs text-slate-500">{classroom.name}</p>
            <h1 className="text-xl font-bold text-white">Quizzes</h1>
          </div>
        </div>
        <Link
          href={`/teacher/classrooms/${id}/quizzes/new`}
          className="btn-gradient flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20"
        >
          <Plus className="h-4 w-4" />
          New Quiz
        </Link>
      </div>

      {rows.length === 0 && (
        <div className="glass-card rounded-2xl p-12 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 ring-1 ring-blue-500/20">
              <BookOpen className="h-7 w-7 text-blue-400" />
            </div>
          </div>
          <h3 className="mb-1 text-base font-semibold text-white">No quizzes yet</h3>
          <p className="mb-5 text-sm text-slate-500">Create your first quiz for this classroom.</p>
          <Link
            href={`/teacher/classrooms/${id}/quizzes/new`}
            className="btn-gradient inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Create Quiz
          </Link>
        </div>
      )}

      {orderedStatuses.map((status) => {
        const items = groups[status] ?? [];
        if (items.length === 0) return null;
        const meta = STATUS_META[status];
        return (
          <div key={status}>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
              {STATUS_ICON[status]}
              {meta.label}
              <span className="ml-1 rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-500">
                {items.length}
              </span>
            </h2>
            <div className="space-y-2">
              {items.map(({ quiz, questionCount }) => (
                <div key={quiz.id} className="space-y-1.5">
                <Link
                  href={`/teacher/classrooms/${id}/quizzes/${quiz.id}`}
                  className="glass-card group flex items-center gap-4 rounded-xl p-4 transition-all hover:border-white/15 hover:bg-white/5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                    <BookOpen className="h-5 w-5 text-blue-400" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-white group-hover:text-blue-300 transition-colors">
                        {quiz.title}
                      </span>
                      <span className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.color}`}>
                        {STATUS_ICON[status]}
                        {meta.label}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <BarChart2 className="h-3 w-3" />
                        {quiz.type}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {Number(questionCount)} question{Number(questionCount) !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {quiz.timeLimitMins} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {quiz.totalMarks} marks
                      </span>
                    </div>
                  </div>

                  <ArrowLeft className="h-4 w-4 shrink-0 rotate-180 text-slate-600 group-hover:text-slate-400 transition-colors" />
                </Link>
                {/* Quick-action links for active/completed quizzes */}
                {(status === "ACTIVE" || status === "COMPLETED") && (
                  <div className="flex gap-2 pl-1">
                    <Link
                      href={`/teacher/classrooms/${id}/quizzes/${quiz.id}/analytics`}
                      className="flex items-center gap-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/8 px-3 py-1.5 text-xs font-medium text-indigo-400 hover:bg-indigo-500/15 transition-colors"
                    >
                      <BarChart2 className="h-3.5 w-3.5" /> Analytics
                    </Link>
                    {(quiz.type === "QA" || quiz.type === "MIXED") && (
                      <Link
                        href={`/teacher/classrooms/${id}/quizzes/${quiz.id}/grade`}
                        className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/15 transition-colors"
                      >
                        <ClipboardCheck className="h-3.5 w-3.5" /> Grade
                      </Link>
                    )}
                  </div>
                )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
