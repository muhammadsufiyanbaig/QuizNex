import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  organizations,
  orgTeachers,
  users,
  classrooms,
  classroomStudents,
} from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import TeachersClient from "./teachers-client";

export default async function OrgTeachersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.userId, session.user.id))
    .limit(1);

  if (!org) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Teacher Management</h1>
        </div>
        <div className="glass-card rounded-2xl flex flex-col items-center gap-4 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-500/10">
            <Building2 className="h-8 w-8 text-slate-500" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-white">Organization not set up</p>
            <p className="mt-1 text-sm text-slate-400">
              Complete your organization profile to manage teachers.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Load all orgTeachers with user info
  const teacherRows = await db
    .select({
      orgTeacherId: orgTeachers.id,
      teacherId: users.id,
      name: users.name,
      email: users.email,
      status: orgTeachers.status,
      invitedAt: orgTeachers.invitedAt,
      acceptedAt: orgTeachers.acceptedAt,
    })
    .from(orgTeachers)
    .innerJoin(users, eq(orgTeachers.teacherId, users.id))
    .where(eq(orgTeachers.orgId, org.id))
    .orderBy(orgTeachers.invitedAt);

  // For each ACTIVE teacher count their classrooms and students
  const activeTeacherIds = teacherRows
    .filter((t) => t.status === "ACTIVE")
    .map((t) => t.teacherId);

  const classroomCountMap: Record<string, number> = {};
  const studentCountMap: Record<string, number> = {};

  for (const teacherId of activeTeacherIds) {
    const [classroomRow] = await db
      .select({ cnt: count() })
      .from(classrooms)
      .where(eq(classrooms.teacherId, teacherId));
    classroomCountMap[teacherId] = Number(classroomRow?.cnt ?? 0);

    // Count students enrolled in this teacher's classrooms
    const teacherClassrooms = await db
      .select({ id: classrooms.id })
      .from(classrooms)
      .where(eq(classrooms.teacherId, teacherId));

    let totalStudents = 0;
    for (const cls of teacherClassrooms) {
      const [studentRow] = await db
        .select({ cnt: count() })
        .from(classroomStudents)
        .where(
          and(
            eq(classroomStudents.classroomId, cls.id),
            eq(classroomStudents.status, "ACTIVE")
          )
        );
      totalStudents += Number(studentRow?.cnt ?? 0);
    }
    studentCountMap[teacherId] = totalStudents;
  }

  const teachersForClient = teacherRows.map((t) => ({
    orgTeacherId: t.orgTeacherId,
    id: t.teacherId,
    name: t.name,
    email: t.email,
    status: t.status,
    invitedAt: t.invitedAt,
    acceptedAt: t.acceptedAt,
    classroomCount: classroomCountMap[t.teacherId] ?? 0,
    studentCount: studentCountMap[t.teacherId] ?? 0,
  }));

  return <TeachersClient orgId={org.id} teachers={teachersForClient} />;
}
