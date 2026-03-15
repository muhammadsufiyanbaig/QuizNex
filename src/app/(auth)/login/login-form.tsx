"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  LogIn,
  Mail,
  RefreshCw,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

// ── Types ─────────────────────────────────────────────────────────────────

type Step = "credentials" | "totp";

type ErrorState =
  | { type: "invalid_credentials" }
  | { type: "unverified_email"; email: string }
  | { type: "invalid_totp" }
  | { type: "generic"; message: string }
  | null;

// ── Component ─────────────────────────────────────────────────────────────

export default function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams.get("callbackUrl") ?? "/";
  const verified     = searchParams.get("verified");
  const errorParam   = searchParams.get("error");

  const [step, setStep]             = useState<Step>("credentials");
  const [totpCode, setTotpCode]     = useState("");
  const [showPassword, setShowPwd]  = useState(false);
  const [error, setError]           = useState<ErrorState>(null);
  const [resendSent, setResendSent] = useState(false);
  const [resending, setResending]   = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Keep credentials in a ref so we can reuse them in step 2
  const credsRef = useRef<LoginInput | null>(null);

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } =
    useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  // ── Step 1: Verify credentials + check 2FA ──────────────────────────────
  async function onCredentialsSubmit(data: LoginInput) {
    setError(null);
    credsRef.current = data;

    // Check if this account uses 2FA before calling signIn
    const res = await fetch(
      `/api/auth/check-2fa?email=${encodeURIComponent(data.email)}`
    );
    const { requires2FA } = await res.json();

    if (requires2FA) {
      setStep("totp");
      return;
    }

    // No 2FA — complete login directly
    await doSignIn(data.email, data.password, "");
  }

  // ── Step 2: Submit TOTP code ─────────────────────────────────────────────
  async function onTotpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!credsRef.current) return;
    await doSignIn(credsRef.current.email, credsRef.current.password, totpCode);
  }

  // ── Shared sign-in call ──────────────────────────────────────────────────
  async function doSignIn(email: string, password: string, code: string) {
    setSubmitting(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        totpCode: code,
        redirect: false,
      });

      if (!result?.error) {
        router.push(callbackUrl);
        router.refresh();
        return;
      }

      const errorCode = result.error ?? result.code ?? "";

      if (errorCode.includes("unverified_email")) {
        setError({ type: "unverified_email", email });
        setStep("credentials");
      } else if (errorCode.includes("invalid_totp")) {
        setError({ type: "invalid_totp" });
        setTotpCode("");
      } else {
        setError({ type: "invalid_credentials" });
        setStep("credentials");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function resendVerification() {
    setResending(true);
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: getValues("email") }),
      });
      setResendSent(true);
    } finally {
      setResending(false);
    }
  }

  const isLoading = isSubmitting || submitting;

  // ── Render ───────────────────────────────────────────────────────────────
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

        {step === "credentials" ? (
          <>
            <h1 className="text-3xl font-bold text-white">Welcome back</h1>
            <p className="mt-1 text-sm text-slate-400">Sign in to your account</p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-white">Two-Factor Auth</h1>
            <p className="mt-1 text-sm text-slate-400">
              Enter the 6-digit code from your authenticator app
            </p>
          </>
        )}
      </div>

      {/* Global alerts */}
      {verified && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          <span>✓</span> Email verified! You can now sign in.
        </div>
      )}
      {errorParam === "invalid-or-expired-token" && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <span>✕</span> Verification link is invalid or expired.
        </div>
      )}

      {/* Step indicator */}
      <div className="mb-5 flex items-center justify-center gap-3">
        {(["credentials", "totp"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300
              ${step === s
                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/40"
                : i < (step === "totp" ? 1 : 0)
                  ? "bg-blue-500/30 text-blue-300"
                  : "bg-white/10 text-slate-500"
              }`}
            >
              {i < (step === "totp" ? 1 : 0) ? "✓" : i + 1}
            </div>
            <span className={`text-xs ${step === s ? "text-slate-200" : "text-slate-500"}`}>
              {s === "credentials" ? "Credentials" : "2FA Code"}
            </span>
            {i === 0 && <div className="h-px w-8 bg-white/10" />}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="glass-card rounded-2xl p-8 shadow-2xl shadow-black/40">

        {/* ── STEP 1: Credentials ── */}
        {step === "credentials" && (
          <form onSubmit={handleSubmit(onCredentialsSubmit)} className="space-y-5">

            {error?.type === "invalid_credentials" && (
              <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <span className="mt-0.5">✕</span>
                Incorrect email or password.
              </div>
            )}

            {error?.type === "unverified_email" && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm">
                <div className="flex items-start gap-3 text-amber-400">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="space-y-2">
                    <p className="font-medium">Email not verified</p>
                    <p className="text-amber-400/80">Check your inbox for the verification link.</p>
                    {resendSent ? (
                      <p className="flex items-center gap-1.5 text-green-400">✓ New email sent!</p>
                    ) : (
                      <button type="button" onClick={resendVerification} disabled={resending}
                        className="flex items-center gap-1.5 font-medium text-blue-400 underline-offset-2 hover:underline disabled:opacity-60">
                        {resending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        Resend verification email
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Email address</label>
              <input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 transition-all duration-200"
              />
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300">Password</label>
                <Link href="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-sm text-white placeholder-slate-500 transition-all duration-200"
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isLoading}
              className="btn-gradient mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {isLoading ? "Verifying…" : "Continue"}
            </button>
          </form>
        )}

        {/* ── STEP 2: TOTP ── */}
        {step === "totp" && (
          <form onSubmit={onTotpSubmit} className="space-y-6">

            {/* 2FA icon */}
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-700/10 ring-2 ring-blue-500/30">
                <ShieldCheck className="h-8 w-8 text-blue-400" />
              </div>
              <p className="text-center text-sm text-slate-400 max-w-xs">
                Open your authenticator app (Google Authenticator, Authy, etc.) and enter the 6-digit code.
              </p>
            </div>

            {error?.type === "invalid_totp" && (
              <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <span>✕</span> Invalid code. Please try again.
              </div>
            )}

            {/* OTP input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Authentication code</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder="000000"
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoFocus
                autoComplete="one-time-code"
                className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-center text-2xl font-mono tracking-[0.5em] text-white placeholder-slate-600 transition-all duration-200"
              />
              <p className="text-xs text-slate-500 text-center">Code refreshes every 30 seconds</p>
            </div>

            <button type="submit" disabled={isLoading || totpCode.length !== 6}
              className="btn-gradient flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {isLoading ? "Verifying…" : "Verify & Sign in"}
            </button>

            <button type="button" onClick={() => { setStep("credentials"); setError(null); setTotpCode(""); }}
              className="flex w-full items-center justify-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Use a different account
            </button>
          </form>
        )}

        {/* Register link — only on step 1 */}
        {step === "credentials" && (
          <>
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-slate-500">New to QuizNex?</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <Link href="/register"
              className="flex w-full items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/5 py-3 text-sm font-medium text-blue-400 transition-all duration-200 hover:border-blue-500/60 hover:bg-blue-500/10 hover:text-blue-300">
              Create an account
            </Link>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-slate-600">
        By signing in you agree to our{" "}
        <span className="text-slate-500 hover:text-slate-400 cursor-pointer">Terms of Service</span>
        {" "}and{" "}
        <span className="text-slate-500 hover:text-slate-400 cursor-pointer">Privacy Policy</span>
      </p>
    </>
  );
}
