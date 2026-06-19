"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Phase 3 — SSE watcher for student classroom page.
 * Invisible component. Subscribes to classroom SSE stream.
 * When any quiz status changes → calls router.refresh() so the
 * Server Component re-renders with the new status from DB.
 */
export default function ClassroomQuizWatcher({
  classroomId,
  hasPublishedQuizzes,
}: {
  classroomId: string;
  hasPublishedQuizzes: boolean;
}) {
  const router = useRouter();
  const esRef  = useRef<EventSource | null>(null);

  useEffect(() => {
    // Only open SSE if there are PUBLISHED quizzes to watch
    if (!hasPublishedQuizzes) return;

    const es = new EventSource(`/api/classrooms/${classroomId}/stream`);
    esRef.current = es;

    es.onmessage = () => {
      // Any status change → refresh the server component data
      router.refresh();
    };

    es.onerror = () => {
      es.close();
      // Retry after 5 seconds on error
      setTimeout(() => {
        if (esRef.current === es) {
          esRef.current = null;
        }
      }, 5_000);
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [classroomId, hasPublishedQuizzes, router]);

  return null;
}
