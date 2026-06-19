import { db } from "@/lib/db";
import { quizzes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type Quiz = typeof quizzes.$inferSelect;

/**
 * Phase 2 — Lazy scheduled activation.
 * If a quiz is PUBLISHED and its scheduledAt has passed, flip it to ACTIVE in DB
 * and return the updated record. No cron job needed.
 */
export async function autoActivateIfScheduled(quiz: Quiz): Promise<Quiz> {
  if (
    quiz.status === "PUBLISHED" &&
    quiz.scheduledAt !== null &&
    quiz.scheduledAt <= new Date()
  ) {
    const [updated] = await db
      .update(quizzes)
      .set({ status: "ACTIVE", updatedAt: new Date() })
      .where(eq(quizzes.id, quiz.id))
      .returning();
    return updated ?? quiz;
  }
  return quiz;
}
