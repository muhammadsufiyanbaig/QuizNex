import { auth } from "@/auth";
import { db } from "@/lib/db";
import { classrooms, classroomStudents, users, invitations } from "@/lib/db/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateToken } from "@/lib/auth/utils";
import { sendClassroomInviteEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { APP_CONFIG } from "@/config";

const bodySchema = z.object({
  emails: z
    .array(z.string().email("Invalid email"))
    .min(1, "At least one email required")
    .max(50, "Maximum 50 at once"),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const [classroom] = await db
    .select({ id: classrooms.id, teacherId: classrooms.teacherId, name: classrooms.name, joinKey: classrooms.joinKey })
    .from(classrooms)
    .where(and(eq(classrooms.id, id), eq(classrooms.teacherId, session.user.id)))
    .limit(1);

  if (!classroom) return NextResponse.json({ error: "Classroom not found" }, { status: 404 });

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const rawEmails = parsed.data.emails;
  const emails = [...new Set(rawEmails.map((e) => e.toLowerCase().trim()))];

  const added: string[]           = [];
  const invited: string[]         = [];
  const alreadyEnrolled: string[] = [];
  const notAStudent: string[]     = [];
  const errors: string[]          = [];

  for (const email of emails) {
    try {
      // Check if user exists
      const [existingUser] = await db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        if (existingUser.role !== "STUDENT") {
          notAStudent.push(email);
          continue;
        }

        // Registered student — check existing enrollment
        const [enrollment] = await db
          .select({ id: classroomStudents.id, status: classroomStudents.status })
          .from(classroomStudents)
          .where(
            and(
              eq(classroomStudents.classroomId, classroom.id),
              eq(classroomStudents.studentId, existingUser.id)
            )
          )
          .limit(1);

        if (enrollment) {
          if (enrollment.status === "ACTIVE") {
            alreadyEnrolled.push(email);
          } else {
            // Re-activate removed student
            await db
              .update(classroomStudents)
              .set({ status: "ACTIVE" })
              .where(eq(classroomStudents.id, enrollment.id));
            added.push(email);
          }
        } else {
          await db.insert(classroomStudents).values({
            classroomId: classroom.id,
            studentId:   existingUser.id,
            status:      "ACTIVE",
          });
          added.push(email);
          // Notify the student they were added
          try {
            await createNotification({
              userId: existingUser.id,
              type:   "CLASSROOM_INVITE",
              title:  `Added to classroom: ${classroom.name}`,
              body:   `${session.user.name ?? "Your teacher"} added you to the classroom "${classroom.name}". You can now access quizzes in this classroom.`,
              link:   `/student/classrooms`,
            });
          } catch { /* non-fatal */ }
        }
      } else {
        // Not a registered user — check for existing pending invitation
        const now = new Date();
        const [existingInvite] = await db
          .select({ id: invitations.id })
          .from(invitations)
          .where(
            and(
              eq(invitations.classroomId, classroom.id),
              eq(invitations.email, email),
              eq(invitations.status, "PENDING"),
              gt(invitations.expiresAt, now)
            )
          )
          .limit(1);

        if (!existingInvite) {
          const token    = generateToken(32);
          const expiresAt = new Date(Date.now() + APP_CONFIG.invitationExpiryDays * 86_400_000);

          await db.insert(invitations).values({
            classroomId: classroom.id,
            email,
            token,
            status:    "PENDING",
            expiresAt,
          });

          await sendClassroomInviteEmail(
            email,
            classroom.name,
            session.user.name ?? "Your teacher",
            classroom.joinKey,
            token
          );
        }

        invited.push(email);
      }
    } catch (err) {
      console.error(`Error processing email ${email}:`, err);
      errors.push(email);
    }
  }

  return NextResponse.json({ added, invited, alreadyEnrolled, notAStudent, errors });
}
