import { auth } from "@/auth";
import { db } from "@/lib/db";
import { invitations, classroomStudents } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const baseUrl   = new URL(req.url).origin;

  const session = await auth();

  // Not logged in — redirect to login with callback
  if (!session?.user) {
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=/api/invitations/${token}`, baseUrl)
    );
  }

  // Logged in but not a student
  if (session.user.role !== "STUDENT") {
    return NextResponse.redirect(
      new URL(`/login?error=student-account-required`, baseUrl)
    );
  }

  // Find invitation
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.token, token), eq(invitations.status, "PENDING")))
    .limit(1);

  if (!invitation) {
    return NextResponse.redirect(
      new URL(`/student/classrooms?error=invalid_invitation`, baseUrl)
    );
  }

  // Check expiry
  if (invitation.expiresAt < new Date()) {
    await db
      .update(invitations)
      .set({ status: "EXPIRED" })
      .where(eq(invitations.id, invitation.id));

    return NextResponse.redirect(
      new URL(`/student/classrooms?error=expired_invitation`, baseUrl)
    );
  }

  const classroomId = invitation.classroomId;
  const studentId   = session.user.id;

  // Check existing enrollment
  const [existing] = await db
    .select({ id: classroomStudents.id, status: classroomStudents.status })
    .from(classroomStudents)
    .where(
      and(
        eq(classroomStudents.classroomId, classroomId),
        eq(classroomStudents.studentId, studentId)
      )
    )
    .limit(1);

  if (existing) {
    if (existing.status === "ACTIVE") {
      // Already enrolled — mark invitation accepted and go to classroom
      await db
        .update(invitations)
        .set({ status: "ACCEPTED", acceptedAt: new Date() })
        .where(eq(invitations.id, invitation.id));

      return NextResponse.redirect(
        new URL(`/student/classrooms/${classroomId}`, baseUrl)
      );
    }
    // Re-activate removed enrollment
    await db
      .update(classroomStudents)
      .set({ status: "ACTIVE" })
      .where(eq(classroomStudents.id, existing.id));
  } else {
    // Fresh enrollment
    await db.insert(classroomStudents).values({
      classroomId,
      studentId,
      status: "ACTIVE",
    });
  }

  // Mark invitation accepted
  await db
    .update(invitations)
    .set({ status: "ACCEPTED", acceptedAt: new Date() })
    .where(eq(invitations.id, invitation.id));

  return NextResponse.redirect(
    new URL(`/student/classrooms/${classroomId}`, baseUrl)
  );
}
