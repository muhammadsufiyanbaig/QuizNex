"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit2,
  Eye,
  EyeOff,
  ImageIcon,
  Loader2,
  Plus,
  PlayCircle,
  RefreshCw,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  X,
  AlertTriangle,
  Archive,
  Circle,
  FileEdit,
  BarChart2,
  ClipboardCheck,
  GripVertical,
  RotateCcw,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type OptionData = { id: string; text: string; isCorrect: boolean };
type QuestionData = {
  id:          string;
  quizId:      string;
  text:        string;
  type:        "MCQ" | "QA";
  marks:       number;
  order:       number;
  imageUrl:    string | null;
  modelAnswer: string | null;
  options:     OptionData[];
  createdAt:   Date;
};
type QuizData = {
  id:               string;
  classroomId:      string;
  title:            string;
  description:      string | null;
  type:             "MCQ" | "QA" | "MIXED";
  status:           "DRAFT" | "PUBLISHED" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  totalMarks:       number;
  timeLimitMins:    number;
  scheduledAt:      Date | null;
  maxAttempts:      number;
  shuffleQuestions: boolean;
  shuffleOptions:   boolean;
  showResults:      boolean;
  displayOrder:     number;
  createdAt:        Date;
  updatedAt:        Date;
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: "Draft",     color: "text-slate-400 bg-slate-500/15 border-slate-500/30" },
  PUBLISHED: { label: "Published", color: "text-blue-400 bg-blue-500/15 border-blue-500/30" },
  ACTIVE:    { label: "Active",    color: "text-green-400 bg-green-500/15 border-green-500/30" },
  COMPLETED: { label: "Completed", color: "text-purple-400 bg-purple-500/15 border-purple-500/30" },
  ARCHIVED:  { label: "Archived",  color: "text-slate-500 bg-slate-600/15 border-slate-600/30" },
};

const BLANK_MCQ_OPTIONS = [
  { text: "", isCorrect: true },
  { text: "", isCorrect: false },
  { text: "", isCorrect: false },
  { text: "", isCorrect: false },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function QuizEditorClient({
  quiz:             initialQuiz,
  questions:        initialQuestions,
  classroomId,
  classroomName,
}: {
  quiz:          QuizData;
  questions:     QuestionData[];
  classroomId:   string;
  classroomName: string;
}) {
  const router = useRouter();

  const [quiz, setQuiz]           = useState(initialQuiz);
  const [questions, setQuestions] = useState(initialQuestions);
  const [tab, setTab]             = useState<"questions" | "settings">("questions");

  const isLocked = quiz.status === "ACTIVE" || quiz.status === "COMPLETED" || quiz.status === "ARCHIVED";

  // ── Settings form ─────────────────────────────────────────────────────────
  const [sf, setSf] = useState({
    title:            initialQuiz.title,
    description:      initialQuiz.description ?? "",
    totalMarks:       initialQuiz.totalMarks,
    timeLimitMins:    initialQuiz.timeLimitMins,
    scheduledAt:      initialQuiz.scheduledAt
      ? new Date(initialQuiz.scheduledAt).toISOString().slice(0, 16)
      : "",
    maxAttempts:      initialQuiz.maxAttempts,
    shuffleQuestions: initialQuiz.shuffleQuestions,
    shuffleOptions:   initialQuiz.shuffleOptions,
    showResults:      initialQuiz.showResults,
  });
  const [sfSaving, setSfSaving]     = useState(false);
  const [sfError, setSfError]       = useState("");
  const [sfSuccess, setSfSuccess]   = useState(false);

  async function saveSettings() {
    setSfSaving(true); setSfError(""); setSfSuccess(false);
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:            sf.title.trim(),
          description:      sf.description.trim() || undefined,
          totalMarks:       sf.totalMarks,
          timeLimitMins:    sf.timeLimitMins,
          scheduledAt:      sf.scheduledAt ? new Date(sf.scheduledAt).toISOString() : undefined,
          maxAttempts:      sf.maxAttempts,
          shuffleQuestions: sf.shuffleQuestions,
          shuffleOptions:   sf.shuffleOptions,
          showResults:      sf.showResults,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setSfError(json.error ?? "Failed to save"); return; }
      setQuiz((q) => ({ ...q, ...json }));
      setSfSuccess(true);
      setTimeout(() => setSfSuccess(false), 2500);
    } catch {
      setSfError("Network error.");
    } finally {
      setSfSaving(false);
    }
  }

  // ── Status ────────────────────────────────────────────────────────────────
  const [statusChanging, setStatusChanging] = useState(false);
  const [statusError, setStatusError]       = useState("");
  const [confirmStop, setConfirmStop]       = useState(false);

  async function changeStatus(newStatus: string) {
    setStatusChanging(true); setStatusError("");
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/status`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) { setStatusError(json.error ?? "Failed to update status"); return; }
      setQuiz((q) => ({ ...q, status: json.status }));
      setConfirmStop(false);
    } catch {
      setStatusError("Network error.");
    } finally {
      setStatusChanging(false);
    }
  }

  // ── Delete quiz ───────────────────────────────────────────────────────────
  const [confirmDelete, setConfirmDelete]   = useState(false);
  const [deleting, setDeleting]             = useState(false);

  async function deleteQuiz() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}`, { method: "DELETE" });
      if (!res.ok) { setDeleting(false); return; }
      router.push(`/teacher/classrooms/${classroomId}/quizzes`);
    } catch {
      setDeleting(false);
    }
  }

  // ── Add Question form ─────────────────────────────────────────────────────
  const [showAdd, setShowAdd]           = useState(false);
  const [addType, setAddType]           = useState<"MCQ" | "QA">(
    quiz.type === "QA" ? "QA" : "MCQ"
  );
  const [addText, setAddText]           = useState("");
  const [addMarks, setAddMarks]         = useState(1);
  const [addImageUrl, setAddImageUrl]   = useState("");
  const [addModelAnswer, setAddModelAnswer] = useState("");
  const [addOptions, setAddOptions]     = useState(BLANK_MCQ_OPTIONS.map((o) => ({ ...o })));
  const [adding, setAdding]             = useState(false);
  const [addError, setAddError]         = useState("");

  function resetAddForm() {
    setAddText(""); setAddMarks(1); setAddImageUrl(""); setAddModelAnswer("");
    setAddOptions(BLANK_MCQ_OPTIONS.map((o) => ({ ...o })));
    setAddError("");
  }

  async function submitAdd() {
    if (!addText.trim()) { setAddError("Question text is required"); return; }
    if (addType === "MCQ") {
      const filled = addOptions.filter((o) => o.text.trim());
      if (filled.length < 2) { setAddError("Add at least 2 options"); return; }
      if (!filled.some((o) => o.isCorrect)) { setAddError("Mark at least one option as correct"); return; }
    }
    setAdding(true); setAddError("");
    try {
      const body: Record<string, unknown> = {
        type:   addType,
        text:   addText.trim(),
        marks:  addMarks,
        order:  questions.length,
        ...(addImageUrl.trim() && { imageUrl: addImageUrl.trim() }),
        ...(addType === "QA" && addModelAnswer.trim() && { modelAnswer: addModelAnswer.trim() }),
        ...(addType === "MCQ" && {
          options: addOptions
            .filter((o) => o.text.trim())
            .map((o) => ({ text: o.text.trim(), isCorrect: o.isCorrect })),
        }),
      };
      const res = await fetch(`/api/quizzes/${quiz.id}/questions`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setAddError(json.error ?? "Failed to add question"); return; }
      setQuestions((prev) => [...prev, json]);
      resetAddForm();
      setShowAdd(false);
    } catch {
      setAddError("Network error.");
    } finally {
      setAdding(false);
    }
  }

  // ── Edit Question ─────────────────────────────────────────────────────────
  const [editingId, setEditingId]             = useState<string | null>(null);
  const [editText, setEditText]               = useState("");
  const [editMarks, setEditMarks]             = useState(1);
  const [editImageUrl, setEditImageUrl]       = useState("");
  const [editModelAnswer, setEditModelAnswer] = useState("");
  const [editOptions, setEditOptions]         = useState(BLANK_MCQ_OPTIONS.map((o) => ({ ...o })));
  const [editSaving, setEditSaving]           = useState(false);
  const [editError, setEditError]             = useState("");

  function startEdit(q: QuestionData) {
    setEditingId(q.id);
    setEditText(q.text);
    setEditMarks(q.marks);
    setEditImageUrl(q.imageUrl ?? "");
    setEditModelAnswer(q.modelAnswer ?? "");
    setEditOptions(
      q.type === "MCQ" && q.options.length > 0
        ? q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect }))
        : BLANK_MCQ_OPTIONS.map((o) => ({ ...o }))
    );
    setEditError("");
  }

  function cancelEdit() {
    setEditingId(null); setEditError("");
  }

  async function submitEdit(q: QuestionData) {
    if (!editText.trim()) { setEditError("Question text is required"); return; }
    if (q.type === "MCQ") {
      const filled = editOptions.filter((o) => o.text.trim());
      if (filled.length < 2) { setEditError("Add at least 2 options"); return; }
      if (!filled.some((o) => o.isCorrect)) { setEditError("Mark at least one correct option"); return; }
    }
    setEditSaving(true); setEditError("");
    try {
      const body: Record<string, unknown> = {
        type:  q.type,
        text:  editText.trim(),
        marks: editMarks,
        ...(editImageUrl.trim() && { imageUrl: editImageUrl.trim() }),
        ...(q.type === "QA" && { modelAnswer: editModelAnswer.trim() }),
        ...(q.type === "MCQ" && {
          options: editOptions
            .filter((o) => o.text.trim())
            .map((o) => ({ text: o.text.trim(), isCorrect: o.isCorrect })),
        }),
      };
      const res = await fetch(`/api/questions/${q.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setEditError(json.error ?? "Failed to save"); return; }
      setQuestions((prev) => prev.map((item) => (item.id === q.id ? { ...item, ...json } : item)));
      setEditingId(null);
    } catch {
      setEditError("Network error.");
    } finally {
      setEditSaving(false);
    }
  }

  // ── Delete Question ───────────────────────────────────────────────────────
  const [deletingQId, setDeletingQId] = useState<string | null>(null);

  async function deleteQuestion(q: QuestionData) {
    setDeletingQId(q.id);
    try {
      const res = await fetch(`/api/questions/${q.id}`, { method: "DELETE" });
      if (!res.ok) return;
      setQuestions((prev) =>
        prev
          .filter((item) => item.id !== q.id)
          .map((item, idx) => ({ ...item, order: idx }))
      );
    } finally {
      setDeletingQId(null);
    }
  }

  // ── Reorder (arrows + drag-and-drop) ─────────────────────────────────────
  const [reordering, setReordering]   = useState(false);
  const [draggedIdx, setDraggedIdx]   = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  async function applyReorder(reordered: QuestionData[]) {
    const renumbered = reordered.map((q, i) => ({ ...q, order: i }));
    setQuestions(renumbered);
    setReordering(true);
    try {
      await fetch(`/api/quizzes/${quiz.id}/questions/reorder`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: renumbered.map((q) => ({ id: q.id, order: q.order })),
        }),
      });
    } finally {
      setReordering(false);
    }
  }

  async function moveQuestion(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    [next[idx], next[target]] = [next[target], next[idx]];
    await applyReorder(next);
  }

  // ─────────────────────────────────────────────────────────────────────────
  const meta = STATUS_META[quiz.status];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/teacher/classrooms/${classroomId}/quizzes`}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-xs text-slate-500">{classroomName} / Quizzes</p>
            <h1 className="text-xl font-bold text-white">{quiz.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${meta.color}`}>
            {meta.label}
          </span>
          <span className="text-xs text-slate-500">{quiz.type}</span>
          {(quiz.status === "ACTIVE" || quiz.status === "COMPLETED") && (
            <Link
              href={`/teacher/classrooms/${classroomId}/quizzes/${quiz.id}/analytics`}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/8 px-3 py-1.5 text-xs font-medium text-indigo-400 hover:bg-indigo-500/15 transition-colors"
            >
              <BarChart2 className="h-3.5 w-3.5" /> Analytics
            </Link>
          )}
          {(quiz.status === "ACTIVE" || quiz.status === "COMPLETED") &&
            (quiz.type === "QA" || quiz.type === "MIXED") && (
            <Link
              href={`/teacher/classrooms/${classroomId}/quizzes/${quiz.id}/grade`}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/15 transition-colors"
            >
              <ClipboardCheck className="h-3.5 w-3.5" /> Grade
            </Link>
          )}
          {(quiz.status === "ACTIVE" || quiz.status === "COMPLETED") && (
            <Link
              href={`/teacher/classrooms/${classroomId}/quizzes/${quiz.id}/requiz-requests`}
              className="flex items-center gap-1.5 rounded-lg border border-violet-500/20 bg-violet-500/8 px-3 py-1.5 text-xs font-medium text-violet-400 hover:bg-violet-500/15 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Re-quiz
            </Link>
          )}
        </div>
      </div>

      {/* Status error */}
      {statusError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <X className="h-4 w-4 shrink-0" />
          {statusError}
          <button onClick={() => setStatusError("")} className="ml-auto text-red-400/60 hover:text-red-400"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Status controls */}
      {!isLocked && (
        <div className="glass-card rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            {quiz.status === "DRAFT"     && "Add questions, then publish when ready."}
            {quiz.status === "PUBLISHED" && "Quiz is visible. Start when students are ready."}
          </span>
          <div className="flex items-center gap-2">
            {quiz.status === "DRAFT" && (
              <>
                <button
                  onClick={() => changeStatus("PUBLISHED")}
                  disabled={statusChanging}
                  className="btn-gradient flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {statusChanging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Publish
                </button>
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-red-400">Confirm?</span>
                    <button
                      onClick={deleteQuiz}
                      disabled={deleting}
                      className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
                    >
                      {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Yes, delete"}
                    </button>
                    <button onClick={() => setConfirmDelete(false)} className="text-xs text-slate-400 hover:text-white px-1">Cancel</button>
                  </div>
                )}
              </>
            )}
            {quiz.status === "PUBLISHED" && (
              <>
                <button
                  onClick={() => changeStatus("DRAFT")}
                  disabled={statusChanging}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors disabled:opacity-60"
                >
                  <FileEdit className="h-3.5 w-3.5" /> Unpublish
                </button>
                <button
                  onClick={() => changeStatus("ACTIVE")}
                  disabled={statusChanging}
                  className="btn-gradient flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {statusChanging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
                  Start Quiz
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {quiz.status === "ACTIVE" && (
        <div className="glass-card rounded-xl border-green-500/20 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-green-400">
            <PlayCircle className="h-4 w-4" />
            <span className="text-sm font-semibold">Quiz is live</span>
          </div>
          {!confirmStop ? (
            <button
              onClick={() => setConfirmStop(true)}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <AlertTriangle className="h-3.5 w-3.5" /> Stop Quiz
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400">Auto-submit all attempts?</span>
              <button
                onClick={() => changeStatus("COMPLETED")}
                disabled={statusChanging}
                className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {statusChanging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm Stop"}
              </button>
              <button onClick={() => setConfirmStop(false)} className="text-xs text-slate-400 hover:text-white">Cancel</button>
            </div>
          )}
        </div>
      )}

      {quiz.status === "COMPLETED" && (
        <div className="glass-card rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-purple-400">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-semibold">Quiz completed</span>
          </div>
          <button
            onClick={() => changeStatus("ARCHIVED")}
            disabled={statusChanging}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors disabled:opacity-60"
          >
            {statusChanging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
            Archive
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-white/10 bg-white/3 p-1">
        {(["questions", "settings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === t ? "bg-blue-500/20 text-blue-300" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {t === "questions" ? <BookOpen className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
            {t === "questions" ? `Questions (${questions.length})` : "Settings"}
          </button>
        ))}
      </div>

      {/* ── Questions Tab ───────────────────────────────────────────────────── */}
      {tab === "questions" && (
        <div className="space-y-3">
          {/* Questions tab action bar */}
          {!isLocked && (questions.length > 0 || showAdd) && (
            <div className="flex items-center justify-end gap-2">
              <Link
                href={`/teacher/classrooms/${classroomId}/quizzes/${quiz.id}/ai-generate`}
                className="flex items-center gap-1.5 rounded-xl border border-purple-500/20 bg-purple-500/8 px-3 py-2 text-sm font-medium text-purple-400 hover:bg-purple-500/15 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                AI Generate
              </Link>
            </div>
          )}

          {questions.length === 0 && !showAdd && (
            <div className="glass-card rounded-2xl p-10 text-center">
              <div className="mb-3 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10">
                  <BookOpen className="h-6 w-6 text-blue-400" />
                </div>
              </div>
              <p className="mb-4 text-sm text-slate-400">No questions yet. Add your first question.</p>
              {!isLocked && (
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setShowAdd(true)}
                    className="btn-gradient inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    <Plus className="h-4 w-4" /> Add Question
                  </button>
                  <Link
                    href={`/teacher/classrooms/${classroomId}/quizzes/${quiz.id}/ai-generate`}
                    className="inline-flex items-center gap-2 rounded-xl border border-purple-500/20 bg-purple-500/8 px-5 py-2.5 text-sm font-semibold text-purple-400 hover:bg-purple-500/15 transition-colors"
                  >
                    <Sparkles className="h-4 w-4" /> AI Generate
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Question list */}
          {questions.map((q, idx) => (
            <div
              key={q.id}
              draggable={!isLocked && editingId !== q.id}
              onDragStart={() => { setDraggedIdx(idx); }}
              onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
              onDrop={() => {
                if (draggedIdx === null || draggedIdx === idx) { setDraggedIdx(null); setDragOverIdx(null); return; }
                const next = [...questions];
                const [moved] = next.splice(draggedIdx, 1);
                next.splice(idx, 0, moved);
                applyReorder(next);
                setDraggedIdx(null); setDragOverIdx(null);
              }}
              onDragEnd={() => { setDraggedIdx(null); setDragOverIdx(null); }}
              className={`glass-card rounded-xl overflow-hidden transition-all ${
                dragOverIdx === idx && draggedIdx !== idx ? "ring-2 ring-blue-500/50 scale-[1.01]" : ""
              } ${draggedIdx === idx ? "opacity-50" : ""}`}
            >
              {editingId === q.id ? (
                // ── Edit mode ───────────────────────────────────────────────
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-400">Editing Q{idx + 1} · {q.type}</span>
                    <button onClick={cancelEdit} className="text-slate-500 hover:text-white"><X className="h-4 w-4" /></button>
                  </div>

                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    placeholder="Question text…"
                    className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-600 resize-none"
                  />

                  <div className="flex gap-3">
                    <div className="space-y-1 flex-1">
                      <label className="text-xs text-slate-500">Marks</label>
                      <input
                        type="number"
                        min={1}
                        value={editMarks}
                        onChange={(e) => setEditMarks(Math.max(1, Number(e.target.value)))}
                        className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div className="space-y-1 flex-1">
                      <label className="text-xs text-slate-500">Image (optional)</label>
                      <ImageUploader value={editImageUrl} onChange={setEditImageUrl} />
                    </div>
                  </div>

                  {q.type === "QA" && (
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Model Answer (optional)</label>
                      <textarea
                        value={editModelAnswer}
                        onChange={(e) => setEditModelAnswer(e.target.value)}
                        rows={2}
                        placeholder="Expected answer…"
                        className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-600 resize-none"
                      />
                    </div>
                  )}

                  {q.type === "MCQ" && (
                    <OptionsEditor options={editOptions} onChange={setEditOptions} />
                  )}

                  {editError && <p className="text-xs text-red-400">{editError}</p>}

                  <div className="flex gap-2 justify-end">
                    <button onClick={cancelEdit} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-white">Cancel</button>
                    <button
                      onClick={() => submitEdit(q)}
                      disabled={editSaving}
                      className="btn-gradient flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {editSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                // ── View mode ───────────────────────────────────────────────
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Drag handle + reorder arrows */}
                    {!isLocked && (
                      <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
                        <GripVertical className="h-4 w-4 text-slate-600 cursor-grab active:cursor-grabbing mb-0.5" />
                        <button
                          onClick={() => moveQuestion(idx, -1)}
                          disabled={idx === 0 || reordering}
                          className="flex h-5 w-5 items-center justify-center rounded text-slate-600 hover:text-slate-300 disabled:opacity-30 transition-colors"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => moveQuestion(idx, 1)}
                          disabled={idx === questions.length - 1 || reordering}
                          className="flex h-5 w-5 items-center justify-center rounded text-slate-600 hover:text-slate-300 disabled:opacity-30 transition-colors"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-semibold text-slate-500">Q{idx + 1}</span>
                        <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${
                          q.type === "MCQ"
                            ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                            : "border-purple-500/30 bg-purple-500/10 text-purple-400"
                        }`}>
                          {q.type}
                        </span>
                        <span className="text-xs text-slate-500">{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
                      </div>
                      <p className="text-sm text-slate-200">{q.text}</p>

                      {q.type === "MCQ" && q.options.length > 0 && (
                        <div className="mt-2.5 space-y-1.5">
                          {q.options.map((o, oi) => (
                            <div
                              key={o.id}
                              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs ${
                                o.isCorrect
                                  ? "border border-green-500/25 bg-green-500/8 text-green-300"
                                  : "border border-white/8 bg-white/3 text-slate-400"
                              }`}
                            >
                              {o.isCorrect
                                ? <Check className="h-3 w-3 shrink-0 text-green-400" />
                                : <span className="h-3 w-3 shrink-0 rounded-full border border-slate-600" />
                              }
                              {o.text}
                            </div>
                          ))}
                        </div>
                      )}

                      {q.type === "QA" && q.modelAnswer && (
                        <p className="mt-2 text-xs text-slate-500 italic">Model answer: {q.modelAnswer}</p>
                      )}
                    </div>

                    {!isLocked && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEdit(q)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-white/5 hover:text-blue-400 transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteQuestion(q)}
                          disabled={deletingQId === q.id}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-40"
                        >
                          {deletingQId === q.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />
                          }
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add Question Form */}
          {showAdd && (
            <div className="glass-card rounded-xl p-4 space-y-3 border-blue-500/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Add Question</span>
                <button onClick={() => { setShowAdd(false); resetAddForm(); }} className="text-slate-500 hover:text-white"><X className="h-4 w-4" /></button>
              </div>

              {/* Question type selector (MIXED only) */}
              {quiz.type === "MIXED" && (
                <div className="flex gap-2">
                  {(["MCQ", "QA"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAddType(t)}
                      className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-colors ${
                        addType === t
                          ? "border-blue-500/50 bg-blue-500/10 text-white"
                          : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
                      }`}
                    >
                      {t === "MCQ" ? "Multiple Choice" : "Written Answer"}
                    </button>
                  ))}
                </div>
              )}

              <textarea
                value={addText}
                onChange={(e) => setAddText(e.target.value)}
                rows={3}
                placeholder="Question text…"
                className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-600 resize-none"
              />

              <div className="flex gap-3">
                <div className="space-y-1 flex-1">
                  <label className="text-xs text-slate-500">Marks</label>
                  <input
                    type="number"
                    min={1}
                    value={addMarks}
                    onChange={(e) => setAddMarks(Math.max(1, Number(e.target.value)))}
                    className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  />
                </div>
                <div className="space-y-1 flex-1">
                  <label className="text-xs text-slate-500">Image (optional)</label>
                  <ImageUploader value={addImageUrl} onChange={setAddImageUrl} />
                </div>
              </div>

              {addType === "QA" && (
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Model Answer (optional)</label>
                  <textarea
                    value={addModelAnswer}
                    onChange={(e) => setAddModelAnswer(e.target.value)}
                    rows={2}
                    placeholder="Expected answer…"
                    className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-600 resize-none"
                  />
                </div>
              )}

              {addType === "MCQ" && (
                <OptionsEditor options={addOptions} onChange={setAddOptions} />
              )}

              {addError && <p className="text-xs text-red-400">{addError}</p>}

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setShowAdd(false); resetAddForm(); }}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={submitAdd}
                  disabled={adding}
                  className="btn-gradient flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  {adding ? "Adding…" : "Add Question"}
                </button>
              </div>
            </div>
          )}

          {/* Add question button */}
          {!isLocked && !showAdd && questions.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowAdd(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 py-3 text-sm text-slate-500 hover:border-blue-500/40 hover:text-blue-400 transition-colors"
              >
                <Plus className="h-4 w-4" /> Add Question
              </button>
              <Link
                href={`/teacher/classrooms/${classroomId}/quizzes/${quiz.id}/ai-generate`}
                className="flex items-center gap-1.5 rounded-xl border border-purple-500/20 bg-purple-500/8 px-4 py-3 text-sm font-medium text-purple-400 hover:bg-purple-500/15 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                AI Generate
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── Settings Tab ────────────────────────────────────────────────────── */}
      {tab === "settings" && (
        <div className="glass-card rounded-2xl p-6 space-y-5">
          {isLocked && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Settings cannot be changed while the quiz is {quiz.status.toLowerCase()}.
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">Quiz Title</label>
            <input
              type="text"
              value={sf.title}
              onChange={(e) => setSf({ ...sf, title: e.target.value })}
              disabled={isLocked}
              maxLength={255}
              className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">Description</label>
            <textarea
              value={sf.description}
              onChange={(e) => setSf({ ...sf, description: e.target.value })}
              disabled={isLocked}
              rows={3}
              maxLength={1000}
              className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white disabled:opacity-50 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Total Marks</label>
              <input
                type="number"
                min={1}
                value={sf.totalMarks}
                onChange={(e) => setSf({ ...sf, totalMarks: Math.max(1, Number(e.target.value)) })}
                disabled={isLocked}
                className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white disabled:opacity-50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Time Limit (minutes)</label>
              <input
                type="number"
                min={1}
                max={360}
                value={sf.timeLimitMins}
                onChange={(e) => setSf({ ...sf, timeLimitMins: Math.max(1, Math.min(360, Number(e.target.value))) })}
                disabled={isLocked}
                className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white disabled:opacity-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Max Attempts</label>
              <input
                type="number"
                min={1}
                max={10}
                value={sf.maxAttempts}
                onChange={(e) => setSf({ ...sf, maxAttempts: Math.max(1, Math.min(10, Number(e.target.value))) })}
                disabled={isLocked}
                className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white disabled:opacity-50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Scheduled At</label>
              <input
                type="datetime-local"
                value={sf.scheduledAt}
                onChange={(e) => setSf({ ...sf, scheduledAt: e.target.value })}
                disabled={isLocked}
                className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white disabled:opacity-50"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-2">
            {[
              { key: "shuffleQuestions" as const, label: "Shuffle question order" },
              { key: "shuffleOptions"   as const, label: "Shuffle MCQ option order" },
              { key: "showResults"      as const, label: "Show results after submission" },
            ].map(({ key, label }) => (
              <label key={key} className={`flex cursor-pointer items-center justify-between rounded-xl border border-white/8 bg-white/3 px-4 py-3 hover:bg-white/5 transition-colors ${isLocked ? "opacity-50 pointer-events-none" : ""}`}>
                <span className="text-sm text-slate-300">{label}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={sf[key]}
                  onClick={() => !isLocked && setSf({ ...sf, [key]: !sf[key] })}
                  className={`relative h-5 w-9 rounded-full transition-colors ${sf[key] ? "bg-blue-500" : "bg-white/15"}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${sf[key] ? "left-[18px]" : "left-0.5"}`} />
                </button>
              </label>
            ))}
          </div>

          {sfError && <p className="text-sm text-red-400">{sfError}</p>}
          {sfSuccess && (
            <p className="flex items-center gap-1.5 text-sm text-green-400">
              <Check className="h-4 w-4" /> Saved
            </p>
          )}

          {!isLocked && (
            <button
              onClick={saveSettings}
              disabled={sfSaving}
              className="btn-gradient flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 disabled:opacity-60"
            >
              {sfSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {sfSaving ? "Saving…" : "Save Settings"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── OptionsEditor sub-component ───────────────────────────────────────────────

function OptionsEditor({
  options,
  onChange,
}: {
  options: { text: string; isCorrect: boolean }[];
  onChange: (opts: { text: string; isCorrect: boolean }[]) => void;
}) {
  function updateText(i: number, text: string) {
    const next = [...options];
    next[i] = { ...next[i], text };
    onChange(next);
  }

  function toggleCorrect(i: number) {
    const next = options.map((o, idx) => ({ ...o, isCorrect: idx === i }));
    onChange(next);
  }

  function addOption() {
    if (options.length >= 6) return;
    onChange([...options, { text: "", isCorrect: false }]);
  }

  function removeOption(i: number) {
    if (options.length <= 2) return;
    const next = options.filter((_, idx) => idx !== i);
    // Ensure at least one correct
    if (!next.some((o) => o.isCorrect)) next[0].isCorrect = true;
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <label className="text-xs text-slate-500">Options (click circle to mark correct)</label>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleCorrect(i)}
            className={`h-5 w-5 shrink-0 rounded-full border-2 transition-colors flex items-center justify-center ${
              opt.isCorrect
                ? "border-green-400 bg-green-500/20"
                : "border-slate-600 hover:border-slate-400"
            }`}
          >
            {opt.isCorrect && <span className="h-2 w-2 rounded-full bg-green-400" />}
          </button>
          <input
            type="text"
            value={opt.text}
            onChange={(e) => updateText(i, e.target.value)}
            placeholder={`Option ${i + 1}`}
            maxLength={500}
            className="input-glow flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-slate-600"
          />
          {options.length > 2 && (
            <button
              type="button"
              onClick={() => removeOption(i)}
              className="text-slate-600 hover:text-red-400 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      {options.length < 6 && (
        <button
          type="button"
          onClick={addOption}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-400 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add option
        </button>
      )}
    </div>
  );
}

// ── ImageUploader sub-component ───────────────────────────────────────────────

function ImageUploader({
  value,
  onChange,
}: {
  value:    string;
  onChange: (url: string) => void;
}) {
  const inputRef               = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState("");

  async function handleFile(file: File) {
    setError("");
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res  = await fetch("/api/upload/image", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Upload failed"); return; }
      onChange(json.url);
    } catch {
      setError("Upload failed. Try again.");
    } finally {
      setUploading(false);
      // Reset input so the same file can be re-selected after removal
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-1.5">
      {value ? (
        <div className="relative inline-block">
          <Image
            src={value}
            alt="Question image"
            width={200}
            height={120}
            className="rounded-lg border border-white/10 object-cover"
            unoptimized
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600 transition-colors"
            title="Remove image"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/3 px-3 py-2 text-xs text-slate-500 transition-colors hover:border-blue-500/40 hover:text-blue-400 disabled:opacity-60"
        >
          {uploading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Upload className="h-3.5 w-3.5" />
          }
          {uploading ? "Uploading…" : "Upload image"}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
