"use client";

import { useState } from "react";
import { Trash2, Loader2, CheckCircle, AlertCircle, UserPlus } from "lucide-react";

type Teacher = {
  orgTeacherId: string;
  id: string;
  name: string;
  email: string;
  status: string;
  invitedAt: Date;
  acceptedAt: Date | null;
  classroomCount: number;
  studentCount: number;
};

type TeachersClientProps = {
  orgId: string;
  teachers: Teacher[];
};

function statusBadgeClass(status: string) {
  if (status === "ACTIVE") return "bg-green-500/10 text-green-400 ring-1 ring-green-500/20";
  if (status === "PENDING") return "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20";
  return "bg-red-500/10 text-red-400 ring-1 ring-red-500/20";
}

export default function TeachersClient({ teachers: initial }: TeachersClientProps) {
  const [teachers, setTeachers] = useState<Teacher[]>(initial);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteState, setInviteState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [inviteError, setInviteError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const active = teachers.filter((t) => t.status === "ACTIVE");
  const pending = teachers.filter((t) => t.status === "PENDING");
  const removed = teachers.filter((t) => t.status === "REMOVED");

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteState("loading");
    setInviteError("");

    try {
      const res = await fetch("/api/organization/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to send invite");
      }

      const newRecord = await res.json();
      // The response is an orgTeachers record; we need to add a placeholder teacher row
      setTeachers((prev) => [
        ...prev,
        {
          orgTeacherId: newRecord.id,
          id: newRecord.teacherId,
          name: inviteEmail.split("@")[0],
          email: inviteEmail.trim(),
          status: "PENDING",
          invitedAt: new Date(newRecord.invitedAt),
          acceptedAt: null,
          classroomCount: 0,
          studentCount: 0,
        },
      ]);
      setInviteEmail("");
      setInviteState("success");
      setTimeout(() => setInviteState("idle"), 3000);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invite");
      setInviteState("error");
    }
  }

  async function handleRemove(orgTeacherId: string) {
    setRemovingId(orgTeacherId);
    try {
      const res = await fetch(`/api/organization/teachers/${orgTeacherId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove teacher");
      setTeachers((prev) =>
        prev.map((t) =>
          t.orgTeacherId === orgTeacherId ? { ...t, status: "REMOVED" } : t
        )
      );
    } catch {
      // silently handle
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Teacher Management</h1>
        <p className="mt-1 text-sm text-slate-400">Invite and manage teachers in your organization.</p>
      </div>

      {/* Invite form */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="mb-4 font-semibold text-white">Invite a Teacher</h2>
        <form onSubmit={handleInvite} className="flex gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => {
              setInviteEmail(e.target.value);
              if (inviteState === "error") setInviteState("idle");
            }}
            placeholder="teacher@example.com"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
          />
          <button
            type="submit"
            disabled={inviteState === "loading" || !inviteEmail.trim()}
            className="btn-gradient flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 disabled:opacity-60"
          >
            {inviteState === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Invite Teacher
          </button>
        </form>
        {inviteState === "success" && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-green-400">
            <CheckCircle className="h-4 w-4" />
            Invite sent successfully!
          </p>
        )}
        {inviteState === "error" && inviteError && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-red-400">
            <AlertCircle className="h-4 w-4" />
            {inviteError}
          </p>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 text-center">
          <p className="text-3xl font-bold text-white">{active.length}</p>
          <p className="mt-1 text-sm text-slate-400">Active Teachers</p>
        </div>
        <div className="glass-card rounded-2xl p-5 text-center">
          <p className="text-3xl font-bold text-amber-400">{pending.length}</p>
          <p className="mt-1 text-sm text-slate-400">Pending Invites</p>
        </div>
        <div className="glass-card rounded-2xl p-5 text-center">
          <p className="text-3xl font-bold text-red-400">{removed.length}</p>
          <p className="mt-1 text-sm text-slate-400">Removed</p>
        </div>
      </div>

      {/* Active teachers */}
      <div className="space-y-3">
        <h2 className="font-semibold text-white">Active Teachers</h2>
        {active.length === 0 ? (
          <div className="glass-card rounded-2xl px-6 py-10 text-center text-sm text-slate-500">
            No active teachers yet.
          </div>
        ) : (
          <div className="glass-card rounded-2xl divide-y divide-white/8 overflow-hidden">
            <div className="hidden grid-cols-[1fr_1fr_80px_80px_160px_56px] gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:grid">
              <span>Name</span>
              <span>Email</span>
              <span className="text-center">Classrooms</span>
              <span className="text-center">Students</span>
              <span>Accepted</span>
              <span></span>
            </div>
            {active.map((t) => (
              <div
                key={t.orgTeacherId}
                className="grid grid-cols-1 gap-2 px-6 py-4 sm:grid-cols-[1fr_1fr_80px_80px_160px_56px] sm:items-center sm:gap-4"
              >
                <p className="text-sm font-medium text-white">{t.name}</p>
                <p className="text-sm text-slate-400 truncate">{t.email}</p>
                <p className="text-center text-sm text-white">{t.classroomCount}</p>
                <p className="text-center text-sm text-white">{t.studentCount}</p>
                <p className="text-xs text-slate-500">
                  {t.acceptedAt ? new Date(t.acceptedAt).toLocaleDateString() : "—"}
                </p>
                <div className="flex justify-end">
                  <button
                    onClick={() => handleRemove(t.orgTeacherId)}
                    disabled={removingId === t.orgTeacherId}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                  >
                    {removingId === t.orgTeacherId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending invites */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-white">Pending Invites</h2>
          <div className="glass-card rounded-2xl divide-y divide-white/8 overflow-hidden">
            {pending.map((t) => (
              <div key={t.orgTeacherId} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm text-white">{t.email}</p>
                  <p className="text-xs text-slate-500">
                    Invited {new Date(t.invitedAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass("PENDING")}`}>
                  Pending
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Removed teachers */}
      {removed.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-white">Removed Teachers</h2>
          <div className="glass-card rounded-2xl divide-y divide-white/8 overflow-hidden">
            {removed.map((t) => (
              <div key={t.orgTeacherId} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm text-white">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.email}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass("REMOVED")}`}>
                  Removed
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
