import { auth } from "@/auth";
import { redirect } from "next/navigation";

async function getStats() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/stats`, {
    cache: "no-store",
    headers: { cookie: "" },
  });
  if (!res.ok) return null;
  return res.json();
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/3 p-5">
      <p className="text-xs text-white/40 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </div>
  );
}

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  // Fetch directly from DB in server component for accuracy
  const { db } = await import("@/lib/db");
  const { users, classrooms, quizzes, quizAttempts, aiDocuments } = await import("@/lib/db/schema");
  const { count, eq, gte, sql } = await import("drizzle-orm");

  const since7d  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000);
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers, activeToday, newLast7d,
    totalClassrooms, totalQuizzes, activeQuizzes,
    totalAttempts, flaggedAttempts,
    aiDocs30d,
  ] = await Promise.all([
    db.select({ c: count() }).from(users).then(r => r[0].c),
    db.select({ c: count() }).from(users).where(gte(users.lastLoginAt, since24h)).then(r => r[0].c),
    db.select({ c: count() }).from(users).where(gte(users.createdAt, since7d)).then(r => r[0].c),
    db.select({ c: count() }).from(classrooms).then(r => r[0].c),
    db.select({ c: count() }).from(quizzes).then(r => r[0].c),
    db.select({ c: count() }).from(quizzes).where(eq(quizzes.status, "ACTIVE")).then(r => r[0].c),
    db.select({ c: count() }).from(quizAttempts).then(r => r[0].c),
    db.select({ c: count() }).from(quizAttempts).where(eq(quizAttempts.isFlagged, true)).then(r => r[0].c),
    db.select({ c: count() }).from(aiDocuments).where(gte(aiDocuments.uploadedAt, since30d)).then(r => r[0].c),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Overview</h1>
        <p className="text-sm text-white/40 mt-1">Real-time stats across all users and content</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users"       value={Number(totalUsers)}       sub={`+${Number(newLast7d)} this week`} />
        <StatCard label="Active Today"      value={Number(activeToday)}      sub="logged in last 24h" />
        <StatCard label="Classrooms"        value={Number(totalClassrooms)} />
        <StatCard label="Quizzes"           value={Number(totalQuizzes)}     sub={`${Number(activeQuizzes)} live now`} />
        <StatCard label="Total Attempts"    value={Number(totalAttempts)} />
        <StatCard
          label="Flagged Attempts"
          value={Number(flaggedAttempts)}
          sub={Number(flaggedAttempts) > 0 ? "⚠ needs review" : "all clear"}
        />
        <StatCard label="AI Docs (30d)"     value={Number(aiDocs30d)} />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Number(flaggedAttempts) > 0 && (
          <a
            href="/admin/flagged"
            className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 hover:bg-red-500/15 transition-colors"
          >
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-red-400">{Number(flaggedAttempts)} Flagged Attempts</p>
              <p className="text-xs text-red-400/60">Click to review</p>
            </div>
          </a>
        )}
        <a
          href="/admin/users"
          className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 p-4 hover:bg-white/5 transition-colors"
        >
          <span className="text-2xl">👥</span>
          <div>
            <p className="font-semibold text-white">Manage Users</p>
            <p className="text-xs text-white/40">{Number(totalUsers)} total accounts</p>
          </div>
        </a>
        <a
          href="/admin/audit-log"
          className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 p-4 hover:bg-white/5 transition-colors"
        >
          <span className="text-2xl">📋</span>
          <div>
            <p className="font-semibold text-white">Audit Log</p>
            <p className="text-xs text-white/40">All admin actions</p>
          </div>
        </a>
      </div>
    </div>
  );
}
