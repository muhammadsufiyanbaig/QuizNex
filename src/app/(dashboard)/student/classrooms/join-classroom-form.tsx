"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hash, Loader2, LogIn } from "lucide-react";

export default function JoinClassroomForm() {
  const router = useRouter();
  const [key, setKey]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [success, setSuccess] = useState("");

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) { setError("Please enter a join key."); return; }
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch("/api/classrooms/join", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ joinKey: key.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to join."); return; }
      setSuccess(`Joined "${json.name}" successfully!`);
      setKey("");
      setTimeout(() => {
        router.refresh();
        setSuccess("");
      }, 1500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-card rounded-2xl p-5">
      <h2 className="mb-3 text-sm font-semibold text-slate-300">Join a Classroom</h2>
      <form onSubmit={handleJoin} className="flex gap-3">
        <div className="relative flex-1">
          <Hash className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            placeholder="Enter join key…"
            maxLength={20}
            className="input-glow w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm font-mono text-white placeholder-slate-500 transition-all uppercase"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !key.trim()}
          className="btn-gradient flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          {loading ? "Joining…" : "Join"}
        </button>
      </form>
      {error && (
        <p className="mt-2.5 flex items-center gap-2 text-sm text-red-400">
          <span>✕</span> {error}
        </p>
      )}
      {success && (
        <p className="mt-2.5 flex items-center gap-2 text-sm text-green-400">
          <span>✓</span> {success}
        </p>
      )}
    </div>
  );
}
