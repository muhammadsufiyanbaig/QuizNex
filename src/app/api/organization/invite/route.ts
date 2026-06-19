import { auth } from "@/auth";
import { db } from "@/lib/db";
import { organizations, orgTeachers, users } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendTeacherOrgInviteEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

const inviteSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ORGANIZATION") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { email } = parsed.data;

  // Load org
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.userId, session.user.id))
    .limit(1);

  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  // Check teacher user exists and has TEACHER role
  const [teacher] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!teacher || teacher.role !== "TEACHER") {
    return NextResponse.json(
      { error: "No teacher account found with this email" },
      { status: 400 }
    );
  }

  // Check if already associated (ACTIVE or PENDING)
  const [existing] = await db
    .select({ id: orgTeachers.id, status: orgTeachers.status })
    .from(orgTeachers)
    .where(
      and(
        eq(orgTeachers.orgId, org.id),
        eq(orgTeachers.teacherId, teacher.id),
        or(
          eq(orgTeachers.status, "ACTIVE"),
          eq(orgTeachers.status, "PENDING")
        )
      )
    )
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "Teacher is already associated with this organization" },
      { status: 409 }
    );
  }

  // Insert new orgTeachers record
  const [record] = await db
    .insert(orgTeachers)
    .values({
      orgId: org.id,
      teacherId: teacher.id,
      status: "PENDING",
      invitedAt: new Date(),
    })
    .returning();

  // Load teacher email and org name to send notification
  const [teacherUser] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, teacher.id))
    .limit(1);

  const [inviter] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (teacherUser) {
    try {
      await sendTeacherOrgInviteEmail(
        teacherUser.email,
        org.name,
        inviter?.name ?? "An organization",
      );
    } catch { /* non-fatal */ }

    // In-app notification for the invited teacher
    try {
      await createNotification({
        userId: teacher.id,
        type:   "ORG_INVITE",
        title:  `Organization invitation from ${org.name}`,
        body:   `${inviter?.name ?? "An organization"} has invited you to join "${org.name}". Go to your profile to accept or decline.`,
        link:   `/teacher/profile`,
        sendEmail: false, // email already sent above
      });
    } catch { /* non-fatal */ }
  }

  return NextResponse.json(record, { status: 201 });
}
