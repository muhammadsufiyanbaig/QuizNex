"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Smartphone,
} from "lucide-react";

// ── OTP digit input ────────────────────────────────────────────────────────
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-300">
        Authenticator code
      </label>
      <input
        type="text"
        inputMode="numeric"
        pattern="\d{6}"
        maxLength={6}
        placeholder="000000"
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        autoComplete="one-time-code"
        className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-center text-2xl font-mono tracking-[0.5em] text-white placeholder-slate-600 transition-all duration-200"
      />
      <p className="text-xs text-slate-500 text-center">Refreshes every 30 seconds</p>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function TwoFactorSettings({
  isEnabled: initialEnabled,
  userEmail,
}: {
  isEnabled: boolean;
  userEmail: string;
}) {
  const router = useRouter();
  const [isEnabled, setIsEnabled]       = useState(initialEnabled);
  const [phase, setPhase]               = useState<"idle" | "setup" | "disable">("idle");

  // Setup state
  const [qrCode, setQrCode]             = useState("");
  const [secret, setSecret]             = useState("");
  const [secretVisible, setSecretVisible] = useState(false);
  const [copied, setCopied]             = useState(false);
  const [enableCode, setEnableCode]     = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [enableLoading, setEnableLoading] = useState(false);
  const [setupError, setSetupError]     = useState("");
  const [setupSuccess, setSetupSuccess] = useState(false);

  // Disable state
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisablePwd, setShowDisablePwd]   = useState(false);
  const [disableCode, setDisableCode]         = useState("");
  const [disableLoading, setDisableLoading]   = useState(false);
  const [disableError, setDisableError]       = useState("");

  // ── Handlers ──────────────────────────────────────────────────────────

  async function startSetup() {
    setSetupError("");
    setSetupLoading(true);
    try {
      const res  = await fetch("/api/auth/2fa/setup", { method: "POST" });
      const json = await res.json();
      if (!res.ok) { setSetupError(json.error); return; }
      setQrCode(json.qrCodeDataUrl);
      setSecret(json.secret);
      setPhase("setup");
    } finally {
      setSetupLoading(false);
    }
  }

  async function confirmEnable() {
    setSetupError("");
    setEnableLoading(true);
    try {
      const res  = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: enableCode }),
      });
      const json = await res.json();
      if (!res.ok) { setSetupError(json.error); return; }
      setSetupSuccess(true);
      setIsEnabled(true);
      setTimeout(() => {
        setPhase("idle");
        setSetupSuccess(false);
        setEnableCode("");
        setQrCode("");
        setSecret("");
        router.refresh();
      }, 2000);
    } finally {
      setEnableLoading(false);
    }
  }

  async function confirmDisable() {
    setDisableError("");
    setDisableLoading(true);
    try {
      const res  = await fetch("/api/auth/2fa/disable", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword, code: disableCode }),
      });
      const json = await res.json();
      if (!res.ok) { setDisableError(json.error); return; }
      setIsEnabled(false);
      setPhase("idle");
      setDisablePassword("");
      setDisableCode("");
      router.refresh();
    } finally {
      setDisableLoading(false);
    }
  }

  function copySecret() {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Status card ── */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
              isEnabled
                ? "bg-green-500/15 ring-1 ring-green-500/30"
                : "bg-slate-500/15 ring-1 ring-slate-500/30"
            }`}>
              {isEnabled
                ? <ShieldCheck className="h-6 w-6 text-green-400" />
                : <ShieldAlert className="h-6 w-6 text-slate-400" />
              }
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-white">Two-Factor Authentication</h2>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  isEnabled
                    ? "bg-green-500/15 text-green-400"
                    : "bg-slate-500/15 text-slate-400"
                }`}>
                  {isEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                {isEnabled
                  ? "Your account is protected with a time-based one-time password (TOTP)."
                  : "Add an extra layer of security using an authenticator app."}
              </p>
            </div>
          </div>

          {/* Action button */}
          {phase === "idle" && (
            isEnabled ? (
              <button onClick={() => setPhase("disable")}
                className="shrink-0 flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-2 text-sm font-medium text-red-400 transition-all hover:border-red-500/60 hover:bg-red-500/10">
                <ShieldOff className="h-4 w-4" /> Disable
              </button>
            ) : (
              <button onClick={startSetup} disabled={setupLoading}
                className="btn-gradient shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 disabled:opacity-60">
                {setupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {setupLoading ? "Loading…" : "Enable 2FA"}
              </button>
            )
          )}
          {phase !== "idle" && (
            <button onClick={() => { setPhase("idle"); setSetupError(""); setDisableError(""); }}
              className="shrink-0 flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 transition-all hover:border-white/20 hover:text-slate-200">
              {phase === "setup" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* ── Setup panel ── */}
      {phase === "setup" && (
        <div className="glass-card rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/8 pb-4">
            <Smartphone className="h-5 w-5 text-blue-400" />
            <h3 className="font-semibold text-white">Set up authenticator app</h3>
          </div>

          {setupSuccess ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 ring-2 ring-green-500/30">
                <Check className="h-8 w-8 text-green-400" />
              </div>
              <p className="font-semibold text-green-400">2FA enabled successfully!</p>
            </div>
          ) : (
            <>
              {/* Steps */}
              <ol className="space-y-5 text-sm text-slate-300">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-400 ring-1 ring-blue-500/30">1</span>
                  <p>Install <span className="text-white font-medium">Google Authenticator</span>, <span className="text-white font-medium">Authy</span>, or any TOTP-compatible app on your phone.</p>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-400 ring-1 ring-blue-500/30">2</span>
                  <div className="space-y-3 w-full">
                    <p>Scan the QR code below, or enter the secret key manually.</p>

                    {/* QR Code */}
                    {qrCode && (
                      <div className="flex justify-center">
                        <div className="rounded-2xl bg-white p-4 shadow-lg shadow-blue-500/10 ring-1 ring-white/20">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={qrCode} alt="2FA QR Code" width={180} height={180} />
                        </div>
                      </div>
                    )}

                    {/* Manual secret */}
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-slate-500">Manual entry key</span>
                        <div className="flex gap-2">
                          <button onClick={() => setSecretVisible(v => !v)}
                            className="text-slate-500 hover:text-slate-300 transition-colors">
                            {secretVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                          <button onClick={copySecret}
                            className="text-slate-500 hover:text-slate-300 transition-colors">
                            {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                      <p className="font-mono text-sm tracking-widest text-blue-300 break-all">
                        {secretVisible ? secret : secret.replace(/./g, "•")}
                      </p>
                    </div>

                    {/* Account info */}
                    <p className="text-xs text-slate-500">
                      Account: <span className="text-slate-400">{userEmail}</span>
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-400 ring-1 ring-blue-500/30">3</span>
                  <div className="w-full space-y-3">
                    <p>Enter the 6-digit code from your app to confirm.</p>
                    <OtpInput value={enableCode} onChange={setEnableCode} />
                    {setupError && (
                      <p className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                        <span>✕</span> {setupError}
                      </p>
                    )}
                    <button onClick={confirmEnable}
                      disabled={enableLoading || enableCode.length !== 6}
                      className="btn-gradient flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60">
                      {enableLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      {enableLoading ? "Enabling…" : "Enable Two-Factor Auth"}
                    </button>
                  </div>
                </li>
              </ol>
            </>
          )}
        </div>
      )}

      {/* ── Disable panel ── */}
      {phase === "disable" && (
        <div className="glass-card rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3 border-b border-white/8 pb-4">
            <ShieldOff className="h-5 w-5 text-red-400" />
            <h3 className="font-semibold text-white">Disable Two-Factor Authentication</h3>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-sm text-amber-400">
            ⚠ Disabling 2FA will make your account less secure. You will only need your password to sign in.
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Current password</label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type={showDisablePwd ? "text" : "password"}
                value={disablePassword}
                onChange={e => setDisablePassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="input-glow w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-11 text-sm text-white placeholder-slate-500 transition-all duration-200"
              />
              <button type="button" onClick={() => setShowDisablePwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                {showDisablePwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <OtpInput value={disableCode} onChange={setDisableCode} />

          {disableError && (
            <p className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              <span>✕</span> {disableError}
            </p>
          )}

          <button onClick={confirmDisable}
            disabled={disableLoading || !disablePassword || disableCode.length !== 6}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 py-3 text-sm font-semibold text-red-400 transition-all hover:border-red-500/60 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60">
            {disableLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
            {disableLoading ? "Disabling…" : "Disable 2FA"}
          </button>
        </div>
      )}

      {/* ── Info card ── */}
      <div className="glass-card rounded-2xl p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-300">Compatible apps</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { name: "Google Authenticator", icon: "🔑" },
            { name: "Authy",                icon: "🛡" },
            { name: "Microsoft Auth",       icon: "🔒" },
          ].map((app) => (
            <div key={app.name}
              className="flex flex-col items-center gap-2 rounded-xl border border-white/8 bg-white/3 p-3 text-center">
              <span className="text-2xl">{app.icon}</span>
              <span className="text-xs text-slate-400">{app.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
