"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ShieldOff, Shield, Trash2, RotateCcw, CheckCircle } from "lucide-react";
import Link from "next/link";

type UserDetail = {
  id: string; name: string; email: string; role: string | null;
  status: string; emailVerified: boolean; twoFactorEnabled: boolean;
  lastLoginAt: string | null; createdAt: string;
};

type ApiResponse = {
  user: UserDetail;
  passkeys: { id: string; name: string | null; deviceType: string; createdAt: string }[];
  attempts: { id: string; quizId: string; totalScore: number | null; isFlagged: boolean; startedAt: string }[];
  notificationCount: number;
};

const ROLE_COLORS: Record<string, string> = {
  STUDENT:      "bg-blue-500/20 text-blue-300",
  TEACHER:      "bg-green-500/20 text-green-300",
  ORGANIZATION: "bg-purple-500/20 text-purple-300",
  ADMIN:        "bg-red-500/20 text-red-300",
};

export default function AdminUserDetailPage() {
  const { id }      = useParams<{ id: string }>();
  const router      = useRouter();
  const [resp, setResp] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing]   = useState(false);
  const [msg, setMsg]         = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch(`/api/admin/users/${id}`);
    const data = await res.json();
    setResp(res.ok ? data : null);
    setLoading(false);
  }, [id]);

  const user = resp?.user ?? null;

  useEffect(() => { load(); }, [load]);

  async function patch(body: object, successMsg: string) {
    setActing(true); setMsg(null);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) { setMsg({ text: successMsg, ok: true }); await load(); }
    else { const d = await res.json(); setMsg({ text: d.error ?? "Error", ok: false }); }
    setActing(false);
  }

  async function del() {
    if (!user) return;
    if (!confirm(`Delete account for ${user.email}? Irreversible.`)) return;
    setActing(true);
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/users");
    else { const d = await res.json(); setMsg({ text: d.error ?? "Error", ok: false }); setActing(false); }
  }

  if (loading) return <div className="text-white/40 text-sm">Loading…</div>;
  if (!resp || !user) return <div className="text-red-400 text-sm">User not found</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/users" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
          <ArrowLeft className="h-4 w-4 text-white/50" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">{user.name}</h1>
          <p className="text-sm text-white/40">{user.email}</p>
        </div>
        <span className={`ml-auto inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role ?? ""] ?? "bg-white/10 text-white/50"}`}>
          {user.role ?? "—"}
        </span>
      </div>

      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm ${msg.ok ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
          {msg.text}
        </div>
      )}

      {/* Profile card */}
      <div className="rounded-xl border border-white/8 bg-white/2 p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Status",           value: user.status,           color: user.status === "ACTIVE" ? "text-green-400" : "text-red-400" },
          { label: "Email Verified",   value: user.emailVerified ? "Yes" : "No" },
          { label: "2FA Enabled",      value: user.twoFactorEnabled ? "Yes" : "No" },
          { label: "Last Login",       value: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never" },
          { label: "Joined",           value: new Date(user.createdAt).toLocaleDateString() },
          { label: "Passkeys",         value: String(resp.passkeys.length) },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <p className="text-xs text-white/40 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-sm font-medium ${color ?? "text-white"}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="rounded-xl border border-white/8 bg-white/2 p-5">
        <p className="text-xs text-white/40 uppercase tracking-wide mb-4">Admin Actions</p>
        <div className="flex flex-wrap gap-3">
          {user.status === "ACTIVE" ? (
            <button
              onClick={() => patch({ status: "SUSPENDED" }, "User suspended")}
              disabled={acting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 text-sm transition-colors disabled:opacity-50"
            >
              <ShieldOff className="h-4 w-4" /> Suspend
            </button>
          ) : (
            <button
              onClick={() => patch({ status: "ACTIVE" }, "User unsuspended")}
              disabled={acting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 text-sm transition-colors disabled:opacity-50"
            >
              <Shield className="h-4 w-4" /> Unsuspend
            </button>
          )}
          {!user.emailVerified && (
            <button
              onClick={() => patch({ emailVerified: true }, "Email marked verified")}
              disabled={acting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-sm transition-colors disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" /> Verify Email
            </button>
          )}
          {user.twoFactorEnabled && (
            <button
              onClick={() => patch({ reset2FA: true }, "2FA reset — user must re-enroll")}
              disabled={acting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 text-sm transition-colors disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" /> Reset 2FA
            </button>
          )}
          <button
            onClick={del}
            disabled={acting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm transition-colors disabled:opacity-50 ml-auto"
          >
            <Trash2 className="h-4 w-4" /> Delete Account
          </button>
        </div>
      </div>

      {/* Recent attempts */}
      {resp.attempts.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-white/2 p-5">
          <p className="text-xs text-white/40 uppercase tracking-wide mb-4">Recent Quiz Attempts</p>
          <div className="space-y-2">
            {resp.attempts.map(a => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <Link href={`/admin/attempts/${a.id}`} className="text-sm text-white hover:text-blue-400 transition-colors">
                    Attempt {a.id.slice(0, 8)}…
                  </Link>
                  <p className="text-xs text-white/30">{new Date(a.startedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  {a.isFlagged && <span className="text-xs text-yellow-400">⚠ flagged</span>}
                  <span className="text-sm text-white/60">{a.totalScore !== null ? `${a.totalScore}%` : "—"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Passkeys */}
      {resp.passkeys.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-white/2 p-5">
          <p className="text-xs text-white/40 uppercase tracking-wide mb-4">Registered Passkeys</p>
          <div className="space-y-2">
            {resp.passkeys.map(k => (
              <div key={k.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-white/70 capitalize">{k.deviceType.replace(/_/g, " ")}</span>
                <span className="text-xs text-white/30">{new Date(k.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
