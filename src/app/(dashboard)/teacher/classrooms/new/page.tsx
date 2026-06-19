"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";
import Link from "next/link";

export default function NewClassroomPage() {
  const router = useRouter();
  const [name, setName]               = useState("");
  const [subject, setSubject]         = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Classroom name is required."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/classrooms", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: name.trim(), subject: subject.trim() || undefined, description: description.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to create classroom."); return; }
      router.push(`/teacher/classrooms/${json.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/teacher/classrooms"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Create Classroom</h1>
          <p className="text-sm text-slate-400">Set up a new classroom for your students.</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <span>✕</span> {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">
              Classroom name <span className="text-red-400">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Math Grade 10 — Section A"
              autoFocus
              className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Mathematics, Physics, History…"
              className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description for your classroom…"
              rows={3}
              className="input-glow w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 transition-all"
            />
          </div>

          <div className="rounded-xl border border-blue-500/15 bg-blue-500/5 px-4 py-3 text-sm text-slate-400">
            <p className="font-medium text-slate-300 mb-1">Join key</p>
            <p>A unique join key will be generated automatically. Share it with students so they can enroll.</p>
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="btn-gradient flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
            {loading ? "Creating…" : "Create Classroom"}
          </button>
        </form>
      </div>
    </div>
  );
}
