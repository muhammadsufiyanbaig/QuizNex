"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart2,
  BookOpen,
  Check,
  Copy,
  Edit2,
  Loader2,
  Trash2,
  Users,
  X,
  Archive,
  ArchiveRestore,
  RefreshCw,
  UserMinus,
  UserPlus,
  Mail,
} from "lucide-react";

type StudentRow = {
  id: string;
  name: string;
  email: string;
  joinedAt: Date;
  status: string;
  quizzesAttempted: number;
  averageScore: number | null;
};

type Classroom = {
  id: string;
  name: string;
  subject: string | null;
  description: string | null;
  joinKey: string;
  isArchived: boolean;
  createdAt: Date;
};

type AddResult = {
  added: string[];
  invited: string[];
  alreadyEnrolled: string[];
  notAStudent: string[];
  errors: string[];
};

export default function ClassroomDetailClient({
  classroom: initial,
  students: initialStudents,
  quizCount,
  totalAttempts,
}: {
  classroom: Classroom;
  students: StudentRow[];
  quizCount: number;
  totalAttempts: number;
}) {
  const router = useRouter();

  // ── Classroom state ───────────────────────────────────────────────────────
  const [classroom, setClassroom] = useState(initial);
  const [students, setStudents]   = useState(initialStudents);

  // ── Copy join key ─────────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false);

  function copyKey() {
    navigator.clipboard.writeText(classroom.joinKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Edit classroom ────────────────────────────────────────────────────────
  const [editing, setEditing]                         = useState(false);
  const [editName, setEditName]                       = useState(initial.name);
  const [editSubject, setEditSubject]                 = useState(initial.subject ?? "");
  const [editDescription, setEditDescription]         = useState(initial.description ?? "");
  const [saving, setSaving]                           = useState(false);
  const [editError, setEditError]                     = useState("");

  async function saveEdit() {
    if (!editName.trim()) { setEditError("Name is required."); return; }
    setEditError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/classrooms/${classroom.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:        editName.trim(),
          subject:     editSubject.trim() || null,
          description: editDescription.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setEditError(json.error ?? "Failed to save."); return; }
      setClassroom((c) => ({ ...c, name: json.name, subject: json.subject, description: json.description }));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  // ── Archive / Unarchive ───────────────────────────────────────────────────
  async function toggleArchive() {
    const res = await fetch(`/api/classrooms/${classroom.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ isArchived: !classroom.isArchived }),
    });
    if (res.ok) {
      setClassroom((c) => ({ ...c, isArchived: !c.isArchived }));
    }
  }

  // ── Delete classroom ──────────────────────────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteNameInput, setDeleteNameInput] = useState("");
  const [deleting, setDeleting]           = useState(false);
  const [deleteError, setDeleteError]     = useState("");

  function openDeleteConfirm() {
    setDeleteNameInput("");
    setDeleteError("");
    setConfirmDelete(true);
  }

  async function deleteClassroom() {
    if (deleteNameInput.trim() !== classroom.name) {
      setDeleteError("Classroom name does not match. Please try again.");
      return;
    }
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/classrooms/${classroom.id}`, { method: "DELETE" });
      if (res.ok) router.push("/teacher/classrooms");
      else setDeleteError("Failed to delete classroom. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  // ── Regenerate join key ───────────────────────────────────────────────────
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  async function regenerateKey() {
    setRegenerating(true);
    try {
      const res  = await fetch(`/api/classrooms/${classroom.id}/regenerate-key`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setClassroom((c) => ({ ...c, joinKey: json.joinKey }));
        setConfirmRegen(false);
      }
    } finally {
      setRegenerating(false);
    }
  }

  // ── Add / invite students by email ────────────────────────────────────────
  const [addEmailsText, setAddEmailsText] = useState("");
  const [addLoading, setAddLoading]       = useState(false);
  const [addError, setAddError]           = useState("");
  const [addResult, setAddResult]         = useState<AddResult | null>(null);

  async function handleAddStudents(e: React.FormEvent) {
    e.preventDefault();
    const raw    = addEmailsText.split(/[\n,]+/).map((e) => e.trim()).filter(Boolean);
    const emails = raw.filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (emails.length === 0) { setAddError("Enter at least one valid email address."); return; }
    setAddError("");
    setAddResult(null);
    setAddLoading(true);

    try {
      const res  = await fetch(`/api/classrooms/${classroom.id}/students`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ emails }),
      });
      const json = await res.json();
      if (!res.ok) { setAddError(json.error ?? "Failed to add students."); return; }
      setAddResult(json as AddResult);
      setAddEmailsText("");
      if (json.added.length > 0) {
        router.refresh(); // Re-fetch server component to get updated student list
      }
    } finally {
      setAddLoading(false);
    }
  }

  // ── Remove student ────────────────────────────────────────────────────────
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function removeStudent(studentId: string) {
    setRemovingId(studentId);
    try {
      const res = await fetch(`/api/classrooms/${classroom.id}/students/${studentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setStudents((prev) =>
          prev.map((s) => (s.id === studentId ? { ...s, status: "REMOVED" } : s))
        );
      }
    } finally {
      setRemovingId(null);
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const activeStudents  = students.filter((s) => s.status === "ACTIVE");
  const removedStudents = students.filter((s) => s.status !== "ACTIVE");

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          href="/teacher/classrooms"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <nav className="text-sm text-slate-500">
          <Link href="/teacher/classrooms" className="hover:text-slate-300 transition-colors">Classrooms</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-300">{classroom.name}</span>
        </nav>
      </div>

      {/* ── Header card ─────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6">
        {editing ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Classroom name</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
                className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Subject</label>
              <input
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                placeholder="Optional"
                className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
                placeholder="Optional"
                className="input-glow w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 transition-all"
              />
            </div>
            {editError && <p className="text-xs text-red-400">{editError}</p>}
            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                disabled={saving}
                className="btn-gradient flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setEditError("");
                  setEditName(classroom.name);
                  setEditSubject(classroom.subject ?? "");
                  setEditDescription(classroom.description ?? "");
                }}
                className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 ring-1 ring-indigo-500/25">
                <BookOpen className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-white">{classroom.name}</h1>
                  {classroom.isArchived && (
                    <span className="rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs text-slate-500 ring-1 ring-slate-500/20">
                      Archived
                    </span>
                  )}
                </div>
                {classroom.subject && <p className="mt-0.5 text-sm text-slate-400">{classroom.subject}</p>}
                {classroom.description && <p className="mt-1 text-sm text-slate-500">{classroom.description}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setEditing(true)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-400 hover:text-slate-200 transition-colors"
                title="Edit"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={toggleArchive}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-400 hover:text-amber-400 transition-colors"
                title={classroom.isArchived ? "Unarchive" : "Archive"}
              >
                {classroom.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              </button>
              <button
                onClick={openDeleteConfirm}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/20 text-red-400/60 hover:border-red-500/40 hover:text-red-400 transition-colors"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Delete confirmation ──────────────────────────────────────────── */}
      {confirmDelete && (
        <div className="glass-card rounded-2xl border border-red-500/30 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/15">
              <Trash2 className="h-4 w-4 text-red-400" />
            </div>
            <div>
              <p className="font-semibold text-white">Delete &ldquo;{classroom.name}&rdquo;?</p>
              <p className="text-sm text-slate-400 mt-0.5">This is permanent and cannot be undone.</p>
            </div>
          </div>

          {/* Impact summary */}
          <div className="rounded-xl bg-red-500/8 border border-red-500/20 px-4 py-3 space-y-1.5">
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">The following will be permanently deleted:</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { value: activeStudents.length, label: "Students" },
                { value: quizCount, label: "Quizzes" },
                { value: totalAttempts, label: "Attempts" },
              ].map(({ value, label }) => (
                <div key={label} className="rounded-lg bg-red-500/10 px-2 py-2">
                  <p className="text-base font-bold text-red-300">{value}</p>
                  <p className="text-[11px] text-red-400/80">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Type-to-confirm */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400">
              Type <span className="font-mono text-slate-200">{classroom.name}</span> to confirm:
            </label>
            <input
              value={deleteNameInput}
              onChange={(e) => { setDeleteNameInput(e.target.value); setDeleteError(""); }}
              onKeyDown={(e) => e.key === "Enter" && deleteClassroom()}
              autoFocus
              placeholder={classroom.name}
              className="input-glow w-full rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-sm text-white placeholder-slate-600 transition-all focus:border-red-500/40"
            />
            {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}
          </div>

          <div className="flex gap-3">
            <button
              onClick={deleteClassroom}
              disabled={deleting || deleteNameInput.trim() !== classroom.name}
              className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {deleting ? "Deleting…" : "Delete classroom"}
            </button>
            <button
              onClick={() => { setConfirmDelete(false); setDeleteNameInput(""); setDeleteError(""); }}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Join key ────────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">Join Key</h2>
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-xl border border-white/10 bg-white/3 px-4 py-3">
            <p className="font-mono text-xl font-bold tracking-widest text-white">{classroom.joinKey}</p>
          </div>
          <button
            onClick={copyKey}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200 transition-all"
            title="Copy key"
          >
            {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        {/* Regenerate key */}
        {!confirmRegen ? (
          <button
            onClick={() => setConfirmRegen(true)}
            className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 hover:text-amber-400 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Regenerate key
          </button>
        ) : (
          <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5">
            <p className="mb-2.5 text-xs text-amber-300">
              The old key will stop working immediately. Students who haven&apos;t joined yet will need the new key.
            </p>
            <div className="flex gap-2">
              <button
                onClick={regenerateKey}
                disabled={regenerating}
                className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/15 disabled:opacity-60 transition-all"
              >
                {regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {regenerating ? "Regenerating…" : "Yes, regenerate"}
              </button>
              <button
                onClick={() => setConfirmRegen(false)}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <p className="mt-2 text-xs text-slate-500">Share this key with students to let them join the classroom.</p>
      </div>

      {/* ── Quizzes quick link ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href={`/teacher/classrooms/${classroom.id}/quizzes`}
          className="glass-card flex items-center justify-between gap-4 rounded-2xl p-5 transition-all hover:border-white/15 hover:bg-white/5 group"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
              <BookOpen className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">Manage Quizzes</p>
              <p className="text-xs text-slate-500">Create, publish and run quizzes</p>
            </div>
          </div>
          <ArrowLeft className="h-4 w-4 rotate-180 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
        </Link>
        <Link
          href={`/teacher/classrooms/${classroom.id}/analytics`}
          className="glass-card flex items-center justify-between gap-4 rounded-2xl p-5 transition-all hover:border-white/15 hover:bg-white/5 group"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10">
              <BarChart2 className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">Analytics</p>
              <p className="text-xs text-slate-500">Classroom performance &amp; rankings</p>
            </div>
          </div>
          <ArrowLeft className="h-4 w-4 rotate-180 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
        </Link>
      </div>

      {/* ── Add / invite students ────────────────────────────────────────── */}
      {!classroom.isArchived && (
        <div className="glass-card rounded-2xl p-5">
          <div className="mb-3 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-300">Add Students</h2>
          </div>
          <p className="mb-3 text-xs text-slate-500">
            Enter email addresses (one per line or comma-separated). Registered students are added instantly; others receive an invitation email.
          </p>

          <form onSubmit={handleAddStudents} className="space-y-3">
            <textarea
              value={addEmailsText}
              onChange={(e) => setAddEmailsText(e.target.value)}
              placeholder={"student1@example.com\nstudent2@example.com"}
              rows={3}
              className="input-glow w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 transition-all"
            />
            {addError && (
              <p className="flex items-center gap-2 text-xs text-red-400">
                <span>✕</span> {addError}
              </p>
            )}
            <button
              type="submit"
              disabled={addLoading || !addEmailsText.trim()}
              className="btn-gradient flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {addLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {addLoading ? "Processing…" : "Add / Invite"}
            </button>
          </form>

          {/* Results */}
          {addResult && (
            <div className="mt-3 space-y-1.5 rounded-xl border border-white/8 bg-white/3 p-3.5 text-xs">
              {addResult.added.length > 0 && (
                <p className="text-green-400">
                  ✓ <span className="font-semibold">{addResult.added.length}</span> student{addResult.added.length !== 1 ? "s" : ""} added to classroom.
                </p>
              )}
              {addResult.invited.length > 0 && (
                <p className="text-blue-400">
                  ✉ <span className="font-semibold">{addResult.invited.length}</span> invitation{addResult.invited.length !== 1 ? "s" : ""} sent.
                </p>
              )}
              {addResult.alreadyEnrolled.length > 0 && (
                <p className="text-slate-400">
                  · <span className="font-semibold">{addResult.alreadyEnrolled.length}</span> already enrolled.
                </p>
              )}
              {addResult.notAStudent.length > 0 && (
                <p className="text-amber-400">
                  ⚠ <span className="font-semibold">{addResult.notAStudent.length}</span> skipped — registered as teacher/organization.
                </p>
              )}
              {addResult.errors.length > 0 && (
                <p className="text-red-400">
                  ✕ <span className="font-semibold">{addResult.errors.length}</span> failed to process.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Student list ─────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-slate-400" />
          <h2 className="font-semibold text-white">Students ({activeStudents.length})</h2>
        </div>

        {activeStudents.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <Users className="h-8 w-8 text-slate-600" />
            <p className="text-sm text-slate-500">No students have joined yet.</p>
            <p className="text-xs text-slate-600">Share the join key or invite students via email above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <span>Student</span>
              <span className="text-right">Attempts</span>
              <span className="text-right">Avg Score</span>
              <span />
            </div>

            {activeStudents.map((s) => (
              <div
                key={s.id}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-3"
              >
                {/* Identity */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-blue-700/20 text-sm font-semibold text-blue-300 ring-1 ring-white/10">
                    {s.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{s.name}</p>
                    <p className="truncate text-xs text-slate-500">{s.email}</p>
                    <p className="text-xs text-slate-600">Joined {new Date(s.joinedAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Attempts */}
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{s.quizzesAttempted}</p>
                  <p className="text-xs text-slate-600">attempts</p>
                </div>

                {/* Average score */}
                <div className="text-right">
                  <p className="text-sm font-medium text-white">
                    {s.averageScore !== null ? `${s.averageScore.toFixed(1)}` : "—"}
                  </p>
                  <p className="text-xs text-slate-600">avg score</p>
                </div>

                {/* Remove */}
                {!classroom.isArchived && (
                  <button
                    onClick={() => removeStudent(s.id)}
                    disabled={removingId === s.id}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-500/15 text-red-400/50 hover:border-red-500/40 hover:text-red-400 disabled:opacity-40 transition-all"
                    title="Remove student"
                  >
                    {removingId === s.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserMinus className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Removed students */}
        {removedStudents.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-400 transition-colors">
              {removedStudents.length} removed student{removedStudents.length !== 1 ? "s" : ""}
            </summary>
            <div className="mt-2 space-y-2">
              {removedStudents.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/2 px-4 py-3 opacity-50">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-500/10 text-sm font-semibold text-slate-500">
                    {s.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-400">{s.name}</p>
                    <p className="truncate text-xs text-slate-600">{s.email}</p>
                  </div>
                  <span className="text-xs text-slate-600">{s.quizzesAttempted} attempts</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
