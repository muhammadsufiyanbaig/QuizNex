"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, ShieldOff, Shield, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

type User = {
  id: string; name: string; email: string; role: string | null;
  status: string; emailVerified: boolean; twoFactorEnabled: boolean;
  lastLoginAt: string | null; createdAt: string;
};

const ROLE_COLORS: Record<string, string> = {
  STUDENT:      "bg-blue-500/20 text-blue-300",
  TEACHER:      "bg-green-500/20 text-green-300",
  ORGANIZATION: "bg-purple-500/20 text-purple-300",
  ADMIN:        "bg-red-500/20 text-red-300",
};

export default function AdminUsersPage() {
  const [users, setUsers]       = useState<User[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [pages, setPages]       = useState(1);
  const [search, setSearch]     = useState("");
  const [roleFilter, setRole]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [acting, setActing]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search)     params.set("search", search);
    if (roleFilter) params.set("role",   roleFilter);
    const res  = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    setUsers(data.users ?? []);
    setTotal(data.total ?? 0);
    setPages(data.pages ?? 1);
    setLoading(false);
  }, [page, search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  async function updateUser(id: string, body: object) {
    setActing(id);
    await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    await load();
    setActing(null);
  }

  async function deleteUser(id: string, email: string) {
    if (!confirm(`Delete account for ${email}? This is irreversible.`)) return;
    setActing(id);
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    await load();
    setActing(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-sm text-white/40 mt-1">{total} total accounts</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name or email…"
            className="w-64 pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => { setRole(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none"
        >
          <option value="">All roles</option>
          <option value="STUDENT">Student</option>
          <option value="TEACHER">Teacher</option>
          <option value="ORGANIZATION">Organization</option>
          <option value="ADMIN">Admin</option>
        </select>
        <button onClick={load} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
          <RefreshCw className={`h-4 w-4 text-white/50 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/8 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/3 border-b border-white/8">
            <tr>
              {["User", "Role", "Status", "2FA", "Last Login", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-white/2 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/admin/users/${u.id}`} className="hover:text-blue-400 transition-colors">
                    <p className="font-medium text-white">{u.name}</p>
                    <p className="text-xs text-white/40">{u.email}</p>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role ?? ""] ?? "bg-white/10 text-white/50"}`}>
                    {u.role ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${u.status === "ACTIVE" ? "text-green-400" : "text-red-400"}`}>
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-white/50">
                  {u.twoFactorEnabled ? "✓" : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-white/40">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {u.status === "ACTIVE" ? (
                      <button
                        onClick={() => updateUser(u.id, { status: "SUSPENDED" })}
                        disabled={acting === u.id}
                        title="Suspend"
                        className="p-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 transition-colors disabled:opacity-50"
                      >
                        <ShieldOff className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => updateUser(u.id, { status: "ACTIVE" })}
                        disabled={acting === u.id}
                        title="Unsuspend"
                        className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors disabled:opacity-50"
                      >
                        <Shield className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteUser(u.id, u.email)}
                      disabled={acting === u.id}
                      title="Delete"
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-white/30">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-white/40">
          <span>Page {page} of {pages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded-lg bg-white/5 disabled:opacity-30 hover:bg-white/10 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="p-2 rounded-lg bg-white/5 disabled:opacity-30 hover:bg-white/10 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
