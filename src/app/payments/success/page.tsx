"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, CheckCircle2, XCircle, Loader2 } from "lucide-react";

const planLabel: Record<string, string> = {
  GOLD:           "Gold",
  PLATINUM:       "Platinum",
  ORG_STARTER:    "Org Starter",
  ORG_GROWTH:     "Org Growth",
  ORG_ENTERPRISE: "Org Enterprise",
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  // Safepay embedded sends "tracker" in form POST and "tracker_token" in link redirect
  const tracker = searchParams.get("tracker") ?? searchParams.get("tracker_token");

  const [state, setState] = useState<"verifying" | "success" | "failed">("verifying");
  const [plan, setPlan]   = useState<string | null>(null);

  useEffect(() => {
    if (!tracker) { setState("failed"); return; }

    // Poll up to 6 times (12 s total) — Safepay may redirect before state updates
    let attempts = 0;
    const poll = () => {
      fetch(`/api/payments/verify?tracker=${encodeURIComponent(tracker)}`)
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setPlan(data.plan ?? null);
            setState("success");
            setTimeout(() => router.push("/"), 3000);
          } else if (attempts < 5) {
            attempts++;
            setTimeout(poll, 2000);
          } else {
            setState("failed");
          }
        })
        .catch(() => {
          if (attempts < 5) { attempts++; setTimeout(poll, 2000); }
          else setState("failed");
        });
    };
    poll();
  }, [tracker, router]);

  return (
    <div className="glass-card rounded-2xl p-10 shadow-2xl shadow-black/40">
      {state === "verifying" && (
        <>
          <div className="mb-6 flex justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Verifying payment…</h1>
          <p className="mt-2 text-sm text-slate-400">Please wait while we confirm your payment.</p>
        </>
      )}

      {state === "success" && (
        <>
          <div className="mb-6 flex justify-center">
            <CheckCircle2 className="h-16 w-16 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Payment successful!</h1>
          {plan && (
            <p className="mt-2 text-sm text-slate-400">
              Your <span className="font-semibold text-blue-400">{planLabel[plan] ?? plan}</span> plan is now active.
            </p>
          )}
          <p className="mt-4 text-xs text-slate-600">Redirecting to your dashboard…</p>
          <Link href="/"
            className="btn-gradient mt-6 flex items-center justify-center rounded-xl py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20">
            Go to dashboard
          </Link>
        </>
      )}

      {state === "failed" && (
        <>
          <div className="mb-6 flex justify-center">
            <XCircle className="h-16 w-16 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Payment not confirmed</h1>
          <p className="mt-2 text-sm text-slate-400">
            Your payment could not be verified. If you were charged, contact support — it may take a few minutes to process.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link href="/pricing"
              className="btn-gradient flex items-center justify-center rounded-xl py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20">
              Try again
            </Link>
            <a href="mailto:tools.sufiyan@gmail.com" className="text-sm text-blue-400 hover:underline">
              Contact support
            </a>
          </div>
        </>
      )}
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#05050f] flex items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="orb-1 absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #1d4ed8 0%, #1e40af 40%, transparent 70%)", filter: "blur(60px)" }} />
        <div className="orb-2 absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #3b82f6 0%, #2563eb 40%, transparent 70%)", filter: "blur(70px)" }} />
      </div>

      <div className="relative z-10 w-full max-w-md text-center animate-fade-in-up">
        <div className="mb-8 flex justify-center">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">QuizNex</span>
          </div>
        </div>

        <Suspense fallback={
          <div className="glass-card rounded-2xl p-10 shadow-2xl shadow-black/40">
            <div className="flex justify-center">
              <Loader2 className="h-16 w-16 animate-spin text-blue-400" />
            </div>
            <p className="mt-4 text-sm text-slate-400">Loading…</p>
          </div>
        }>
          <SuccessContent />
        </Suspense>
      </div>
    </div>
  );
}
