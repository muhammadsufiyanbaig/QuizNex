"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type GradeClientProps = {
  quiz: { id: string; title: string; type: string };
  classroomId: string;
  questions: { id: string; text: string; marks: number; order: number }[];
  attempts: {
    id: string;
    studentName: string;
    studentEmail: string;
    submittedAt: Date | null;
    status: string;
    answers: Record<string, { id: string; textAnswer: string | null; marksAwarded: number | null }>;
  }[];
};

function statusBadgeClass(status: string) {
  if (status === "SUBMITTED") return "bg-green-500/10 text-green-400 ring-1 ring-green-500/20";
  if (status === "AUTO_SUBMITTED") return "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20";
  if (status === "FLAGGED") return "bg-red-500/10 text-red-400 ring-1 ring-red-500/20";
  return "bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20";
}

function statusLabel(status: string) {
  if (status === "AUTO_SUBMITTED") return "Auto-submitted";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default function GradeClient({
  quiz,
  classroomId,
  questions,
  attempts,
}: GradeClientProps) {
  // marksState: Record<attemptId, Record<questionId, number | "">)
  const [marksState, setMarksState] = useState<
    Record<string, Record<string, number | "">>
  >(() => {
    const init: Record<string, Record<string, number | "">> = {};
    for (const attempt of attempts) {
      init[attempt.id] = {};
      for (const q of questions) {
        const ans = attempt.answers[q.id];
        init[attempt.id][q.id] = ans?.marksAwarded ?? "";
      }
    }
    return init;
  });

  const [savingState, setSavingState] = useState<
    Record<string, "idle" | "saving" | "saved" | "error">
  >(() => {
    const init: Record<string, "idle" | "saving" | "saved" | "error"> = {};
    for (const attempt of attempts) {
      init[attempt.id] = "idle";
    }
    return init;
  });

  function handleMarkChange(attemptId: string, questionId: string, value: string) {
    const num = value === "" ? "" : Number(value);
    setMarksState((prev) => ({
      ...prev,
      [attemptId]: {
        ...prev[attemptId],
        [questionId]: num,
      },
    }));
    // Reset save state when user edits
    setSavingState((prev) => ({
      ...prev,
      [attemptId]: "idle",
    }));
  }

  async function handleSave(attempt: GradeClientProps["attempts"][number]) {
    setSavingState((prev) => ({ ...prev, [attempt.id]: "saving" }));

    try {
      const patchPromises = questions
        .map((q) => {
          const ans = attempt.answers[q.id];
          if (!ans) return null;
          const marksAwarded = marksState[attempt.id]?.[q.id];
          if (marksAwarded === "" || marksAwarded === undefined) return null;
          return fetch(`/api/answers/${ans.id}/grade`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ marksAwarded: Number(marksAwarded) }),
          }).then(async (res) => {
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error ?? "Failed to save");
            }
          });
        })
        .filter(Boolean) as Promise<void>[];

      await Promise.all(patchPromises);
      setSavingState((prev) => ({ ...prev, [attempt.id]: "saved" }));
    } catch {
      setSavingState((prev) => ({ ...prev, [attempt.id]: "error" }));
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href={`/teacher/classrooms/${classroomId}/quizzes/${quiz.id}`}
          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">{quiz.title}</h1>
          <p className="mt-0.5 text-sm text-slate-400">QA Grading — {questions.length} question{questions.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {attempts.length === 0 && (
        <div className="glass-card rounded-2xl flex flex-col items-center gap-4 py-16">
          <p className="text-sm text-slate-400">No submitted attempts to grade yet.</p>
        </div>
      )}

      {attempts.map((attempt) => {
        const saveStatus = savingState[attempt.id] ?? "idle";

        return (
          <div key={attempt.id} className="glass-card rounded-2xl overflow-hidden">
            {/* Attempt header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-violet-700/20 text-sm font-semibold text-violet-300 ring-1 ring-white/10">
                  {attempt.studentName[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{attempt.studentName}</p>
                  <p className="text-xs text-slate-500">{attempt.studentEmail}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {attempt.submittedAt && (
                  <p className="text-xs text-slate-500">
                    Submitted {new Date(attempt.submittedAt).toLocaleString()}
                  </p>
                )}
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(attempt.status)}`}>
                  {statusLabel(attempt.status)}
                </span>
              </div>
            </div>

            {/* Questions */}
            <div className="divide-y divide-white/5 px-6">
              {questions.map((q) => {
                const ans = attempt.answers[q.id];
                const currentMark = marksState[attempt.id]?.[q.id] ?? "";

                return (
                  <div key={q.id} className="py-5 space-y-3">
                    {/* Question text */}
                    <p className="text-sm font-semibold text-white">
                      Q{q.order}. {q.text}
                    </p>

                    {/* Student answer */}
                    {ans?.textAnswer ? (
                      <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                        <p className="text-sm italic text-slate-300">{ans.textAnswer}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600 italic">Not answered</p>
                    )}

                    {/* Marks input */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-400 shrink-0">Marks:</label>
                      <input
                        type="number"
                        min={0}
                        max={q.marks}
                        step={0.5}
                        value={currentMark}
                        disabled={!ans}
                        onChange={(e) => handleMarkChange(attempt.id, q.id, e.target.value)}
                        className="w-20 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-slate-600 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30 disabled:opacity-40"
                        placeholder="0"
                      />
                      <span className="text-xs text-slate-500">/ {q.marks}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Save button */}
            <div className="flex items-center justify-between border-t border-white/8 px-6 py-4">
              <div className="flex items-center gap-2">
                {saveStatus === "saved" && (
                  <span className="flex items-center gap-1.5 text-sm text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    Saved!
                  </span>
                )}
                {saveStatus === "error" && (
                  <span className="flex items-center gap-1.5 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    Failed to save
                  </span>
                )}
              </div>
              <button
                onClick={() => handleSave(attempt)}
                disabled={saveStatus === "saving"}
                className="btn-gradient flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 disabled:opacity-60"
              >
                {saveStatus === "saving" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save Grades"
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
