import { auth } from "@/auth";
import { db } from "@/lib/db";
import { organizations, orgTeachers, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createNotification } from "@/lib/notifications";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const [record] = await db
    .select()
    .from(orgTeachers)
    .where(eq(orgTeachers.id, id))
    .limit(1);

  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (record.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (record.status !== "PENDING") {
    return NextResponse.json({ error: "Invite is not pending" }, { status: 400 });
  }

  const [updated] = await db
    .update(orgTeachers)
    .set({ status: "ACTIVE", acceptedAt: new Date() })
    .where(eq(orgTeachers.id, id))
    .returning();

  // Notify the organization that the teacher accepted
  try {
    const [org] = await db
      .select({ userId: organizations.userId, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, record.orgId))
      .limit(1);

    const [teacher] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (org) {
      await createNotification({
        userId: org.userId,
        type:   "ORG_INVITE_ACCEPTED",
        title:  `${teacher?.name ?? "A teacher"} accepted your invitation`,
        body:   `${teacher?.name ?? "A teacher"} has accepted the invitation to join "${org.name}" and is now an active member.`,
        link:   `/organization/teachers`,
      });
    }
  } catch { /* non-fatal */ }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ORGANIZATION") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Load org
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.userId, session.user.id))
    .limit(1);

  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  // Load orgTeacher, verify it belongs to this org
  const [record] = await db
    .select()
    .from(orgTeachers)
    .where(
      and(
        eq(orgTeachers.id, id),
        eq(orgTeachers.orgId, org.id)
      )
    )
    .limit(1);

  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db
    .update(orgTeachers)
    .set({ status: "REMOVED" })
    .where(eq(orgTeachers.id, id));

  return NextResponse.json({ ok: true });
}
