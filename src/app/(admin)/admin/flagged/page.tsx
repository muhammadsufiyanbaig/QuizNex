"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

type FlaggedAttempt = {
  attemptId: string; studentName: string; studentEmail: string;
  quizTitle: string; classroomName: string; totalScore: number | null;
  flagReason: string | null; status: string;
  startedAt: string; submittedAt: string | null;
};

export default function FlaggedPage() {
  const [attempts, setAttempts] = useState<FlaggedAttempt[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [pages, setPages]       = useState(1);
  const [loading, setLoading]   = useState(false);
  const [acting, setActing]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch(`/api/admin/attempts/flagged?page=${page}&limit=20`);
    const data = await res.json();
    setAttempts(data.attempts ?? []);
    setTotal(data.total ?? 0);
    setPages(data.pages ?? 1);
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  async function unflag(id: string) {
    setActing(id);
    await fetch(`/api/admin/attempts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFlagged: false }),
    });
    await load();
    setActing(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <AlertTriangle className="h-6 w-6 text-yellow-400" />
            Flagged Attempts
          </h1>
          <p className="text-sm text-white/40 mt-1">{total} flagged — requires review</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
          <RefreshCw className={`h-4 w-4 text-white/50 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="rounded-xl border border-white/8 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/3 border-b border-white/8">
            <tr>
              {["Student", "Quiz", "Classroom", "Score", "Reason", "Submitted", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {attempts.map(a => (
              <tr key={a.attemptId} className="hover:bg-white/2 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{a.studentName}</p>
                  <p className="text-xs text-white/40">{a.studentEmail}</p>
                </td>
                <td className="px-4 py-3 text-white/80">{a.quizTitle}</td>
                <td className="px-4 py-3 text-white/60">{a.classroomName}</td>
                <td className="px-4 py-3 text-white/80">{a.totalScore ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-yellow-400/80 max-w-40 truncate">{a.flagReason ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-white/40">
                  {a.submittedAt ? new Date(a.submittedAt).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/attempts/${a.attemptId}`}
                      className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs hover:bg-blue-500/20 transition-colors"
                    >
                      Review
                    </Link>
                    <button
                      onClick={() => unflag(a.attemptId)}
                      disabled={acting === a.attemptId}
                      className="px-2.5 py-1 rounded-lg bg-white/5 text-white/50 text-xs hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      Unflag
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && attempts.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-white/30">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-white/10" />
                No flagged attempts
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-white/40">
          <span>Page {page} of {pages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded-lg bg-white/5 disabled:opacity-30 hover:bg-white/10">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="p-2 rounded-lg bg-white/5 disabled:opacity-30 hover:bg-white/10">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
