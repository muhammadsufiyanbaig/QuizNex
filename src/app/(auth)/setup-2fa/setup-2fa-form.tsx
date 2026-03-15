"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import {
  Zap,
  Shield,
  Copy,
  Check,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  Smartphone,
} from "lucide-react";

const ROLE_HOME: Record<string, string> = {
  STUDENT:      "/student",
  TEACHER:      "/teacher",
  ORGANIZATION: "/organization",
};

const OTP_LENGTH = 6;

type SetupData = {
  qrCodeDataUrl: string;
  secret: string;
};

export default function Setup2FAForm() {
  const router           = useRouter();
  const { data: session, update } = useSession();

  const [setupData, setSetupData]     = useState<SetupData | null>(null);
  const [loadError, setLoadError]     = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);

  const [digits, setDigits]           = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [done, setDone]               = useState(false);

  const [showSecret, setShowSecret]   = useState(false);
  const [copied, setCopied]           = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Fetch QR code on mount
  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch("/api/auth/2fa/setup", { method: "POST" });
        const json = await res.json();
        if (!res.ok) {
          setLoadError(json.error ?? "Failed to start 2FA setup.");
        } else {
          setSetupData({ qrCodeDataUrl: json.qrCodeDataUrl, secret: json.secret });
          setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
      } catch {
        setLoadError("Network error. Please refresh and try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Auto-submit when all digits filled
  useEffect(() => {
    if (digits.every((d) => d !== "")) {
      handleEnable(digits.join(""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  // After success, update session then navigate
  useEffect(() => {
    if (!done) return;
    (async () => {
      await update({ twoFactorEnabled: true });
      const role = session?.user?.role ?? "STUDENT";
      router.push(ROLE_HOME[role] ?? "/student");
    })();
  }, [done, session, update, router]);

  async function handleEnable(code: string) {
    if (submitting) return;
    setSubmitting(true);
    setVerifyError(null);
    try {
      const res  = await fetch("/api/auth/2fa/enable", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok) {
        setVerifyError(json.error ?? "Invalid code. Please try again.");
        setDigits(Array(OTP_LENGTH).fill(""));
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
      } else {
        setDone(true);
      }
    } catch {
      setVerifyError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next  = [...digits];
    next[index] = digit;
    setDigits(next);
    setVerifyError(null);
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
    } else if (e.key === "ArrowLeft"  && index > 0)              inputRefs.current[index - 1]?.focus();
    else if   (e.key === "ArrowRight" && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = [...digits];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  }

  async function copySecret() {
    if (!setupData) return;
    await navigator.clipboard.writeText(setupData.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Loading ──────────────────────────────────────────────────────
  if (loading) {
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
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-400" />
          <p className="mt-4 text-sm text-slate-400">Generating your QR code…</p>
        </div>
      </>
    );
  }

  // ── Load error ───────────────────────────────────────────────────
  if (loadError) {
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
        <div className="glass-card rounded-2xl p-8 text-center shadow-2xl shadow-black/40">
          <p className="mb-4 text-sm text-red-400">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-gradient rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
          >
            Retry
          </button>
        </div>
      </>
    );
  }

  // ── Success: redirecting ─────────────────────────────────────────
  if (done) {
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
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/15 ring-2 ring-blue-500/30">
              <Shield className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-white">2FA enabled!</h2>
          <p className="mb-6 text-sm text-slate-400">
            Your account is now protected. Taking you to your dashboard…
          </p>
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-blue-400" />
        </div>
      </>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────
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
        <h1 className="text-3xl font-bold text-white">Secure your account</h1>
        <p className="mt-1 text-sm text-slate-400">
          Set up two-factor authentication to continue
        </p>
      </div>

      <div className="glass-card rounded-2xl p-8 shadow-2xl shadow-black/40">

        {/* Step indicator */}
        <div className="mb-6 flex items-center gap-2">
          {["Scan QR code", "Enter code"].map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <div className="h-px flex-1 bg-white/10" />}
              <div className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-xs text-slate-400">{label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-500/15 bg-blue-500/5 px-4 py-3">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
          <p className="text-xs leading-relaxed text-slate-400">
            Open <strong className="text-slate-200">Google Authenticator</strong>,{" "}
            <strong className="text-slate-200">Authy</strong>, or any TOTP app and
            scan the QR code below.
          </p>
        </div>

        {/* QR code */}
        {setupData?.qrCodeDataUrl && (
          <div className="mb-5 flex flex-col items-center">
            <div className="rounded-2xl border border-white/10 bg-white p-3 shadow-lg shadow-black/30">
              <Image
                src={setupData.qrCodeDataUrl}
                alt="2FA QR code"
                width={192}
                height={192}
                className="block"
                unoptimized
              />
            </div>
          </div>
        )}

        {/* Manual secret */}
        <div className="mb-5 space-y-1.5">
          <p className="text-center text-xs text-slate-500">
            Can&apos;t scan? Enter this key manually:
          </p>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
            <code className="flex-1 text-center font-mono text-sm tracking-widest text-slate-300">
              {showSecret
                ? setupData?.secret
                : "•".repeat((setupData?.secret ?? "").length)}
            </code>
            <button
              type="button"
              onClick={() => setShowSecret((v) => !v)}
              className="text-slate-500 transition-colors hover:text-slate-300"
              title={showSecret ? "Hide" : "Reveal"}
            >
              {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={copySecret}
              className="text-slate-500 transition-colors hover:text-blue-400"
              title="Copy"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-slate-500">Then enter the 6-digit code</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* Error */}
        {verifyError && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <span>✕</span>
            {verifyError}
          </div>
        )}

        {/* OTP digit inputs */}
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
                verifyError
                  ? "border-red-500/50 bg-red-500/10 focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
                  : digit
                  ? "border-blue-500/60 bg-blue-500/10 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25"
                  : "border-white/15 bg-white/5 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
              }`}
            />
          ))}
        </div>

        {/* Spinner hint */}
        <div className="mt-3 flex min-h-[20px] items-center justify-center">
          {submitting && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Verifying code…
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="button"
          disabled={submitting || digits.some((d) => !d)}
          onClick={() => handleEnable(digits.join(""))}
          className="btn-gradient mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          {submitting ? "Verifying…" : "Enable 2FA & go to dashboard"}
        </button>
      </div>
    </>
  );
}
