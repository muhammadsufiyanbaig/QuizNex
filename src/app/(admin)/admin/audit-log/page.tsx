"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

type LogEntry = {
  id: string; action: string; targetType: string | null; targetId: string | null;
  metadata: unknown; ip: string | null; createdAt: string;
  adminName: string; adminEmail: string;
};

const ACTION_COLORS: Record<string, string> = {
  delete_user:      "text-red-400",
  update_user:      "text-yellow-400",
  delete_classroom: "text-red-400",
  update_classroom: "text-yellow-400",
  update_attempt:   "text-blue-400",
  send_notification:"text-purple-400",
};

export default function AuditLogPage() {
  const [logs, setLogs]     = useState<LogEntry[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [pages, setPages]   = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch(`/api/admin/audit-log?page=${page}&limit=50`);
    const data = await res.json();
    setLogs(data.logs ?? []);
    setTotal(data.total ?? 0);
    setPages(data.pages ?? 1);
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Log</h1>
          <p className="text-sm text-white/40 mt-1">{total} recorded actions — immutable</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
          <RefreshCw className={`h-4 w-4 text-white/50 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="rounded-xl border border-white/8 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/3 border-b border-white/8">
            <tr>
              {["When", "Admin", "Action", "Target", "IP"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {logs.map(l => (
              <tr key={l.id} className="hover:bg-white/2 transition-colors">
                <td className="px-4 py-3 text-xs text-white/40 whitespace-nowrap">
                  {new Date(l.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <p className="text-white/80 text-xs">{l.adminName}</p>
                  <p className="text-white/30 text-xs">{l.adminEmail}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`font-mono text-xs ${ACTION_COLORS[l.action] ?? "text-white/60"}`}>
                    {l.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-white/40">
                  {l.targetType && <span className="mr-1 text-white/60">{l.targetType}</span>}
                  {l.targetId && <span className="font-mono">{l.targetId.slice(0, 8)}…</span>}
                  {!!l.metadata && (
                    <span className="ml-2 text-white/20 text-xs">{JSON.stringify(l.metadata).slice(0, 60)}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs font-mono text-white/30">{l.ip ?? "—"}</td>
              </tr>
            ))}
            {!loading && logs.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-white/30">No audit entries</td></tr>
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
