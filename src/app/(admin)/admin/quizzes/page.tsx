"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, ChevronLeft, ChevronRight, FileQuestion } from "lucide-react";

type Quiz = {
  id: string; title: string; type: string; status: string;
  classroomName: string; teacherName: string;
  totalMarks: number | null; timeLimitMins: number | null;
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     "bg-white/10 text-white/40",
  PUBLISHED: "bg-yellow-500/20 text-yellow-400",
  ACTIVE:    "bg-green-500/20 text-green-400",
  COMPLETED: "bg-blue-500/20 text-blue-400",
  ARCHIVED:  "bg-white/5 text-white/30",
};

const TYPE_LABELS: Record<string, string> = {
  MCQ:     "MCQ",
  QA:      "Q&A",
  MIXED:   "Mixed",
};

export default function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [pages, setPages]     = useState(1);
  const [search, setSearch]   = useState("");
  const [status, setStatus]   = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const res  = await fetch(`/api/admin/quizzes?${params}`);
    const data = await res.json();
    setQuizzes(data.quizzes ?? []);
    setTotal(data.total ?? 0);
    setPages(data.pages ?? 1);
    setLoading(false);
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <FileQuestion className="h-6 w-6 text-green-400" />
            Quizzes
          </h1>
          <p className="text-sm text-white/40 mt-1">{total} quizzes on platform</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search quiz title…"
            className="w-64 pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
          />
        </div>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button onClick={load} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
          <RefreshCw className={`h-4 w-4 text-white/50 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="rounded-xl border border-white/8 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/3 border-b border-white/8">
            <tr>
              {["Title", "Type", "Status", "Classroom", "Teacher", "Total Marks", "Time Limit", "Created"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {quizzes.map(q => (
              <tr key={q.id} className="hover:bg-white/2 transition-colors">
                <td className="px-4 py-3 font-medium text-white max-w-48 truncate">{q.title}</td>
                <td className="px-4 py-3 text-xs text-white/50">{TYPE_LABELS[q.type] ?? q.type}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[q.status] ?? "bg-white/10 text-white/40"}`}>
                    {q.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-white/60 max-w-32 truncate">{q.classroomName}</td>
                <td className="px-4 py-3 text-xs text-white/50">{q.teacherName}</td>
                <td className="px-4 py-3 text-white/70 text-center">{q.totalMarks ?? "—"}</td>
                <td className="px-4 py-3 text-white/70 text-center">
                  {q.timeLimitMins !== null ? `${q.timeLimitMins}m` : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-white/40">
                  {new Date(q.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {!loading && quizzes.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-white/30">No quizzes found</td></tr>
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
