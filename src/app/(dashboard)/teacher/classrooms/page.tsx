import { auth } from "@/auth";
import { db } from "@/lib/db";
import { classrooms, classroomStudents } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, Plus, Users, Archive, ArrowRight } from "lucide-react";

export default async function TeacherClassroomsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const myClassrooms = await db
    .select({
      id:         classrooms.id,
      name:       classrooms.name,
      subject:    classrooms.subject,
      description: classrooms.description,
      joinKey:    classrooms.joinKey,
      isArchived: classrooms.isArchived,
      createdAt:  classrooms.createdAt,
    })
    .from(classrooms)
    .where(eq(classrooms.teacherId, session.user.id))
    .orderBy(classrooms.createdAt);

  // Get student counts per classroom
  const studentCounts = await Promise.all(
    myClassrooms.map(async (c) => {
      const [r] = await db
        .select({ count: count() })
        .from(classroomStudents)
        .where(eq(classroomStudents.classroomId, c.id));
      return { id: c.id, count: Number(r?.count ?? 0) };
    })
  );
  const countMap = Object.fromEntries(studentCounts.map((s) => [s.id, s.count]));

  const active   = myClassrooms.filter((c) => !c.isArchived);
  const archived = myClassrooms.filter((c) => c.isArchived);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Classrooms</h1>
          <p className="mt-1 text-sm text-slate-400">Create and manage your classrooms.</p>
        </div>
        <Link
          href="/teacher/classrooms/new"
          className="btn-gradient flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20"
        >
          <Plus className="h-4 w-4" /> New Classroom
        </Link>
      </div>

      {myClassrooms.length === 0 ? (
        <div className="glass-card rounded-2xl flex flex-col items-center gap-4 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-500/10">
            <BookOpen className="h-8 w-8 text-slate-500" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-white">No classrooms yet</p>
            <p className="mt-1 text-sm text-slate-400">Create your first classroom to get started.</p>
          </div>
          <Link
            href="/teacher/classrooms/new"
            className="btn-gradient rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20"
          >
            Create Classroom
          </Link>
        </div>
      ) : (
        <>
          {/* Active */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Active ({active.length})
            </h2>
            {active.length === 0 ? (
              <p className="text-sm text-slate-500">No active classrooms.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {active.map((c) => (
                  <Link
                    key={c.id}
                    href={`/teacher/classrooms/${c.id}`}
                    className="glass-card group rounded-2xl p-5 transition-all hover:border-white/15"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
                        <BookOpen className="h-5 w-5 text-indigo-400" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                    </div>
                    <h3 className="font-semibold text-white">{c.name}</h3>
                    {c.subject && <p className="mt-0.5 text-xs text-slate-500">{c.subject}</p>}
                    {c.description && (
                      <p className="mt-1.5 text-xs text-slate-400 line-clamp-2">{c.description}</p>
                    )}
                    <div className="mt-4 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Users className="h-3.5 w-3.5" />
                        {countMap[c.id] ?? 0} students
                      </span>
                      <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-mono text-slate-400 ring-1 ring-white/10">
                        {c.joinKey}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Archived */}
          {archived.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
                <Archive className="h-3.5 w-3.5" />
                Archived ({archived.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {archived.map((c) => (
                  <Link
                    key={c.id}
                    href={`/teacher/classrooms/${c.id}`}
                    className="glass-card rounded-2xl p-5 opacity-60 transition-all hover:opacity-80"
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10">
                      <BookOpen className="h-5 w-5 text-slate-500" />
                    </div>
                    <h3 className="font-semibold text-white">{c.name}</h3>
                    {c.subject && <p className="mt-0.5 text-xs text-slate-500">{c.subject}</p>}
                    <div className="mt-4 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Users className="h-3.5 w-3.5" />
                        {countMap[c.id] ?? 0} students
                      </span>
                      <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-mono text-slate-400">
                        {c.joinKey}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
