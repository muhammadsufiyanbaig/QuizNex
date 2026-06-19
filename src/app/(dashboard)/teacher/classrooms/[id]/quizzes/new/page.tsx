import { auth } from "@/auth";
import { db } from "@/lib/db";
import { classrooms } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import NewQuizForm from "./new-quiz-form";

export default async function NewQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const [classroom] = await db
    .select({ id: classrooms.id, name: classrooms.name })
    .from(classrooms)
    .where(and(eq(classrooms.id, id), eq(classrooms.teacherId, session.user.id)))
    .limit(1);

  if (!classroom) notFound();

  return <NewQuizForm classroomId={id} classroomName={classroom.name} />;
}
