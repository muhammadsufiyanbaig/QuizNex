import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  organizations,
  orgTeachers,
  classrooms,
  classroomStudents,
  users,
  quizAttempts,
  quizzes,
} from "@/lib/db/schema";
import { eq, and, inArray, count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Building2, GraduationCap } from "lucide-react";

export default async function OrgStudentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.userId, session.user.id))
    .limit(1);

  if (!org) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Students</h1>
        </div>
        <div className="glass-card rounded-2xl flex flex-col items-center gap-4 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-500/10">
            <Building2 className="h-8 w-8 text-slate-500" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-white">Organization not set up</p>
            <p className="mt-1 text-sm text-slate-400">
              Complete your organization profile first.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Get ACTIVE teacher IDs
  const activeOrgTeachers = await db
    .select({ teacherId: orgTeachers.teacherId })
    .from(orgTeachers)
    .where(
      and(
        eq(orgTeachers.orgId, org.id),
        eq(orgTeachers.status, "ACTIVE")
      )
    );

  const teacherIds = activeOrgTeachers.map((t) => t.teacherId);

  let classroomRows: { id: string; name: string; teacherId: string }[] = [];
  if (teacherIds.length > 0) {
    classroomRows = await db
      .select({ id: classrooms.id, name: classrooms.name, teacherId: classrooms.teacherId })
      .from(classrooms)
      .where(inArray(classrooms.teacherId, teacherIds));
  }

  const classroomIds = classroomRows.map((c) => c.id);
  const classroomNameMap: Record<string, string> = {};
  for (const c of classroomRows) classroomNameMap[c.id] = c.name;

  // Load all ACTIVE enrollments
  type EnrollmentRow = {
    studentId: string;
    classroomId: string;
    joinedAt: Date;
    studentName: string;
    studentEmail: string;
  };

  let enrollmentRows: EnrollmentRow[] = [];
  if (classroomIds.length > 0) {
    enrollmentRows = await db
      .select({
        studentId: classroomStudents.studentId,
        classroomId: classroomStudents.classroomId,
        joinedAt: classroomStudents.joinedAt,
        studentName: users.name,
        studentEmail: users.email,
      })
      .from(classroomStudents)
      .innerJoin(users, eq(classroomStudents.studentId, users.id))
      .where(
        and(
          inArray(classroomStudents.classroomId, classroomIds),
          eq(classroomStudents.status, "ACTIVE")
        )
      );
  }

  // Deduplicate students
  const studentMap = new Map<
    string,
    {
      id: string;
      name: string;
      email: string;
      classroomIds: Set<string>;
      earliestJoin: Date;
    }
  >();

  for (const row of enrollmentRows) {
    const existing = studentMap.get(row.studentId);
    if (!existing) {
      studentMap.set(row.studentId, {
        id: row.studentId,
        name: row.studentName,
        email: row.studentEmail,
        classroomIds: new Set([row.classroomId]),
        earliestJoin: row.joinedAt,
      });
    } else {
      existing.classroomIds.add(row.classroomId);
      if (row.joinedAt < existing.earliestJoin) {
        existing.earliestJoin = row.joinedAt;
      }
    }
  }

  // Get quiz attempt counts per student (within org classrooms)
  const studentIds = Array.from(studentMap.keys());

  const attemptCountMap: Record<string, number> = {};
  if (studentIds.length > 0 && classroomIds.length > 0) {
    // Load quiz IDs for these classrooms
    const quizRows = await db
      .select({ id: quizzes.id })
      .from(quizzes)
      .where(inArray(quizzes.classroomId, classroomIds));

    const quizIds = quizRows.map((q) => q.id);
    if (quizIds.length > 0) {
      for (const studentId of studentIds) {
        const [row] = await db
          .select({ cnt: count() })
          .from(quizAttempts)
          .where(
            and(
              eq(quizAttempts.studentId, studentId),
              inArray(quizAttempts.quizId, quizIds)
            )
          );
        attemptCountMap[studentId] = Number(row?.cnt ?? 0);
      }
    }
  }

  const uniqueStudents = Array.from(studentMap.values()).sort(
    (a, b) => a.name.localeCompare(b.name)
  );

  const totalEnrollments = enrollmentRows.length;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Students{" "}
          <span className="text-lg font-normal text-slate-400">({uniqueStudents.length})</span>
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          All students enrolled in classrooms managed by your organization&apos;s teachers.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 text-center">
          <p className="text-3xl font-bold text-white">{uniqueStudents.length}</p>
          <p className="mt-1 text-sm text-slate-400">Unique Students</p>
        </div>
        <div className="glass-card rounded-2xl p-5 text-center">
          <p className="text-3xl font-bold text-white">{classroomRows.length}</p>
          <p className="mt-1 text-sm text-slate-400">Total Classrooms</p>
        </div>
        <div className="glass-card rounded-2xl p-5 text-center">
          <p className="text-3xl font-bold text-white">{totalEnrollments}</p>
          <p className="mt-1 text-sm text-slate-400">Total Enrollments</p>
        </div>
      </div>

      {/* Students table */}
      {uniqueStudents.length === 0 ? (
        <div className="glass-card rounded-2xl flex flex-col items-center gap-4 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-500/10">
            <GraduationCap className="h-8 w-8 text-slate-500" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-white">No students yet</p>
            <p className="mt-1 text-sm text-slate-400">
              Students will appear here once they enroll in a teacher&apos;s classroom.
            </p>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="hidden grid-cols-[1fr_1fr_80px_120px_160px] gap-4 border-b border-white/8 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:grid">
            <span>Name</span>
            <span>Email</span>
            <span className="text-center">Classrooms</span>
            <span className="text-center">Attempts</span>
            <span>Joined</span>
          </div>
          <div className="divide-y divide-white/5">
            {uniqueStudents.map((s) => (
              <div
                key={s.id}
                className="grid grid-cols-1 gap-2 px-6 py-4 sm:grid-cols-[1fr_1fr_80px_120px_160px] sm:items-center sm:gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-blue-700/20 text-xs font-semibold text-blue-300 ring-1 ring-white/10">
                    {s.name[0]?.toUpperCase()}
                  </div>
                  <p className="text-sm font-medium text-white">{s.name}</p>
                </div>
                <p className="text-sm text-slate-400 truncate">{s.email}</p>
                <p className="text-center text-sm text-white">{s.classroomIds.size}</p>
                <p className="text-center text-sm text-white">{attemptCountMap[s.id] ?? 0}</p>
                <p className="text-xs text-slate-500">
                  {new Date(s.earliestJoin).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
