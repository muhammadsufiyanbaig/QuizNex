import { auth } from "@/auth";
import { db } from "@/lib/db";
import { quizzes, classrooms, classroomStudents } from "@/lib/db/schema";
import { and, eq, or, isNotNull } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { quizId } = await params;

  // Authorization: teacher who owns the classroom OR enrolled active student
  const [access] = await db
    .select({ quizId: quizzes.id })
    .from(quizzes)
    .innerJoin(classrooms, eq(quizzes.classroomId, classrooms.id))
    .leftJoin(
      classroomStudents,
      and(
        eq(classroomStudents.classroomId, classrooms.id),
        eq(classroomStudents.studentId, session.user.id!),
        eq(classroomStudents.status, "ACTIVE")
      )
    )
    .where(
      and(
        eq(quizzes.id, quizId),
        or(
          eq(classrooms.teacherId, session.user.id!),
          isNotNull(classroomStudents.studentId)
        )
      )
    )
    .limit(1);

  if (!access) return new Response("Forbidden", { status: 403 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { /* closed */ }
      };

      // Seed last known status
      const [initial] = await db
        .select({ status: quizzes.status })
        .from(quizzes)
        .where(eq(quizzes.id, quizId))
        .limit(1);

      if (!initial) {
        try { controller.close(); } catch { /* closed */ }
        return;
      }

      let lastStatus = initial.status;

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(heartbeat);
          clearInterval(poll);
        }
      }, 15_000);

      const poll = setInterval(async () => {
        try {
          const [row] = await db
            .select({ status: quizzes.status })
            .from(quizzes)
            .where(eq(quizzes.id, quizId))
            .limit(1);

          if (!row) {
            clearInterval(poll);
            clearInterval(heartbeat);
            try { controller.close(); } catch { /* closed */ }
            return;
          }

          if (row.status !== lastStatus) {
            lastStatus = row.status;
            send({ status: row.status });
          }
        } catch {
          clearInterval(poll);
          clearInterval(heartbeat);
          try { controller.close(); } catch { /* closed */ }
        }
      }, 3_000);

      req.signal.addEventListener("abort", () => {
        clearInterval(poll);
        clearInterval(heartbeat);
        try { controller.close(); } catch { /* closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":      "text/event-stream",
      "Cache-Control":     "no-cache, no-transform",
      Connection:          "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
