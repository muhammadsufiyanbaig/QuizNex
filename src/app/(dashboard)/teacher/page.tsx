import { auth } from "@/auth";
import { db } from "@/lib/db";
import { classrooms, quizzes, classroomStudents } from "@/lib/db/schema";
import { eq, count, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BookOpen, FileQuestion, Users, ArrowRight, Plus,
  PlayCircle, Clock, CheckCircle2, Calendar,
} from "lucide-react";

export default async function TeacherDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;

  // All classrooms (for counts)
  const allClassrooms = await db
    .select({ id: classrooms.id })
    .from(classrooms)
    .where(eq(classrooms.teacherId, userId));

  const classroomIds = allClassrooms.map((c) => c.id);
  const classroomCount = allClassrooms.length;

  // Recent classrooms for display (last 5)
  const recentClassrooms = await db
    .select({
      id: classrooms.id,
      name: classrooms.name,
      subject: classrooms.subject,
      joinKey: classrooms.joinKey,
    })
    .from(classrooms)
    .where(eq(classrooms.teacherId, userId))
    .orderBy(desc(classrooms.createdAt))
    .limit(5);

  let quizCount = 0;
  let studentCount = 0;

  if (classroomIds.length > 0) {
    const results = await Promise.all(
      classroomIds.map((id) =>
        Promise.all([
          db.select({ count: count() }).from(quizzes).where(eq(quizzes.classroomId, id)),
          db.select({ count: count() }).from(classroomStudents).where(eq(classroomStudents.classroomId, id)),
        ])
      )
    );
    for (const [qr, sr] of results) {
      quizCount    += Number(qr[0]?.count ?? 0);
      studentCount += Number(sr[0]?.count ?? 0);
    }
  }

  // Quizzes by status (across all classrooms)
  type QuizRow = {
    id: string; title: string; type: string; status: string;
    timeLimitMins: number; totalMarks: number; scheduledAt: Date | null;
    classroomId: string; classroomName: string;
  };

  let activeQuizzes:    QuizRow[] = [];
  let upcomingQuizzes:  QuizRow[] = [];
  let completedQuizzes: QuizRow[] = [];

  if (classroomIds.length > 0) {
    const allQuizzes = await db
      .select({
        id: quizzes.id, title: quizzes.title, type: quizzes.type,
        status: quizzes.status, timeLimitMins: quizzes.timeLimitMins,
        totalMarks: quizzes.totalMarks, scheduledAt: quizzes.scheduledAt,
        classroomId: classrooms.id, classroomName: classrooms.name,
      })
      .from(quizzes)
      .innerJoin(classrooms, eq(quizzes.classroomId, classrooms.id))
      .where(eq(classrooms.teacherId, userId))
      .orderBy(desc(quizzes.createdAt));

    activeQuizzes    = allQuizzes.filter((q) => q.status === "ACTIVE").slice(0, 5);
    upcomingQuizzes  = allQuizzes.filter((q) => q.status === "PUBLISHED").slice(0, 5);
    completedQuizzes = allQuizzes.filter((q) => q.status === "COMPLETED").slice(0, 5);
  }

  const firstName = session.user.name?.split(" ")[0] ?? "Teacher";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Welcome back, {firstName}!</h1>
          <p className="mt-1 text-sm text-slate-400">Manage your classrooms and quizzes.</p>
        </div>
        <Link
          href="/teacher/classrooms/new"
          className="btn-gradient flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20"
        >
          <Plus className="h-4 w-4" /> New Classroom
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Classrooms",    value: classroomCount, icon: <BookOpen className="h-6 w-6 text-indigo-400" />,   color: "bg-indigo-500/15 ring-indigo-500/25" },
          { label: "Total Quizzes", value: quizCount,      icon: <FileQuestion className="h-6 w-6 text-blue-400" />, color: "bg-blue-500/15 ring-blue-500/25" },
          { label: "Total Students",value: studentCount,   icon: <Users className="h-6 w-6 text-violet-400" />,      color: "bg-violet-500/15 ring-violet-500/25" },
        ].map((s) => (
          <div key={s.label} className="glass-card rounded-2xl p-6 flex items-center gap-5">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ${s.color}`}>
              {s.icon}
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{s.value}</p>
              <p className="text-sm text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Active Quizzes */}
      {activeQuizzes.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <div className="mb-4 flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-green-400" />
            <h2 className="font-semibold text-white">Active Quizzes</h2>
            <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-400">
              {activeQuizzes.length}
            </span>
          </div>
          <div className="space-y-2">
            {activeQuizzes.map((q) => (
              <Link
                key={q.id}
                href={`/teacher/classrooms/${q.classroomId}/quizzes/${q.id}`}
                className="flex items-center justify-between rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 hover:bg-green-500/10 transition-colors group"
              >
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-green-300 transition-colors">{q.title}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                    <span>{q.classroomName}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{q.timeLimitMins} min</span>
                    <span>·</span>
                    <span>{q.totalMarks} marks</span>
                  </div>
                </div>
                <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-400 ring-1 ring-green-500/20">
                  Live
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Quizzes */}
      {upcomingQuizzes.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-400" />
            <h2 className="font-semibold text-white">Upcoming / Published</h2>
            <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-400">
              {upcomingQuizzes.length}
            </span>
          </div>
          <div className="space-y-2">
            {upcomingQuizzes.map((q) => (
              <Link
                key={q.id}
                href={`/teacher/classrooms/${q.classroomId}/quizzes/${q.id}`}
                className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-4 py-3 hover:bg-white/5 transition-colors group"
              >
                <div>
                  <p className="text-sm font-medium text-white">{q.title}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                    <span>{q.classroomName}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{q.timeLimitMins} min</span>
                    {q.scheduledAt && (
                      <>
                        <span>·</span>
                        <span>Scheduled: {new Date(q.scheduledAt).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400 ring-1 ring-blue-500/20">
                  Published
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Completed Quizzes */}
      {completedQuizzes.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-slate-400" />
              <h2 className="font-semibold text-white">Recently Completed</h2>
            </div>
          </div>
          <div className="space-y-2">
            {completedQuizzes.map((q) => (
              <Link
                key={q.id}
                href={`/teacher/classrooms/${q.classroomId}/quizzes/${q.id}/analytics`}
                className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-4 py-3 hover:bg-white/5 transition-colors group"
              >
                <div>
                  <p className="text-sm font-medium text-white">{q.title}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                    <span>{q.classroomName}</span>
                    <span>·</span>
                    <span>{q.totalMarks} marks</span>
                  </div>
                </div>
                <span className="rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-semibold text-slate-400 ring-1 ring-slate-500/20">
                  Completed
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent classrooms */}
      <div className="glass-card rounded-2xl p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-semibold text-white">Classrooms</h2>
          <Link
            href="/teacher/classrooms"
            className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentClassrooms.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-500/10">
              <BookOpen className="h-7 w-7 text-slate-500" />
            </div>
            <p className="text-sm text-slate-400">No classrooms yet. Create your first one!</p>
            <Link
              href="/teacher/classrooms/new"
              className="btn-gradient rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20"
            >
              Create Classroom
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentClassrooms.map((c) => (
              <Link
                key={c.id}
                href={`/teacher/classrooms/${c.id}`}
                className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-4 py-3.5 transition-all hover:border-white/15 hover:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10">
                    <BookOpen className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{c.name}</p>
                    {c.subject && <p className="text-xs text-slate-500">{c.subject}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-mono text-slate-400 ring-1 ring-white/10">
                    {c.joinKey}
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-600" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
