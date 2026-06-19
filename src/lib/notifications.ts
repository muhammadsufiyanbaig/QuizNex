import { db } from "@/lib/db";
import { notifications, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendNotificationEmail } from "@/lib/email";

export type NotificationType =
  | "QUIZ_STARTED"
  | "QUIZ_RESULT"
  | "CLASSROOM_INVITE"
  | "STUDENT_JOINED"
  | "STUDENT_FLAGGED"
  | "ORG_INVITE"
  | "ORG_INVITE_ACCEPTED"
  | "ORG_INVITE_DECLINED"
  | "STUDENT_REMOVED";

interface CreateNotificationOptions {
  userId:    string;
  type:      NotificationType;
  title:     string;
  body:      string;
  link?:     string;
  sendEmail?: boolean; // default true
}

/**
 * Creates an in-app notification and optionally sends an email.
 * Never throws — failures are logged but do not block the caller.
 */
export async function createNotification(opts: CreateNotificationOptions): Promise<void> {
  const { userId, type, title, body, link, sendEmail = true } = opts;

  try {
    await db.insert(notifications).values({ userId, type, title, body, link });
  } catch (err) {
    console.error("[notifications] Failed to insert notification:", err);
  }

  if (!sendEmail) return;

  try {
    const [user] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user) {
      await sendNotificationEmail(user.email, user.name, title, body, link);
    }
  } catch (err) {
    console.error("[notifications] Failed to send notification email:", err);
  }
}

/**
 * Creates notifications for multiple users at once (e.g. all students in a class).
 */
export async function createNotificationForMany(
  userIds: string[],
  opts: Omit<CreateNotificationOptions, "userId">
): Promise<void> {
  if (userIds.length === 0) return;
  await Promise.all(userIds.map((userId) => createNotification({ ...opts, userId })));
}
