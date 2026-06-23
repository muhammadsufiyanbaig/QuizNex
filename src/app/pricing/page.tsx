"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Zap, Check, ArrowLeft, Sparkles, Building2, GraduationCap, Loader2 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Period = "MONTHLY" | "YEARLY";
type Audience = "teacher" | "org";

interface Plan {
  key: string;
  name: string;
  badge?: string;
  monthlyPkr: number | null;
  yearlyPkr: number | null;
  features: string[];
  highlighted?: boolean;
  ctaLabel: string;
}

// ── Plan data ─────────────────────────────────────────────────────────────────

const TEACHER_PLANS: Plan[] = [
  {
    key:        "FREE",
    name:       "Free",
    monthlyPkr: null,
    yearlyPkr:  null,
    ctaLabel:   "Get started free",
    features: [
      "3 classrooms",
      "2 quizzes per classroom",
      "Basic proctoring",
      "Basic analytics",
      "Student enrollment",
    ],
  },
  {
    key:         "GOLD",
    name:        "Gold",
    badge:       "Popular",
    monthlyPkr:  249,
    yearlyPkr:   2499,
    highlighted: true,
    ctaLabel:    "Subscribe to Gold",
    features: [
      "20 classrooms",
      "10 quizzes per classroom",
      "AI quiz generation",
      "Full proctoring",
      "Advanced analytics",
      "Student enrollment",
    ],
  },
  {
    key:        "PLATINUM",
    name:       "Platinum",
    monthlyPkr: 499,
    yearlyPkr:  4999,
    ctaLabel:   "Subscribe to Platinum",
    features: [
      "50 classrooms",
      "15 quizzes per classroom",
      "AI quiz generation",
      "Full proctoring",
      "Advanced analytics",
      "Priority support",
    ],
  },
];

const ORG_PLANS: Plan[] = [
  {
    key:        "ORG_STARTER",
    name:       "Starter",
    monthlyPkr: 2499,
    yearlyPkr:  24990,
    ctaLabel:   "Start 15-day trial",
    features: [
      "Up to 8 teacher sub-accounts",
      "80 classrooms (org-wide)",
      "10 quizzes per classroom",
      "AI quiz generation",
      "Full proctoring",
      "Org analytics dashboard",
      "Email support",
    ],
  },
  {
    key:         "ORG_GROWTH",
    name:        "Growth",
    badge:       "Most popular",
    monthlyPkr:  5999,
    yearlyPkr:   59990,
    highlighted: true,
    ctaLabel:    "Start 15-day trial",
    features: [
      "Up to 30 teacher sub-accounts",
      "300 classrooms (org-wide)",
      "20 quizzes per classroom",
      "AI quiz generation",
      "Full proctoring",
      "Org analytics + custom branding",
      "Priority email support",
    ],
  },
  {
    key:        "ORG_ENTERPRISE",
    name:       "Enterprise",
    monthlyPkr: 13999,
    yearlyPkr:  139990,
    ctaLabel:   "Start 15-day trial",
    features: [
      "Unlimited teacher sub-accounts",
      "Unlimited classrooms",
      "Unlimited quizzes",
      "AI quiz generation",
      "Full proctoring",
      "API access + white-label",
      "Dedicated support channel",
      "99.9% SLA",
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <Suspense fallback={null}>
      <PricingContent />
    </Suspense>
  );
}

function PricingContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [period, setPeriod]     = useState<Period>("MONTHLY");
  const [audience, setAudience] = useState<Audience>("teacher");
  const [loading, setLoading]   = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const plans = audience === "teacher" ? TEACHER_PLANS : ORG_PLANS;

  // Auto-trigger checkout when redirected back after auth
  useEffect(() => {
    const pendingPlan   = searchParams.get("checkout");
    const pendingPeriod = (searchParams.get("period") ?? "MONTHLY") as Period;
    if (!pendingPlan || pendingPlan === "FREE") return;

    const allPlans = [...TEACHER_PLANS, ...ORG_PLANS];
    const plan = allPlans.find((p) => p.key === pendingPlan);
    if (!plan) return;

    if (pendingPlan.startsWith("ORG_")) setAudience("org");
    setPeriod(pendingPeriod);
    setLoading(pendingPlan);

    fetch("/api/payments/checkout", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ plan: pendingPlan, period: pendingPeriod }),
    })
      .then(async (res) => {
        if (res.status === 401) {
          router.push(`/register?callbackUrl=${encodeURIComponent(`/pricing?checkout=${pendingPlan}&period=${pendingPeriod}`)}`);
          return;
        }
        const data = await res.json();
        if (data.checkoutUrl) {
          window.location.assign(data.checkoutUrl);
        } else {
          setCheckoutError(data.error ?? "Payment session failed. Please try again.");
        }
      })
      .catch(() => setCheckoutError("Network error. Please check your connection."))
      .finally(() => setLoading(null));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubscribe(plan: Plan) {
    if (plan.key === "FREE") {
      router.push("/register");
      return;
    }
    setCheckoutError(null);
    setLoading(plan.key);
    try {
      const res = await fetch("/api/payments/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ plan: plan.key, period }),
      });

      if (res.status === 401) {
        router.push(`/register?callbackUrl=${encodeURIComponent(`/pricing?checkout=${plan.key}&period=${period}`)}`);
        return;
      }

      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
      } else {
        setCheckoutError(data.error ?? "Payment session failed. Please try again.");
      }
    } catch {
      setCheckoutError("Network error. Please check your connection.");
    } finally {
      setLoading(null);
    }
  }

  function price(plan: Plan): string {
    const pkr = period === "MONTHLY" ? plan.monthlyPkr : plan.yearlyPkr;
    if (pkr === null) return "Free";
    return `PKR ${pkr.toLocaleString()}`;
  }

  function priceSuffix(plan: Plan): string {
    if (plan.monthlyPkr === null) return "forever";
    return period === "MONTHLY" ? "/ month" : "/ year";
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#05050f]">
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="orb-1 absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #1d4ed8 0%, #1e40af 40%, transparent 70%)", filter: "blur(60px)" }} />
        <div className="orb-2 absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #3b82f6 0%, #2563eb 40%, transparent 70%)", filter: "blur(70px)" }} />
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: "linear-gradient(rgba(59,130,246,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.5) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">QuizNex</span>
        </Link>
        <Link href="/" className="flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
      </nav>

      {/* Content */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-8 md:px-8">

        {/* Checkout error */}
        {checkoutError && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm text-red-400">
            <span>✕</span>
            {checkoutError}
          </div>
        )}

        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-400">
            <Sparkles className="h-3.5 w-3.5" /> Simple, transparent pricing
          </div>
          <h1 className="text-4xl font-bold text-white md:text-5xl">
            Plans for every <span className="gradient-text">educator</span>
          </h1>
          <p className="mt-4 text-slate-400">
            Start free. Upgrade when you need more.
          </p>
        </div>

        {/* Audience toggle */}
        <div className="mb-8 flex justify-center">
          <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              onClick={() => setAudience("teacher")}
              className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
                audience === "teacher"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <GraduationCap className="h-4 w-4" /> Teachers
            </button>
            <button
              onClick={() => setAudience("org")}
              className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
                audience === "org"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Building2 className="h-4 w-4" /> Organizations
            </button>
          </div>
        </div>

        {/* Org trial banner */}
        {audience === "org" && (
          <div className="mb-8 rounded-2xl border border-blue-500/20 bg-blue-500/5 px-6 py-4 text-center text-sm text-blue-300">
            All organization plans include a <strong className="text-white">15-day free trial</strong> — no credit card required. Cancel anytime.
          </div>
        )}

        {/* Period toggle */}
        <div className="mb-10 flex items-center justify-center gap-3">
          <span className={`text-sm ${period === "MONTHLY" ? "text-white" : "text-slate-500"}`}>Monthly</span>
          <button
            onClick={() => setPeriod(p => p === "MONTHLY" ? "YEARLY" : "MONTHLY")}
            className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
              period === "YEARLY" ? "bg-blue-600" : "bg-white/15"
            }`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
              period === "YEARLY" ? "translate-x-5" : "translate-x-0.5"
            }`} />
          </button>
          <span className={`text-sm ${period === "YEARLY" ? "text-white" : "text-slate-500"}`}>
            Yearly
          </span>
          {period === "YEARLY" && (
            <span className="rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-medium text-green-400 ring-1 ring-green-500/20">
              Save ~17%
            </span>
          )}
        </div>

        {/* Plan cards */}
        <div className={`grid gap-6 ${plans.length === 3 ? "md:grid-cols-3" : "md:grid-cols-3"}`}>
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`relative flex flex-col rounded-2xl p-7 transition-all duration-300 ${
                plan.highlighted
                  ? "border border-blue-500/40 bg-blue-500/5 glow-blue"
                  : plan.key === "FREE"
                  ? "border border-red-500/30 bg-red-500/5"
                  : "glass-card"
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-linear-to-r from-blue-600 to-blue-400 px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-blue-500/30">
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Plan name */}
              <h3 className="text-lg font-semibold text-white">{plan.name}</h3>

              {/* Price */}
              <div className="mt-4 mb-6">
                <span className={`text-4xl font-bold ${plan.highlighted ? "gradient-text" : "text-white"}`}>
                  {price(plan)}
                </span>
                <span className="ml-2 text-sm text-slate-500">{priceSuffix(plan)}</span>
                {period === "YEARLY" && plan.yearlyPkr && (
                  <p className="mt-1 text-xs text-slate-500">
                    ≈ PKR {Math.round(plan.yearlyPkr / 12).toLocaleString()} / month
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => handleSubscribe(plan)}
                disabled={loading === plan.key}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                  plan.highlighted
                    ? "btn-gradient text-white shadow-lg shadow-blue-500/20"
                    : "border border-white/15 bg-white/5 text-slate-200 hover:border-white/30 hover:bg-white/10"
                }`}
              >
                {loading === plan.key && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading === plan.key ? "Redirecting…" : plan.ctaLabel}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ note */}
        <p className="mt-12 text-center text-sm text-slate-600">
          All prices in Pakistani Rupees (PKR). Questions?{" "}
          <a href="mailto:tools.sufiyan@gmail.com" className="text-blue-400 hover:underline">
            Contact us
          </a>
          . See our{" "}
          <Link href="/terms" className="text-blue-400 hover:underline">Terms</Link>
          {" "}and{" "}
          <Link href="/privacy" className="text-blue-400 hover:underline">Privacy Policy</Link>.
        </p>
      </main>
    </div>
  );
}
