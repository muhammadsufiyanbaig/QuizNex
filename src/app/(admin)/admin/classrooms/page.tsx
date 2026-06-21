"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, Trash2, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import Link from "next/link";

type Classroom = {
  id: string; name: string; subject: string | null;
  teacherName: string; teacherEmail: string;
  isArchived: boolean; createdAt: string;
};

export default function AdminClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [pages, setPages]           = useState(1);
  const [search, setSearch]         = useState("");
  const [loading, setLoading]       = useState(false);
  const [acting, setActing]         = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    const res  = await fetch(`/api/admin/classrooms?${params}`);
    const data = await res.json();
    setClassrooms(data.classrooms ?? []);
    setTotal(data.total ?? 0);
    setPages(data.pages ?? 1);
    setLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  async function archive(id: string, name: string) {
    if (!confirm(`Archive classroom "${name}"? Students will lose access.`)) return;
    setActing(id);
    await fetch(`/api/admin/classrooms/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isArchived: true }),
    });
    await load();
    setActing(null);
  }

  async function deleteClassroom(id: string, name: string) {
    if (!confirm(`Delete classroom "${name}"? This cannot be undone.`)) return;
    setActing(id);
    await fetch(`/api/admin/classrooms/${id}`, { method: "DELETE" });
    await load();
    setActing(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <BookOpen className="h-6 w-6 text-blue-400" />
            Classrooms
          </h1>
          <p className="text-sm text-white/40 mt-1">{total} classrooms on platform</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search classroom or teacher…"
            className="w-72 pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
          />
        </div>
        <button onClick={load} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
          <RefreshCw className={`h-4 w-4 text-white/50 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="rounded-xl border border-white/8 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/3 border-b border-white/8">
            <tr>
              {["Classroom", "Teacher", "Subject", "Status", "Created", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {classrooms.map(c => (
              <tr key={c.id} className="hover:bg-white/2 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/admin/classrooms/${c.id}`} className="font-medium text-white hover:text-blue-400 transition-colors">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <p className="text-white/80 text-xs">{c.teacherName}</p>
                  <p className="text-white/30 text-xs">{c.teacherEmail}</p>
                </td>
                <td className="px-4 py-3 text-xs text-white/50">{c.subject || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${!c.isArchived ? "text-green-400" : "text-white/40"}`}>
                    {c.isArchived ? "ARCHIVED" : "ACTIVE"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-white/40">
                  {new Date(c.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {!c.isArchived && (
                      <button
                        onClick={() => archive(c.id, c.name)}
                        disabled={acting === c.id}
                        title="Archive"
                        className="px-2.5 py-1 rounded-lg bg-yellow-500/10 text-yellow-400 text-xs hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
                      >
                        Archive
                      </button>
                    )}
                    <button
                      onClick={() => deleteClassroom(c.id, c.name)}
                      disabled={acting === c.id}
                      title="Delete"
                      className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && classrooms.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-white/30">No classrooms found</td></tr>
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
