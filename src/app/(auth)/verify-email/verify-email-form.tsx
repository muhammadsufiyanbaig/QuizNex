"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Zap, Mail, ArrowRight, Loader2, RotateCcw, CheckCircle2 } from "lucide-react";

const OTP_LENGTH = 6;

export default function VerifyEmailForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const email        = searchParams.get("email") ?? "";
  const callbackUrl  = searchParams.get("callbackUrl") ?? "";

  const [digits, setDigits]         = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError]           = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verified, setVerified]     = useState(false);
  const [cooldown, setCooldown]     = useState(0);
  const [resending, setResending]   = useState(false);
  const [resendMsg, setResendMsg]   = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  // Auto-submit when all digits filled
  useEffect(() => {
    if (digits.every((d) => d !== "")) {
      handleVerify(digits.join(""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  // Redirect after success
  useEffect(() => {
    if (!verified) return;
    const loginUrl = callbackUrl
      ? `/login?verified=true&callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "/login?verified=true";
    const id = setTimeout(() => router.push(loginUrl), 2000);
    return () => clearTimeout(id);
  }, [verified, router, callbackUrl]);

  async function handleVerify(otp: string) {
    if (submitting || otp.length !== OTP_LENGTH) return;
    setSubmitting(true);
    setError(null);
    try {
      const res  = await fetch("/api/auth/verify-email-otp", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, otp }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Verification failed. Please try again.");
        setDigits(Array(OTP_LENGTH).fill(""));
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
      } else {
        setVerified(true);
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setResendMsg(null);
    setError(null);
    try {
      const res  = await fetch("/api/auth/resend-verification", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      const json = await res.json();
      if (res.status === 429) {
        setResendMsg(json.error ?? "Too many requests. Please wait.");
      } else {
        setResendMsg("A new code has been sent to your email.");
        setCooldown(60);
      }
    } catch {
      setResendMsg("Could not resend. Please try again.");
    } finally {
      setResending(false);
    }
  }

  function handleChange(index: number, value: string) {
    // Allow only digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const next  = [...digits];
    next[index] = digit;
    setDigits(next);
    setError(null);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const next  = [...digits];
        next[index] = "";
        setDigits(next);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = [...digits];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    // Focus last filled or next empty
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
  }

  // ── Success state ──────────────────────────────────────────────────
  if (verified) {
    return (
      <>
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight gradient-text">QuizNex</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-10 text-center shadow-2xl shadow-black/40">
          <div className="mb-5 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 ring-2 ring-green-500/30">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-white">Email verified!</h2>
          <p className="mb-6 text-sm text-slate-400">
            Your account is now active. Redirecting you to sign in…
          </p>
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full animate-[shrink_2s_linear_forwards] rounded-full bg-gradient-to-r from-blue-500 to-blue-700" />
          </div>
        </div>
      </>
    );
  }

  // ── Main state ─────────────────────────────────────────────────────
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
        <h1 className="text-3xl font-bold text-white">Verify your email</h1>
        <p className="mt-1 text-sm text-slate-400">
          We sent a 6-digit code to
        </p>
        <p className="mt-0.5 text-sm font-medium text-blue-400 flex items-center justify-center gap-1.5">
          <Mail className="h-3.5 w-3.5" />
          {email || "your email address"}
        </p>
      </div>

      <div className="glass-card rounded-2xl p-8 shadow-2xl shadow-black/40">

        {/* Error */}
        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <span className="text-base">✕</span>
            {error}
          </div>
        )}

        {/* Resend message */}
        {resendMsg && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-400">
            <span className="text-base">✉</span>
            {resendMsg}
          </div>
        )}

        {/* OTP input boxes */}
        <div className="flex justify-center gap-3">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              disabled={submitting}
              className={`h-14 w-11 rounded-xl border text-center text-xl font-bold text-white transition-all duration-150 focus:outline-none disabled:opacity-50 ${
                error
                  ? "border-red-500/50 bg-red-500/10 focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
                  : digit
                  ? "border-blue-500/60 bg-blue-500/10 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25"
                  : "border-white/15 bg-white/5 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
              }`}
            />
          ))}
        </div>

        {/* Spinner / hint */}
        <div className="mt-4 flex min-h-[24px] items-center justify-center">
          {submitting ? (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying…
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Enter the code above — it expires in 10 minutes
            </p>
          )}
        </div>

        {/* Manual submit (in case auto-submit fails) */}
        <button
          type="button"
          disabled={submitting || digits.some((d) => !d)}
          onClick={() => handleVerify(digits.join(""))}
          className="btn-gradient mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          {submitting ? "Verifying…" : "Verify email"}
        </button>

        {/* Resend */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">Didn&apos;t receive the code?</p>
          <button
            type="button"
            disabled={cooldown > 0 || resending}
            onClick={handleResend}
            className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-blue-400 transition-colors hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </button>
        </div>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-slate-500">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <Link
          href="/register"
          className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/3 py-3 text-sm font-medium text-slate-400 transition-all duration-200 hover:border-white/20 hover:bg-white/5 hover:text-slate-300"
        >
          Back to sign up
        </Link>
      </div>
    </>
  );
}
