"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Sparkles,
  FileText,
  Plus,
  Check,
  X,
  Edit2,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ArrowLeft,
  Wand2,
} from "lucide-react";
import type { GeneratedQuestion } from "@/lib/ai/quiz-generator";

// ─── Types ────────────────────────────────────────────────────────────────────

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

type Props = {
  quiz: { id: string; title: string; type: "MCQ" | "QA" | "MIXED" };
  classroomId: string;
};

type EditState = {
  text: string;
  marks: number;
  modelAnswer?: string;
  options?: { text: string; isCorrect: boolean }[];
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AiGenerateClient({ quiz, classroomId }: Props) {
  // Tab state
  const [activeTab, setActiveTab] = useState<"topic" | "document">("topic");

  // Input state
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [quizType, setQuizType] = useState<"MCQ" | "QA" | "MIXED">(quiz.type);
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [error, setError] = useState("");

  // Question management state
  const [addingQuestions, setAddingQuestions] = useState<Set<number>>(new Set());
  const [addedQuestions, setAddedQuestions] = useState<Set<number>>(new Set());
  const [skippedQuestions, setSkippedQuestions] = useState<Set<number>>(new Set());

  // Refine state
  const [refineInput, setRefineInput] = useState("");
  const [refining, setRefining] = useState(false);

  // Edit state
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editQuestion, setEditQuestion] = useState<EditState | null>(null);

  // Conversation history visibility
  const [showHistory, setShowHistory] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Generate from topic ───────────────────────────────────────────────────

  async function handleGenerate() {
    if (!topic.trim()) {
      setError("Please enter a topic to generate questions.");
      return;
    }
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: quiz.id,
          topic: topic.trim(),
          quizType,
          count,
          difficulty,
          messages,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Generation failed");
      } else {
        setGeneratedQuestions(data.questions);
        setMessages(data.messages);
        setAddedQuestions(new Set());
        setSkippedQuestions(new Set());
        setEditingIdx(null);
        setEditQuestion(null);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  // ── Generate from document ────────────────────────────────────────────────

  async function handleDocumentGenerate() {
    if (!file) {
      setError("Please select a file.");
      return;
    }
    setGenerating(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("quizId", quiz.id);
      fd.append("quizType", quizType);
      fd.append("count", String(count));
      fd.append("difficulty", difficulty);

      const res = await fetch("/api/ai/generate-from-document", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Generation failed");
      } else {
        setGeneratedQuestions(data.questions);
        setMessages([]);
        setAddedQuestions(new Set());
        setSkippedQuestions(new Set());
        setEditingIdx(null);
        setEditQuestion(null);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  // ── Refine ────────────────────────────────────────────────────────────────

  async function handleRefine() {
    if (!refineInput.trim()) return;
    setRefining(true);
    setError("");
    try {
      const res = await fetch("/api/ai/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: quiz.id,
          instruction: refineInput.trim(),
          previousQuestions: generatedQuestions,
          quizType,
          count,
          messages,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Refinement failed");
      } else {
        setGeneratedQuestions(data.questions);
        setMessages(data.messages);
        setAddedQuestions(new Set());
        setSkippedQuestions(new Set());
        setRefineInput("");
        setEditingIdx(null);
        setEditQuestion(null);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setRefining(false);
    }
  }

  // ── Add single question ───────────────────────────────────────────────────

  const addQuestion = useCallback(
    async (idx: number, question: GeneratedQuestion) => {
      setAddingQuestions((prev) => new Set(prev).add(idx));
      try {
        let body: Record<string, unknown>;
        if (question.type === "MCQ") {
          body = {
            type: "MCQ",
            text: question.text,
            marks: question.marks,
            order: 0,
            options: question.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
          };
        } else {
          body = {
            type: "QA",
            text: question.text,
            marks: question.marks,
            order: 0,
            modelAnswer: question.modelAnswer,
          };
        }

        const res = await fetch(`/api/quizzes/${quiz.id}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          setAddedQuestions((prev) => new Set(prev).add(idx));
        } else {
          const data = await res.json();
          setError(data.error ?? "Failed to add question");
        }
      } catch {
        setError("Network error while adding question.");
      } finally {
        setAddingQuestions((prev) => {
          const next = new Set(prev);
          next.delete(idx);
          return next;
        });
      }
    },
    [quiz.id]
  );

  // ── Add all remaining ─────────────────────────────────────────────────────

  async function handleAddAll() {
    const remaining = generatedQuestions
      .map((q, i) => ({ q, i }))
      .filter(({ i }) => !skippedQuestions.has(i) && !addedQuestions.has(i));

    for (const { q, i } of remaining) {
      await addQuestion(i, q);
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  function startEdit(idx: number) {
    const q = generatedQuestions[idx];
    if (!q) return;
    if (q.type === "MCQ") {
      setEditQuestion({
        text: q.text,
        marks: q.marks,
        options: q.options.map((o) => ({ ...o })),
      });
    } else {
      setEditQuestion({
        text: q.text,
        marks: q.marks,
        modelAnswer: q.modelAnswer,
      });
    }
    setEditingIdx(idx);
  }

  function saveEdit() {
    if (editingIdx === null || !editQuestion) return;
    const original = generatedQuestions[editingIdx];
    if (!original) return;

    let updated: GeneratedQuestion;
    if (original.type === "MCQ") {
      updated = {
        type: "MCQ",
        text: editQuestion.text,
        marks: editQuestion.marks,
        options: (editQuestion.options ?? original.options).map((o) => ({
          text: o.text,
          isCorrect: o.isCorrect,
        })),
      };
    } else {
      updated = {
        type: "QA",
        text: editQuestion.text,
        marks: editQuestion.marks,
        modelAnswer: editQuestion.modelAnswer ?? original.modelAnswer,
      };
    }

    setGeneratedQuestions((prev) => {
      const next = [...prev];
      next[editingIdx] = updated;
      return next;
    });
    setEditingIdx(null);
    setEditQuestion(null);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const visibleQuestions = generatedQuestions.filter((_, i) => !skippedQuestions.has(i));
  const remainingCount = generatedQuestions.filter(
    (_, i) => !skippedQuestions.has(i) && !addedQuestions.has(i)
  ).length;

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/teacher/classrooms/${classroomId}/quizzes/${quiz.id}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <h1 className="text-xl font-bold gradient-text">AI Question Generator</h1>
          </div>
          <p className="text-xs text-slate-500">{quiz.title}</p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <X className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError("")} className="text-red-400/60 hover:text-red-400">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Generation Panel */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-white/10 bg-white/3 p-1">
          <button
            onClick={() => setActiveTab("topic")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
              activeTab === "topic"
                ? "bg-purple-500/20 text-purple-300"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            By Topic
          </button>
          <button
            onClick={() => setActiveTab("document")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
              activeTab === "document"
                ? "bg-purple-500/20 text-purple-300"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <FileText className="h-4 w-4" />
            From Document
          </button>
        </div>

        {/* Topic Tab */}
        {activeTab === "topic" && (
          <div className="space-y-4">
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={3}
              placeholder="e.g., Newton's Laws of Motion, World War II causes"
              className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 resize-none"
            />

            <ControlsRow
              quizType={quizType}
              setQuizType={setQuizType}
              count={count}
              setCount={setCount}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
            />

            <button
              onClick={handleGenerate}
              disabled={generating || !topic.trim()}
              className="btn-gradient flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Generate Questions
                </>
              )}
            </button>
          </div>
        )}

        {/* Document Tab */}
        {activeTab === "document" && (
          <div className="space-y-4">
            {/* File drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-xl border-2 border-dashed border-white/15 bg-white/3 px-6 py-8 text-center transition-colors hover:border-purple-500/40 hover:bg-purple-500/5"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.ppt,.pptx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFile(f);
                }}
              />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm text-purple-300">
                  <FileText className="h-5 w-5" />
                  <span className="font-medium">{file.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <FileText className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                  <p className="text-sm text-slate-400">
                    Click to upload or drag &amp; drop
                  </p>
                  <p className="mt-1 text-xs text-slate-600">PDF, DOCX, TXT, PPT · Max 20MB</p>
                </>
              )}
            </div>

            <ControlsRow
              quizType={quizType}
              setQuizType={setQuizType}
              count={count}
              setCount={setCount}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
            />

            <button
              onClick={handleDocumentGenerate}
              disabled={generating || !file}
              className="btn-gradient flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Upload &amp; Generate
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Results Panel */}
      {generatedQuestions.length > 0 && (
        <div className="space-y-3">
          {/* Results header */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">
              {visibleQuestions.length} question{visibleQuestions.length !== 1 ? "s" : ""} generated
            </span>
            {remainingCount > 0 && (
              <button
                onClick={handleAddAll}
                disabled={generating || refining}
                className="flex items-center gap-1.5 rounded-xl border border-green-500/20 bg-green-500/8 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/15 transition-colors disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add All Remaining ({remainingCount})
              </button>
            )}
          </div>

          {/* Refine row */}
          <div className="flex gap-2">
            <input
              type="text"
              value={refineInput}
              onChange={(e) => setRefineInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !refining && handleRefine()}
              placeholder="Refine these questions… (e.g., make them harder, focus on key concepts)"
              className="input-glow flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-slate-600"
            />
            <button
              onClick={handleRefine}
              disabled={refining || !refineInput.trim()}
              className="flex items-center gap-1.5 rounded-xl border border-purple-500/20 bg-purple-500/8 px-3 py-2 text-sm font-medium text-purple-400 hover:bg-purple-500/15 transition-colors disabled:opacity-50"
            >
              {refining ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refine
            </button>
          </div>

          {/* Question cards */}
          {generatedQuestions.map((q, idx) => {
            if (skippedQuestions.has(idx)) return null;

            const isAdded = addedQuestions.has(idx);
            const isAdding = addingQuestions.has(idx);
            const isEditing = editingIdx === idx;

            return (
              <div
                key={idx}
                className="glass-card rounded-xl overflow-hidden"
              >
                {isEditing && editQuestion ? (
                  // Edit mode
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-purple-400">
                        Editing Q{idx + 1} · {q.type}
                      </span>
                      <button
                        onClick={() => { setEditingIdx(null); setEditQuestion(null); }}
                        className="text-slate-500 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <textarea
                      value={editQuestion.text}
                      onChange={(e) => setEditQuestion((prev) => prev ? { ...prev, text: e.target.value } : prev)}
                      rows={3}
                      placeholder="Question text…"
                      className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-600 resize-none"
                    />

                    <div className="flex gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500">Marks</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={editQuestion.marks}
                          onChange={(e) =>
                            setEditQuestion((prev) =>
                              prev ? { ...prev, marks: Math.max(1, Math.min(10, Number(e.target.value))) } : prev
                            )
                          }
                          className="input-glow w-24 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                        />
                      </div>
                    </div>

                    {q.type === "QA" && (
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500">Model Answer</label>
                        <textarea
                          value={editQuestion.modelAnswer ?? ""}
                          onChange={(e) =>
                            setEditQuestion((prev) =>
                              prev ? { ...prev, modelAnswer: e.target.value } : prev
                            )
                          }
                          rows={3}
                          className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white resize-none"
                        />
                      </div>
                    )}

                    {q.type === "MCQ" && editQuestion.options && (
                      <div className="space-y-2">
                        <label className="text-xs text-slate-500">Options</label>
                        {editQuestion.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setEditQuestion((prev) => {
                                  if (!prev?.options) return prev;
                                  const next = prev.options.map((o, i) => ({
                                    ...o,
                                    isCorrect: i === oi,
                                  }));
                                  return { ...prev, options: next };
                                })
                              }
                              className={`h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
                                opt.isCorrect
                                  ? "border-green-400 bg-green-500/20"
                                  : "border-slate-600 hover:border-slate-400"
                              }`}
                            >
                              {opt.isCorrect && (
                                <span className="h-2 w-2 rounded-full bg-green-400" />
                              )}
                            </button>
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) =>
                                setEditQuestion((prev) => {
                                  if (!prev?.options) return prev;
                                  const next = [...prev.options];
                                  next[oi] = { ...next[oi], text: e.target.value };
                                  return { ...prev, options: next };
                                })
                              }
                              className="input-glow flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setEditingIdx(null); setEditQuestion(null); }}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveEdit}
                        className="btn-gradient flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className="p-4">
                    {/* Question header */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500">Q{idx + 1}</span>
                        <span
                          className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${
                            q.type === "MCQ"
                              ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                              : "border-purple-500/30 bg-purple-500/10 text-purple-400"
                          }`}
                        >
                          {q.type}
                        </span>
                        <span className="text-xs text-slate-500">
                          {q.marks} mark{q.marks !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {isAdded && (
                        <span className="flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-400">
                          <Check className="h-3 w-3" />
                          Added
                        </span>
                      )}
                    </div>

                    {/* Question text */}
                    <p className="text-sm text-slate-200 mb-3">{q.text}</p>

                    {/* MCQ options */}
                    {q.type === "MCQ" && (
                      <div className="space-y-1.5 mb-3">
                        {q.options.map((o, oi) => (
                          <div
                            key={oi}
                            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs ${
                              o.isCorrect
                                ? "border border-green-500/25 bg-green-500/8 text-green-300"
                                : "border border-white/8 bg-white/3 text-slate-400"
                            }`}
                          >
                            {o.isCorrect ? (
                              <Check className="h-3 w-3 shrink-0 text-green-400" />
                            ) : (
                              <span className="h-3 w-3 shrink-0 rounded-full border border-slate-600" />
                            )}
                            {o.text}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* QA model answer */}
                    {q.type === "QA" && (
                      <div className="mb-3 rounded-lg border border-white/8 bg-white/3 px-3 py-2">
                        <p className="text-xs text-slate-500 mb-1 font-medium">Model Answer</p>
                        <p className="text-xs text-slate-300">{q.modelAnswer}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {!isAdded ? (
                        <button
                          onClick={() => addQuestion(idx, q)}
                          disabled={isAdding}
                          className="flex items-center gap-1.5 rounded-lg border border-green-500/20 bg-green-500/8 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/15 transition-colors disabled:opacity-50"
                        >
                          {isAdding ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                          {isAdding ? "Adding…" : "Add to Quiz"}
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
                          <Check className="h-3.5 w-3.5" />
                          Added to quiz
                        </span>
                      )}

                      {!isAdded && (
                        <button
                          onClick={() =>
                            setSkippedQuestions((prev) => new Set(prev).add(idx))
                          }
                          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                          Skip
                        </button>
                      )}

                      <button
                        onClick={() => startEdit(idx)}
                        className="ml-auto flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-blue-400 transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Conversation History */}
      {messages.length > 0 && (
        <div className="glass-card rounded-xl overflow-hidden">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            <span>Conversation History ({Math.floor(messages.length / 2)} exchange{Math.floor(messages.length / 2) !== 1 ? "s" : ""})</span>
            {showHistory ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showHistory && (
            <div className="border-t border-white/8 divide-y divide-white/5">
              {messages.map((msg, i) => (
                <div key={i} className="px-4 py-3">
                  <span
                    className={`inline-flex mb-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      msg.role === "user"
                        ? "border border-blue-500/30 bg-blue-500/10 text-blue-400"
                        : "border border-purple-500/30 bg-purple-500/10 text-purple-400"
                    }`}
                  >
                    {msg.role === "user" ? "You" : "AI"}
                  </span>
                  <p className="text-xs text-slate-400 line-clamp-3">
                    {msg.content.length > 300
                      ? msg.content.slice(0, 300) + "…"
                      : msg.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ControlsRow sub-component ────────────────────────────────────────────────

function ControlsRow({
  quizType,
  setQuizType,
  count,
  setCount,
  difficulty,
  setDifficulty,
}: {
  quizType: "MCQ" | "QA" | "MIXED";
  setQuizType: (v: "MCQ" | "QA" | "MIXED") => void;
  count: number;
  setCount: (v: number) => void;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  setDifficulty: (v: "EASY" | "MEDIUM" | "HARD") => void;
}) {
  return (
    <div className="space-y-3">
      {/* Question Type */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-500">Question Type</label>
        <div className="flex gap-1.5">
          {(["MCQ", "QA", "MIXED"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setQuizType(t)}
              className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition-colors ${
                quizType === t
                  ? "border-purple-500/50 bg-purple-500/15 text-purple-300"
                  : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              {t === "MIXED" ? "Mixed" : t}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-500">Number of Questions</label>
        <div className="flex gap-1.5">
          {[5, 10, 15, 20].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCount(n)}
              className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition-colors ${
                count === n
                  ? "border-purple-500/50 bg-purple-500/15 text-purple-300"
                  : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-500">Difficulty</label>
        <div className="flex gap-1.5">
          {(["EASY", "MEDIUM", "HARD"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition-colors ${
                difficulty === d
                  ? d === "EASY"
                    ? "border-green-500/50 bg-green-500/15 text-green-300"
                    : d === "MEDIUM"
                    ? "border-yellow-500/50 bg-yellow-500/15 text-yellow-300"
                    : "border-red-500/50 bg-red-500/15 text-red-300"
                  : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              {d.charAt(0) + d.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
