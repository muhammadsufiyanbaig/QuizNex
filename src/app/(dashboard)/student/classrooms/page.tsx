import { auth } from "@/auth";
import { db } from "@/lib/db";
import { classroomStudents, classrooms, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import JoinClassroomForm from "./join-classroom-form";
import { BookOpen, ArrowRight, Users } from "lucide-react";

export default async function StudentClassroomsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const enrollments = await db
    .select({
      classroomId:  classroomStudents.classroomId,
      joinedAt:     classroomStudents.joinedAt,
      name:         classrooms.name,
      subject:      classrooms.subject,
      description:  classrooms.description,
      isArchived:   classrooms.isArchived,
      teacherName:  users.name,
    })
    .from(classroomStudents)
    .innerJoin(classrooms, eq(classroomStudents.classroomId, classrooms.id))
    .innerJoin(users, eq(classrooms.teacherId, users.id))
    .where(
      and(
        eq(classroomStudents.studentId, session.user.id),
        eq(classroomStudents.status, "ACTIVE")
      )
    )
    .orderBy(classroomStudents.joinedAt);

  const active   = enrollments.filter((e) => !e.isArchived);
  const archived = enrollments.filter((e) => e.isArchived);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">My Classrooms</h1>
        <p className="mt-1 text-sm text-slate-400">Classrooms you are enrolled in.</p>
      </div>

      {/* Join form */}
      <JoinClassroomForm />

      {/* Active */}
      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Enrolled ({active.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {active.map((e) => (
              <Link
                key={e.classroomId}
                href={`/student/classrooms/${e.classroomId}`}
                className="glass-card group rounded-2xl p-5 transition-all hover:border-white/15"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                    <BookOpen className="h-5 w-5 text-blue-400" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                </div>
                <h3 className="font-semibold text-white">{e.name}</h3>
                {e.subject && <p className="mt-0.5 text-xs text-slate-500">{e.subject}</p>}
                {e.description && (
                  <p className="mt-1.5 text-xs text-slate-400 line-clamp-2">{e.description}</p>
                )}
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                  <Users className="h-3.5 w-3.5" />
                  {e.teacherName}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {enrollments.length === 0 && (
        <div className="glass-card rounded-2xl flex flex-col items-center gap-4 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-500/10">
            <BookOpen className="h-8 w-8 text-slate-500" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-white">No classrooms yet</p>
            <p className="mt-1 text-sm text-slate-400">Use the join form above to enroll in a classroom.</p>
          </div>
        </div>
      )}

      {archived.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Archived ({archived.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {archived.map((e) => (
              <div
                key={e.classroomId}
                className="glass-card rounded-2xl p-5 opacity-60"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10">
                  <BookOpen className="h-5 w-5 text-slate-500" />
                </div>
                <h3 className="font-semibold text-white">{e.name}</h3>
                {e.subject && <p className="mt-0.5 text-xs text-slate-500">{e.subject}</p>}
                <p className="mt-3 text-xs text-slate-600">Archived</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
