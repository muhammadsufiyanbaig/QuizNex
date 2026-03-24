"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  BookOpen,
  Clock,
  BarChart2,
  Calendar,
  Shuffle,
  Eye,
  RefreshCw,
} from "lucide-react";

type QuizType = "MCQ" | "QA" | "MIXED";

const QUIZ_TYPES: { value: QuizType; label: string; desc: string }[] = [
  { value: "MCQ",   label: "Multiple Choice",     desc: "Auto-graded questions with option choices" },
  { value: "QA",    label: "Written Answer",       desc: "Open-ended questions graded manually" },
  { value: "MIXED", label: "Mixed",                desc: "Combination of MCQ and written questions" },
];

export default function NewQuizForm({
  classroomId,
  classroomName,
}: {
  classroomId: string;
  classroomName: string;
}) {
  const router = useRouter();

  const [title, setTitle]                     = useState("");
  const [description, setDescription]         = useState("");
  const [type, setType]                       = useState<QuizType>("MCQ");
  const [totalMarks, setTotalMarks]           = useState(10);
  const [timeLimitMins, setTimeLimitMins]     = useState(30);
  const [scheduledAt, setScheduledAt]         = useState("");
  const [maxAttempts, setMaxAttempts]         = useState(1);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions]   = useState(false);
  const [showResults, setShowResults]         = useState(true);

  const [submitting, setSubmitting]           = useState(false);
  const [error, setError]                     = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/quizzes", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classroomId,
          title: title.trim(),
          description: description.trim() || undefined,
          type,
          totalMarks,
          timeLimitMins,
          scheduledAt: scheduledAt || undefined,
          maxAttempts,
          shuffleQuestions,
          shuffleOptions,
          showResults,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to create quiz"); return; }
      router.push(`/teacher/classrooms/${classroomId}/quizzes/${json.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/teacher/classrooms/${classroomId}/quizzes`}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs text-slate-500">{classroomName} / Quizzes</p>
          <h1 className="text-xl font-bold text-white">New Quiz</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-400" />
            Basic Information
          </h2>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">Quiz Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 3 — Newton's Laws"
              maxLength={255}
              className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-blue-500/60"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional instructions or context for students…"
              rows={3}
              maxLength={1000}
              className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-blue-500/60 resize-none"
            />
          </div>

          {/* Quiz Type */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">Quiz Type *</label>
            <div className="grid grid-cols-3 gap-2">
              {QUIZ_TYPES.map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    type === value
                      ? "border-blue-500/50 bg-blue-500/10 text-white"
                      : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20"
                  }`}
                >
                  <div className="text-sm font-semibold">{label}</div>
                  <div className="mt-0.5 text-[10px] opacity-70">{desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scoring & Time */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-blue-400" />
            Scoring & Time
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 flex items-center gap-1">
                <BarChart2 className="h-3 w-3" /> Total Marks *
              </label>
              <input
                type="number"
                min={1}
                value={totalMarks}
                onChange={(e) => setTotalMarks(Math.max(1, Number(e.target.value)))}
                className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-blue-500/60"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Time Limit (minutes) *
              </label>
              <input
                type="number"
                min={1}
                max={360}
                value={timeLimitMins}
                onChange={(e) => setTimeLimitMins(Math.max(1, Math.min(360, Number(e.target.value))))}
                className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-blue-500/60"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 flex items-center gap-1">
                <RefreshCw className="h-3 w-3" /> Max Attempts
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Math.max(1, Math.min(10, Number(e.target.value))))}
                className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-blue-500/60"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Scheduled At
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-blue-500/60"
              />
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="glass-card rounded-2xl p-6 space-y-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Shuffle className="h-4 w-4 text-blue-400" />
            Options
          </h2>
          {[
            { key: "shuffleQuestions", label: "Shuffle question order",     val: shuffleQuestions, set: setShuffleQuestions },
            { key: "shuffleOptions",   label: "Shuffle MCQ option order",   val: shuffleOptions,   set: setShuffleOptions },
            { key: "showResults",      label: "Show results to students after submission", val: showResults, set: setShowResults },
          ].map(({ key, label, val, set }) => (
            <label key={key} className="flex cursor-pointer items-center justify-between rounded-xl border border-white/8 bg-white/3 px-4 py-3 hover:bg-white/5 transition-colors">
              <span className="text-sm text-slate-300">{label}</span>
              <button
                type="button"
                role="switch"
                aria-checked={val}
                onClick={() => set(!val)}
                className={`relative h-5 w-9 rounded-full transition-colors ${val ? "bg-blue-500" : "bg-white/15"}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${val ? "left-[18px]" : "left-0.5"}`} />
              </button>
            </label>
          ))}
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link
            href={`/teacher/classrooms/${classroomId}/quizzes`}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-center text-sm font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="btn-gradient flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {submitting ? "Creating…" : "Create & Add Questions"}
          </button>
        </div>
      </form>
    </div>
  );
}
