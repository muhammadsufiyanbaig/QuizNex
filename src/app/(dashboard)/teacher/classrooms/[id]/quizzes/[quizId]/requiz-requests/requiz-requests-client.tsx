"use client";

import { useState } from "react";
import { Check, X, Clock, AlertTriangle, RefreshCw } from "lucide-react";

type Request = {
  id:           string;
  studentName:  string;
  studentEmail: string;
  reason:       string;
  status:       "PENDING" | "APPROVED" | "DENIED";
  createdAt:    string | Date;
};

export default function RequizRequestsClient({
  initialRequests,
  quizId,
}: {
  initialRequests: Request[];
  quizId: string;
}) {
  const [requests, setRequests] = useState<Request[]>(initialRequests);
  const [loading, setLoading]   = useState<Record<string, boolean>>({});
  const [error, setError]       = useState<string | null>(null);

  async function review(id: string, action: "APPROVED" | "DENIED") {
    setLoading((p) => ({ ...p, [id]: true }));
    setError(null);
    try {
      const res = await fetch(`/api/teacher/requiz-requests/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Failed to update request");
        return;
      }
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: action } : r))
      );
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading((p) => ({ ...p, [id]: false }));
    }
  }

  const pending  = requests.filter((r) => r.status === "PENDING");
  const reviewed = requests.filter((r) => r.status !== "PENDING");

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Pending */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-white flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-400" />
          Pending Requests
          {pending.length > 0 && (
            <span className="ml-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
              {pending.length}
            </span>
          )}
        </h2>

        {pending.length === 0 ? (
          <div className="glass-card rounded-xl px-5 py-8 text-center text-sm text-slate-500">
            No pending requests
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <div key={r.id} className="glass-card rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{r.studentName}</p>
                    <p className="truncate text-xs text-slate-500">{r.studentEmail}</p>
                    <p className="mt-1.5 text-xs text-slate-400">{r.reason}</p>
                    <p className="mt-1 text-[10px] text-slate-600">
                      {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => review(r.id, "APPROVED")}
                      disabled={loading[r.id]}
                      className="flex items-center gap-1.5 rounded-lg bg-green-500/15 border border-green-500/30 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/25 transition-colors disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve
                    </button>
                    <button
                      onClick={() => review(r.id, "DENIED")}
                      disabled={loading[r.id]}
                      className="flex items-center gap-1.5 rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Deny
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reviewed */}
      {reviewed.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-400 flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Already Reviewed
          </h2>
          <div className="space-y-2">
            {reviewed.map((r) => (
              <div key={r.id} className="glass-card rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">{r.studentName}</p>
                  <p className="truncate text-xs text-slate-500">{r.reason}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                  r.status === "APPROVED"
                    ? "border-green-500/30 bg-green-500/10 text-green-400"
                    : "border-red-500/30 bg-red-500/10 text-red-400"
                }`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
