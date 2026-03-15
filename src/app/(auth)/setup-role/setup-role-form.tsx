"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Zap,
  UserRound,
  BookOpen,
  Building2,
  ArrowRight,
  Loader2,
  Check,
} from "lucide-react";
import type { Role } from "@/types/auth";

const ROLES: {
  value: Role;
  label: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  border: string;
  glow: string;
}[] = [
  {
    value:       "STUDENT",
    label:       "Student",
    description: "Join classrooms and take quizzes",
    icon:        <UserRound className="h-7 w-7" />,
    gradient:    "from-blue-500/20 to-blue-600/10",
    border:      "border-blue-500/50",
    glow:        "shadow-blue-500/20",
  },
  {
    value:       "TEACHER",
    label:       "Teacher",
    description: "Create quizzes and manage classrooms",
    icon:        <BookOpen className="h-7 w-7" />,
    gradient:    "from-indigo-500/20 to-indigo-600/10",
    border:      "border-indigo-500/50",
    glow:        "shadow-indigo-500/20",
  },
  {
    value:       "ORGANIZATION",
    label:       "Organization",
    description: "Manage teachers and view analytics",
    icon:        <Building2 className="h-7 w-7" />,
    gradient:    "from-violet-500/20 to-violet-600/10",
    border:      "border-violet-500/50",
    glow:        "shadow-violet-500/20",
  },
];

export default function SetupRoleForm() {
  const router           = useRouter();
  const { update }       = useSession();

  const [selected, setSelected] = useState<Role | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleContinue() {
    if (!selected || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res  = await fetch("/api/auth/set-role", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ role: selected }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Could not save your role. Please try again.");
        return;
      }

      // Update JWT so middleware sees the new role
      await update({ role: json.role });
      router.push("/setup-2fa");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Brand */}
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight gradient-text">QuizNex</span>
        </div>
        <h1 className="text-3xl font-bold text-white">Choose your role</h1>
        <p className="mt-1 text-sm text-slate-400">
          How will you be using QuizNex?
        </p>
      </div>

      <div className="glass-card rounded-2xl p-8 shadow-2xl shadow-black/40">

        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <span>✕</span> {error}
          </div>
        )}

        {/* Role cards */}
        <div className="space-y-3">
          {ROLES.map((role) => {
            const isSelected = selected === role.value;
            return (
              <button
                key={role.value}
                type="button"
                onClick={() => setSelected(role.value)}
                className={`relative flex w-full items-center gap-4 rounded-xl border p-5 text-left transition-all duration-200 ${
                  isSelected
                    ? `bg-gradient-to-r ${role.gradient} ${role.border} shadow-lg ${role.glow}`
                    : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5"
                }`}
              >
                {/* Check badge */}
                {isSelected && (
                  <span className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
                    <Check className="h-3 w-3 text-white" />
                  </span>
                )}

                {/* Icon */}
                <span className={`shrink-0 transition-colors ${isSelected ? "text-blue-300" : "text-slate-500"}`}>
                  {role.icon}
                </span>

                {/* Text */}
                <div>
                  <p className={`font-semibold transition-colors ${isSelected ? "text-white" : "text-slate-300"}`}>
                    {role.label}
                  </p>
                  <p className={`text-sm transition-colors ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                    {role.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Continue */}
        <button
          type="button"
          disabled={!selected || loading}
          onClick={handleContinue}
          className="btn-gradient mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          {loading ? "Saving…" : "Continue"}
        </button>
      </div>
    </>
  );
}
