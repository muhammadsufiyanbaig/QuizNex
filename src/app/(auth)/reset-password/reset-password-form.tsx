"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Eye, EyeOff, KeyRound, Loader2, Zap } from "lucide-react";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  async function onSubmit(data: ResetPasswordInput) {
    setServerError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSuccess(true);
    } catch {
      setServerError("Network error. Please check your connection.");
    }
  }

  if (!token) {
    return (
      <div className="glass-card rounded-2xl p-10 text-center shadow-2xl shadow-black/40">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 ring-2 ring-red-500/30">
          <span className="text-4xl text-red-400">✕</span>
        </div>
        <h2 className="text-2xl font-bold text-white">Invalid link</h2>
        <p className="mt-3 text-sm text-slate-400">
          This password reset link is missing a token. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="btn-gradient mt-8 inline-flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold text-white"
        >
          Request new link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="glass-card rounded-2xl p-10 text-center shadow-2xl shadow-black/40">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-500/20 to-green-600/10 ring-2 ring-green-500/30 animate-pulse-ring">
          <Check className="h-10 w-10 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Password reset!</h2>
        <p className="mt-3 text-sm text-slate-400">
          Your password has been updated. You can now sign in with your new password.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="btn-gradient mt-8 inline-flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20"
        >
          Sign in now
        </button>
      </div>
    );
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
        <h1 className="text-3xl font-bold text-white">Set new password</h1>
        <p className="mt-1 text-sm text-slate-400">
          Must be at least 8 characters with 1 uppercase and 1 number
        </p>
      </div>

      <div className="glass-card rounded-2xl p-8 shadow-2xl shadow-black/40">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {serverError && (
            <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <span className="text-base">✕</span>
              {serverError}
            </div>
          )}

          <input type="hidden" {...register("token")} />

          {/* New password */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">New password</label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                autoComplete="new-password"
                className="input-glow w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-11 text-sm text-white placeholder-slate-500 transition-all duration-200"
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Confirm new password</label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                {...register("confirmPassword")}
                type={showConfirm ? "text" : "password"}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                className="input-glow w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-11 text-sm text-white placeholder-slate-500 transition-all duration-200"
              />
              <button type="button" onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-gradient mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {isSubmitting ? "Resetting…" : "Reset password"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-blue-400 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to login
          </Link>
        </div>
      </div>
    </>
  );
}
