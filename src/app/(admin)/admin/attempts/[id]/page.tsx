"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, AlertTriangle, CheckCircle } from "lucide-react";
import Link from "next/link";

type Answer = {
  answerId: string; questionId: string; questionText: string;
  questionType: string; questionMarks: number; modelAnswer: string | null;
  textAnswer: string | null; selectedOptionId: string | null;
  marksAwarded: number | null; timeTakenSecs: number | null;
};

type ProctoringEvent = {
  id: string; eventType: string; occurredAt: string; metadata: unknown;
};

type AttemptDetail = {
  attempt: {
    id: string; status: string; totalScore: number | null; isFlagged: boolean;
    flagReason: string | null; startedAt: string; submittedAt: string | null;
    tabSwitchCount: number | null; faceMismatchCount: number | null;
  };
  studentName: string; studentEmail: string;
  quizTitle: string; quizType: string; totalMarks: number | null;
  classroomName: string;
  proctoringEvents: ProctoringEvent[];
  answers: Answer[];
};

const EVENT_COLORS: Record<string, string> = {
  TAB_SWITCH:      "text-yellow-400",
  FACE_NOT_FOUND:  "text-red-400",
  FACE_MISMATCH:   "text-red-400",
  BLUR:            "text-orange-400",
  RESIZE:          "text-white/40",
  MULTIPLE_FACES:  "text-red-400",
};

export default function AdminAttemptDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const [data, setData] = useState<AttemptDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [acting, setActing]     = useState(false);
  const [msg, setMsg]           = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch(`/api/admin/attempts/${id}`);
    const json = await res.json();
    setData(res.ok ? json : null);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function toggleFlag() {
    if (!data) return;
    setActing(true); setMsg(null);
    const nextFlag = !data.attempt.isFlagged;
    const res = await fetch(`/api/admin/attempts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFlagged: nextFlag }),
    });
    if (res.ok) { setMsg({ text: nextFlag ? "Attempt flagged" : "Flag removed", ok: true }); await load(); }
    else { setMsg({ text: "Error updating flag", ok: false }); }
    setActing(false);
  }

  if (loading) return <div className="text-white/40 text-sm">Loading…</div>;
  if (!data)   return <div className="text-red-400 text-sm">Attempt not found</div>;

  const { attempt } = data;
  const durationSecs = attempt.submittedAt
    ? Math.floor((new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000)
    : null;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/flagged" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
          <ArrowLeft className="h-4 w-4 text-white/50" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">{data.quizTitle}</h1>
          <p className="text-sm text-white/40">{data.studentName} · {data.classroomName}</p>
        </div>
        {attempt.isFlagged && (
          <span className="ml-auto flex items-center gap-1.5 text-sm font-medium text-yellow-400">
            <AlertTriangle className="h-4 w-4" /> Flagged
          </span>
        )}
      </div>

      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm ${msg.ok ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
          {msg.text}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Score",           value: attempt.totalScore !== null ? `${attempt.totalScore}/${data.totalMarks ?? "?"}` : "—" },
          { label: "Status",          value: attempt.status },
          { label: "Duration",        value: durationSecs !== null ? `${Math.floor(durationSecs/60)}m ${durationSecs%60}s` : "—" },
          { label: "Tab Switches",    value: String(attempt.tabSwitchCount ?? 0) },
          { label: "Face Mismatches", value: String(attempt.faceMismatchCount ?? 0) },
          { label: "Flag Reason",     value: attempt.flagReason ?? "—" },
          { label: "Started",         value: new Date(attempt.startedAt).toLocaleString() },
          { label: "Submitted",       value: attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-white/8 bg-white/2 p-4">
            <p className="text-xs text-white/40 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-sm font-medium text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Flag action */}
      <div className="flex gap-3">
        <button
          onClick={toggleFlag}
          disabled={acting}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 ${
            attempt.isFlagged
              ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
              : "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
          }`}
        >
          {attempt.isFlagged ? <><CheckCircle className="h-4 w-4" /> Remove Flag</> : <><AlertTriangle className="h-4 w-4" /> Flag Attempt</>}
        </button>
        <Link
          href={`/admin/users/${data.attempt.id}`}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-white/60 text-sm hover:bg-white/10 transition-colors"
        >
          View Student Profile
        </Link>
      </div>

      {/* Proctoring timeline */}
      {data.proctoringEvents.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-white/2 p-5">
          <p className="text-xs text-white/40 uppercase tracking-wide mb-4">
            Proctoring Events ({data.proctoringEvents.length})
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {data.proctoringEvents.map(e => (
              <div key={e.id} className="flex items-start gap-3 py-1.5 border-b border-white/5 last:border-0">
                <span className={`text-xs font-mono shrink-0 ${EVENT_COLORS[e.eventType] ?? "text-white/50"}`}>
                  {e.eventType}
                </span>
                <span className="text-xs text-white/30">
                  {new Date(e.occurredAt).toLocaleTimeString()}
                </span>
                {!!e.metadata && (
                  <span className="text-xs text-white/20 truncate">
                    {JSON.stringify(e.metadata).slice(0, 80)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Answers */}
      {data.answers.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-white/2 p-5">
          <p className="text-xs text-white/40 uppercase tracking-wide mb-4">
            Answers ({data.answers.length})
          </p>
          <div className="space-y-4">
            {data.answers.map((a, idx) => (
              <div key={a.answerId} className="border border-white/6 rounded-lg p-4 space-y-2">
                <p className="text-sm text-white font-medium">
                  <span className="text-white/30 mr-2">Q{idx + 1}.</span>
                  {a.questionText}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-white/30 mb-0.5">Answer</p>
                    <p className="text-white/70">{a.textAnswer ?? a.selectedOptionId ?? "—"}</p>
                  </div>
                  {a.modelAnswer && (
                    <div>
                      <p className="text-white/30 mb-0.5">Model Answer</p>
                      <p className="text-green-400/70">{a.modelAnswer}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-white/30 mb-0.5">Marks</p>
                    <p className="text-white/70">
                      {a.marksAwarded !== null ? a.marksAwarded : "—"} / {a.questionMarks}
                    </p>
                  </div>
                  {a.timeTakenSecs !== null && (
                    <div>
                      <p className="text-white/30 mb-0.5">Time</p>
                      <p className="text-white/50">{a.timeTakenSecs}s</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
