import { auth } from "@/auth";
import { db } from "@/lib/db";
import { classroomStudents, quizzes } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { id: classroomId } = await params;

  // Students must be enrolled; teachers own classroom (loose check — just auth is enough for read)
  if (session.user.role === "STUDENT") {
    const [enrollment] = await db
      .select({ id: classroomStudents.id })
      .from(classroomStudents)
      .where(
        and(
          eq(classroomStudents.classroomId, classroomId),
          eq(classroomStudents.studentId, session.user.id),
          eq(classroomStudents.status, "ACTIVE")
        )
      )
      .limit(1);
    if (!enrollment) return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Track last known status for each quiz to only push on change
      const lastStatus: Record<string, string> = {};

      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // controller may be closed
        }
      };

      // Initial load — seed lastStatus without sending
      const initial = await db
        .select({ id: quizzes.id, status: quizzes.status })
        .from(quizzes)
        .where(eq(quizzes.classroomId, classroomId));
      for (const q of initial) lastStatus[q.id] = q.status;

      // Heartbeat so connection stays alive through proxies
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
          const rows = await db
            .select({ id: quizzes.id, status: quizzes.status })
            .from(quizzes)
            .where(eq(quizzes.classroomId, classroomId));

          for (const row of rows) {
            if (row.status !== lastStatus[row.id]) {
              lastStatus[row.id] = row.status;
              send({ quizId: row.id, status: row.status });
            }
          }
        } catch {
          clearInterval(poll);
          clearInterval(heartbeat);
          try { controller.close(); } catch { /* already closed */ }
        }
      }, 3_000);

      req.signal.addEventListener("abort", () => {
        clearInterval(poll);
        clearInterval(heartbeat);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection:      "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
