"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Loader2,
  UserRound,
  BookOpen,
  Building2,
  Zap,
  Check,
  ArrowRight,
} from "lucide-react";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
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
    value: "STUDENT",
    label: "Student",
    description: "Join classrooms and take quizzes",
    icon: <UserRound className="h-6 w-6" />,
    gradient: "from-blue-500/20 to-blue-600/10",
    border: "border-blue-500/50",
    glow: "shadow-blue-500/20",
  },
  {
    value: "TEACHER",
    label: "Teacher",
    description: "Create quizzes and manage classrooms",
    icon: <BookOpen className="h-6 w-6" />,
    gradient: "from-indigo-500/20 to-indigo-600/10",
    border: "border-indigo-500/50",
    glow: "shadow-indigo-500/20",
  },
  {
    value: "ORGANIZATION",
    label: "Organization",
    description: "Manage teachers and view analytics",
    icon: <Building2 className="h-6 w-6" />,
    gradient: "from-violet-500/20 to-violet-600/10",
    border: "border-violet-500/50",
    glow: "shadow-violet-500/20",
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "STUDENT" },
  });

  const selectedRole = watch("role");

  async function onSubmit(data: RegisterInput) {
    setServerError(null);
    try {
      const res  = await fetch("/api/auth/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error ?? "Registration failed. Please try again.");
        return;
      }

      if (json.requiresVerification) {
        // Email service is configured — redirect to OTP verification page
        router.push(`/verify-email?email=${encodeURIComponent(json.email)}`);
      } else {
        // Auto-verified (no email service) — go straight to login
        router.push("/login?registered=true");
      }
    } catch {
      setServerError("Network error. Please check your connection.");
    }
  }

  // This success state is no longer used (router.push handles redirect)
  if (success) {
    return null;
  }

  return (
    <>
      {/* ── Brand ── */}
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight gradient-text">
            QuizNex
          </span>
        </div>
        <h1 className="text-3xl font-bold text-white">Create an account</h1>
        <p className="mt-1 text-sm text-slate-400">
          Choose your role to get started
        </p>
      </div>

      <div className="glass-card rounded-2xl p-8 shadow-2xl shadow-black/40">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Server error */}
          {serverError && (
            <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <span className="text-base">✕</span>
              {serverError}
            </div>
          )}

          {/* Role selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">
              I am a…
            </label>
            <div className="grid grid-cols-3 gap-3">
              {ROLES.map((role) => {
                const isSelected = selectedRole === role.value;
                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setValue("role", role.value, { shouldValidate: true })}
                    className={`relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all duration-200 ${
                      isSelected
                        ? `bg-gradient-to-b ${role.gradient} ${role.border} shadow-lg ${role.glow}`
                        : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </span>
                    )}
                    <span className={isSelected ? "text-blue-300" : "text-slate-400"}>
                      {role.icon}
                    </span>
                    <span className={`text-xs font-semibold ${isSelected ? "text-white" : "text-slate-400"}`}>
                      {role.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {/* Role description */}
            <p className="text-center text-xs text-slate-500">
              {ROLES.find((r) => r.value === selectedRole)?.description}
            </p>
            {errors.role && (
              <p className="text-xs text-red-400">{errors.role.message}</p>
            )}
          </div>

          {/* Full name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">
              Full name
            </label>
            <input
              {...register("name")}
              type="text"
              placeholder="John Doe"
              autoComplete="name"
              className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 transition-all duration-200"
            />
            {errors.name && (
              <p className="text-xs text-red-400">{errors.name.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">
              Email address
            </label>
            <input
              {...register("email")}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 transition-all duration-200"
            />
            {errors.email && (
              <p className="text-xs text-red-400">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">
              Password
            </label>
            <div className="relative">
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                autoComplete="new-password"
                className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-sm text-white placeholder-slate-500 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-400">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password — validated client-side via refine */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">
              Confirm password
            </label>
            <div className="relative">
              <input
                {...register("confirmPassword" as keyof RegisterInput)}
                type={showConfirm ? "text" : "password"}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-sm text-white placeholder-slate-500 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {(errors as Record<string, { message?: string }>)["confirmPassword"] && (
              <p className="text-xs text-red-400">
                {(errors as Record<string, { message?: string }>)["confirmPassword"].message}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-gradient mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            {isSubmitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-slate-500">Already have an account?</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <Link
          href="/login"
          className="flex w-full items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/5 py-3 text-sm font-medium text-blue-400 transition-all duration-200 hover:border-blue-500/60 hover:bg-blue-500/10 hover:text-blue-300"
        >
          Sign in instead
        </Link>
      </div>
    </>
  );
}
