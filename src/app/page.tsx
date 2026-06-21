"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Zap, Brain, Shield, BarChart3, Users, BookOpen,
  ArrowRight, GraduationCap, Building2, Sparkles,
  Eye, Clock, CheckCircle, Menu, X, ChevronRight,
  FileText, Lock, Trophy, Wifi,
} from "lucide-react";

// ── Navbar ────────────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen]         = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-[#05050f]/90 backdrop-blur-xl border-b border-white/8 shadow-2xl shadow-black/50" : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30">
            <Zap className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight gradient-text">QuizNex</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm">
          {[
            { label: "Features",  href: "#features"  },
            { label: "How It Works", href: "#how"   },
            { label: "Roles",     href: "#roles"     },
          ].map(({ label, href }) => (
            <a key={label} href={href}
              className="text-white/60 hover:text-white transition-colors duration-200">
              {label}
            </a>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login"
            className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors">
            Sign in
          </Link>
          <Link href="/register"
            className="btn-gradient px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-500/25">
            Get started free
          </Link>
        </div>

        {/* Mobile menu button */}
        <button onClick={() => setOpen(v => !v)}
          className="md:hidden p-2 rounded-lg text-white/60 hover:text-white transition-colors">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/8 bg-[#05050f]/95 backdrop-blur-xl px-6 py-4 space-y-3">
          {[{ label: "Features", href: "#features" }, { label: "How It Works", href: "#how" }, { label: "Roles", href: "#roles" }].map(({ label, href }) => (
            <a key={label} href={href} onClick={() => setOpen(false)}
              className="block py-2 text-sm text-white/70 hover:text-white transition-colors">{label}</a>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/login" className="py-2.5 text-center text-sm font-medium text-white/70 hover:text-white border border-white/10 rounded-xl transition-colors">Sign in</Link>
            <Link href="/register" className="btn-gradient py-2.5 text-center text-sm font-semibold text-white rounded-xl">Get started free</Link>
          </div>
        </div>
      )}
    </header>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 pb-16 overflow-hidden">
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="orb-1 absolute -top-40 -left-40 h-[700px] w-[700px] rounded-full opacity-25"
          style={{ background: "radial-gradient(circle, #1d4ed8 0%, #1e40af 40%, transparent 70%)", filter: "blur(80px)" }} />
        <div className="orb-2 absolute top-1/3 -right-40 h-[600px] w-[600px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #818cf8 0%, #6366f1 40%, transparent 70%)", filter: "blur(80px)" }} />
        <div className="orb-3 absolute -bottom-40 left-1/3 h-[500px] w-[500px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #3b82f6 0%, #2563eb 50%, transparent 70%)", filter: "blur(70px)" }} />
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(rgba(59,130,246,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-semibold mb-8 animate-fade-in-up">
          <Sparkles className="h-3.5 w-3.5" />
          AI-Powered Education Platform
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold text-white leading-[1.08] tracking-tight mb-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          Create. Proctor.{" "}
          <span className="gradient-text">Analyze.</span>
          <br />
          <span className="text-white/80">All with AI.</span>
        </h1>

        {/* Subheading */}
        <p className="max-w-2xl mx-auto text-lg text-white/50 leading-relaxed mb-10 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          QuizNex combines AI-powered quiz generation, real-time proctoring with face detection,
          and deep analytics — in one platform built for teachers, students, and institutions.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          <Link href="/register"
            className="btn-gradient flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold text-white shadow-xl shadow-blue-500/30">
            Start for free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/login"
            className="flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-medium text-white/70 border border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20 hover:text-white transition-all duration-200">
            Sign in
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Social proof */}
        <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-white/30 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
          {[
            { icon: Shield,      text: "Enterprise-grade security" },
            { icon: Brain,       text: "AI question generation"    },
            { icon: Eye,         text: "Real-time proctoring"      },
            { icon: BarChart3,   text: "Deep analytics"            },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-blue-500/60" />
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* Hero visual */}
        <div className="mt-20 relative animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
          <div className="mx-auto max-w-4xl glass-card rounded-3xl p-1 glow-blue">
            <div className="rounded-[20px] bg-[#0a0f1a] overflow-hidden">
              {/* Fake browser bar */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
                <div className="flex gap-1.5">
                  {["bg-red-500/60","bg-yellow-500/60","bg-green-500/60"].map(c => (
                    <div key={c} className={`h-3 w-3 rounded-full ${c}`} />
                  ))}
                </div>
                <div className="flex-1 mx-4 h-5 rounded-md bg-white/5 flex items-center px-3">
                  <span className="text-xs text-white/20">quiznex.app/teacher</span>
                </div>
              </div>
              {/* Dashboard mockup */}
              <div className="p-6 grid grid-cols-3 gap-4">
                {[
                  { label: "Active Quizzes",    value: "12",   color: "text-blue-400"   },
                  { label: "Total Students",    value: "284",  color: "text-green-400"  },
                  { label: "Flagged Attempts",  value: "3",    color: "text-yellow-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-xl border border-white/6 bg-white/3 p-4">
                    <p className="text-xs text-white/40 mb-1">{label}</p>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  </div>
                ))}
                <div className="col-span-3 rounded-xl border border-white/6 bg-white/3 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-white/70">Recent AI-Generated Quiz</span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/15 text-green-400">Active</span>
                  </div>
                  <div className="space-y-2">
                    {["What is photosynthesis?", "Name the planets in the solar system.", "Explain Newton's third law."].map((q, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/3">
                        <span className="text-xs text-white/30 w-4">{i+1}.</span>
                        <span className="text-xs text-white/60">{q}</span>
                        <CheckCircle className="ml-auto h-3.5 w-3.5 text-blue-400/60 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function Stats() {
  return (
    <section className="relative py-12 border-y border-white/5">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "10x",    label: "Faster quiz creation with AI"    },
            { value: "99.9%",  label: "Platform uptime SLA"             },
            { value: "256-bit",label: "AES encryption for all data"     },
            { value: "3",      label: "Role types — Student, Teacher, Org" },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl font-bold gradient-text mb-1">{value}</p>
              <p className="text-xs text-white/40">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Brain,
    color: "from-blue-500/20 to-blue-600/5",
    ring: "ring-blue-500/20",
    iconColor: "text-blue-400",
    title: "AI Quiz Generation",
    desc: "Generate MCQ and Q&A questions from any topic or uploaded document in seconds. Powered by Claude AI with structured output validation.",
  },
  {
    icon: Eye,
    color: "from-purple-500/20 to-purple-600/5",
    ring: "ring-purple-500/20",
    iconColor: "text-purple-400",
    title: "Real-Time Proctoring",
    desc: "Live face detection, tab-switch monitoring, and multiple-face alerts keep your assessments honest without invasive software.",
  },
  {
    icon: BookOpen,
    color: "from-indigo-500/20 to-indigo-600/5",
    ring: "ring-indigo-500/20",
    iconColor: "text-indigo-400",
    title: "Classroom Management",
    desc: "Create classrooms, invite students via join keys, assign quizzes, and track progress — all in a clean teacher dashboard.",
  },
  {
    icon: BarChart3,
    color: "from-green-500/20 to-green-600/5",
    ring: "ring-green-500/20",
    iconColor: "text-green-400",
    title: "Deep Analytics",
    desc: "Per-question difficulty analysis, attempt heat maps, score distributions, and CSV exports for offline processing.",
  },
  {
    icon: Shield,
    color: "from-red-500/20 to-red-600/5",
    ring: "ring-red-500/20",
    iconColor: "text-red-400",
    title: "Bank-Level Security",
    desc: "AES-256-GCM TOTP encryption, passkey support, rate limiting, CSP headers, and an immutable admin audit log.",
  },
  {
    icon: Clock,
    color: "from-amber-500/20 to-amber-600/5",
    ring: "ring-amber-500/20",
    iconColor: "text-amber-400",
    title: "Timed Assessments",
    desc: "Server-enforced time limits with countdown timers, auto-submit on expiry, and tamper-proof elapsed-time tracking.",
  },
];

function Features() {
  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/50 text-xs font-medium mb-4">
            <Sparkles className="h-3 w-3" /> Everything you need
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Built for serious <span className="gradient-text">education</span>
          </h2>
          <p className="max-w-xl mx-auto text-white/40 text-lg">
            Every feature is designed to make teaching more effective and learning more accountable.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, color, ring, iconColor, title, desc }) => (
            <div key={title} className="feature-card rounded-2xl p-6 group">
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${color} ring-1 ${ring} mb-4`}>
                <Icon className={`h-6 w-6 ${iconColor}`} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────

const STEPS = [
  {
    n: "01",
    icon: Users,
    iconColor: "text-blue-400",
    ring: "ring-blue-500/30",
    bg: "bg-blue-500/10",
    title: "Create your account",
    desc: "Sign up as a Teacher, Student, or Organization in under a minute. Enable 2FA for maximum security.",
  },
  {
    n: "02",
    icon: Brain,
    iconColor: "text-purple-400",
    ring: "ring-purple-500/30",
    bg: "bg-purple-500/10",
    title: "Generate or import quizzes",
    desc: "Describe a topic or upload a PDF/document. Our AI builds a full quiz with scoring rubrics in seconds.",
  },
  {
    n: "03",
    icon: Trophy,
    iconColor: "text-green-400",
    ring: "ring-green-500/30",
    bg: "bg-green-500/10",
    title: "Run, proctor & analyze",
    desc: "Students attempt live quizzes under real-time proctoring. Review results, flag anomalies, export reports.",
  },
];

function HowItWorks() {
  return (
    <section id="how" className="py-24 relative">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)", filter: "blur(100px)" }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/50 text-xs font-medium mb-4">
            <Wifi className="h-3 w-3" /> Simple workflow
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Up and running in <span className="gradient-text">3 steps</span>
          </h2>
          <p className="max-w-xl mx-auto text-white/40 text-lg">
            No complex setup. No training required. Just sign up and start.
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Connector line */}
          <div className="hidden md:block absolute top-14 left-[calc(16.6%+2rem)] right-[calc(16.6%+2rem)] h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

          {STEPS.map(({ n, icon: Icon, iconColor, ring, bg, title, desc }) => (
            <div key={n} className="relative text-center">
              <div className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl ${bg} ring-1 ${ring} mb-6 relative`}>
                <Icon className={`h-7 w-7 ${iconColor}`} />
                <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[#0a0f1a] border border-white/10 text-xs font-bold text-white/50 flex items-center justify-center">
                  {n.slice(1)}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
              <p className="text-sm text-white/40 leading-relaxed max-w-xs mx-auto">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Roles ─────────────────────────────────────────────────────────────────────

const ROLES = [
  {
    icon: GraduationCap,
    gradient: "from-blue-600/30 via-blue-500/10 to-transparent",
    border: "border-blue-500/20 hover:border-blue-500/40",
    iconBg: "bg-blue-500/15 ring-blue-500/30",
    iconColor: "text-blue-400",
    badge: "Student",
    badgeColor: "bg-blue-500/15 text-blue-400",
    title: "For Students",
    desc: "Join classrooms, take AI-proctored quizzes, and track your performance over time with detailed score breakdowns.",
    perks: ["Instant quiz access via join key", "Real-time result feedback", "Performance history & streaks"],
    cta: "Join as student",
    href: "/register",
  },
  {
    icon: BookOpen,
    gradient: "from-indigo-600/30 via-indigo-500/10 to-transparent",
    border: "border-indigo-500/20 hover:border-indigo-500/40",
    iconBg: "bg-indigo-500/15 ring-indigo-500/30",
    iconColor: "text-indigo-400",
    badge: "Teacher",
    badgeColor: "bg-indigo-500/15 text-indigo-400",
    title: "For Teachers",
    desc: "Create AI-powered quizzes in seconds, manage multiple classrooms, proctor live, and export analytics reports.",
    perks: ["AI quiz from topic or document", "Live proctoring dashboard", "CSV analytics export"],
    cta: "Start teaching",
    href: "/register",
    featured: true,
  },
  {
    icon: Building2,
    gradient: "from-violet-600/30 via-violet-500/10 to-transparent",
    border: "border-violet-500/20 hover:border-violet-500/40",
    iconBg: "bg-violet-500/15 ring-violet-500/30",
    iconColor: "text-violet-400",
    badge: "Organization",
    badgeColor: "bg-violet-500/15 text-violet-400",
    title: "For Organizations",
    desc: "Oversee all teachers and classrooms under your institution. Access platform-wide analytics and manage at scale.",
    perks: ["Institution-wide analytics", "Teacher oversight panel", "Bulk student management"],
    cta: "Set up org",
    href: "/register",
  },
];

function Roles() {
  return (
    <section id="roles" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/50 text-xs font-medium mb-4">
            <Users className="h-3 w-3" /> Built for everyone
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            One platform, <span className="gradient-text">every role</span>
          </h2>
          <p className="max-w-xl mx-auto text-white/40 text-lg">
            Each role gets a tailored experience — the right tools, the right data, the right access.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ROLES.map(({ icon: Icon, gradient, border, iconBg, iconColor, badge, badgeColor, title, desc, perks, cta, href, featured }) => (
            <div key={title}
              className={`relative rounded-2xl border p-8 transition-all duration-300 ${border} ${
                featured ? "bg-gradient-to-b from-indigo-500/10 to-transparent shadow-xl shadow-indigo-500/10 scale-[1.02]" : "bg-white/2 hover:bg-white/4"
              }`}
            >
              {featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 text-xs font-bold text-white shadow-lg shadow-indigo-500/30">
                  Most Popular
                </div>
              )}
              <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${iconBg} ring-1 mb-6`}>
                <Icon className={`h-7 w-7 ${iconColor}`} />
              </div>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeColor} mb-3`}>{badge}</span>
              <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
              <p className="text-sm text-white/40 leading-relaxed mb-6">{desc}</p>
              <ul className="space-y-2.5 mb-8">
                {perks.map(p => (
                  <li key={p} className="flex items-center gap-2.5 text-sm text-white/60">
                    <CheckCircle className="h-4 w-4 text-green-400/70 shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
              <Link href={href}
                className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  featured
                    ? "btn-gradient text-white shadow-lg shadow-blue-500/20"
                    : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                }`}>
                {cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────

function CTA() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <div className="relative rounded-3xl overflow-hidden p-16 glass-card glow-blue">
          {/* Inner glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full opacity-20"
              style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)", filter: "blur(60px)" }} />
          </div>

          <div className="relative">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-2xl shadow-blue-500/40 mb-8">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Ready to transform<br />
              <span className="gradient-text">your quizzes?</span>
            </h2>
            <p className="text-white/40 text-lg mb-10 max-w-lg mx-auto">
              Join teachers and students who use QuizNex to run smarter, fairer assessments.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register"
                className="btn-gradient flex items-center gap-2 px-10 py-4 rounded-2xl text-base font-semibold text-white shadow-xl shadow-blue-500/30">
                Get started for free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login"
                className="flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-medium text-white/60 hover:text-white transition-colors">
                Already have an account?
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-white/6 py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold gradient-text">QuizNex</span>
            </div>
            <p className="text-sm text-white/30 leading-relaxed max-w-52">
              AI-powered quiz platform for modern education.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">Product</p>
            <ul className="space-y-3">
              {[
                { label: "Features",    href: "#features" },
                { label: "How it works",href: "#how"      },
                { label: "Roles",       href: "#roles"    },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a href={href} className="text-sm text-white/40 hover:text-white/70 transition-colors">{label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">Account</p>
            <ul className="space-y-3">
              {[
                { label: "Sign in",      href: "/login"    },
                { label: "Register",     href: "/register" },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="text-sm text-white/40 hover:text-white/70 transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">Legal</p>
            <ul className="space-y-3">
              {[
                { label: "Privacy Policy",      href: "/privacy" },
                { label: "Terms of Service",    href: "/terms"   },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="text-sm text-white/40 hover:text-white/70 transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/25">
          <p>© {new Date().getFullYear()} QuizNex. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy Policy</Link>
            <Link href="/terms"   className="hover:text-white/50 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#05050f] text-white">
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <Roles />
      <CTA />
      <Footer />
    </div>
  );
}
