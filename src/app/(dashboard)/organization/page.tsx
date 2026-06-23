import { auth } from "@/auth";
import { db } from "@/lib/db";
import { orgTeachers, organizations, users } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, Users, UserCheck, ArrowRight, Zap } from "lucide-react";
import { getActiveSubscription } from "@/lib/plans/subscription";

export default async function OrganizationDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.userId, userId))
    .limit(1);

  let activeTeacherCount = 0;
  let pendingTeacherCount = 0;
  let recentTeachers: { name: string; email: string; status: string; invitedAt: Date }[] = [];

  if (org) {
    const [active] = await db
      .select({ count: count() })
      .from(orgTeachers)
      .where(eq(orgTeachers.orgId, org.id));
    activeTeacherCount = Number(active?.count ?? 0);

    const [pending] = await db
      .select({ count: count() })
      .from(orgTeachers)
      .where(eq(orgTeachers.orgId, org.id));
    pendingTeacherCount = Number(pending?.count ?? 0);

    const rows = await db
      .select({
        name: users.name,
        email: users.email,
        status: orgTeachers.status,
        invitedAt: orgTeachers.invitedAt,
      })
      .from(orgTeachers)
      .innerJoin(users, eq(orgTeachers.teacherId, users.id))
      .where(eq(orgTeachers.orgId, org.id))
      .orderBy(orgTeachers.invitedAt)
      .limit(5);

    recentTeachers = rows.map((r) => ({
      name: r.name,
      email: r.email,
      status: r.status,
      invitedAt: r.invitedAt,
    }));
  }

  const firstName    = session.user.name?.split(" ")[0] ?? "Admin";
  const subscription = await getActiveSubscription(userId, "ORGANIZATION");

  const planLabel: Record<string, string> = {
    ORG_STARTER: "Starter", ORG_GROWTH: "Growth", ORG_ENTERPRISE: "Enterprise",
  };
  const planColor: Record<string, string> = {
    ORG_STARTER:    "text-blue-400 bg-blue-500/10 ring-blue-500/20",
    ORG_GROWTH:     "text-violet-400 bg-violet-500/10 ring-violet-500/20",
    ORG_ENTERPRISE: "text-amber-400 bg-amber-500/10 ring-amber-500/20",
  };

  const trialDaysLeft = subscription.status === "TRIAL" && subscription.trialEndsAt
    ? Math.max(0, Math.ceil((subscription.trialEndsAt.getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Welcome, {firstName}!</h1>
        <p className="mt-1 text-sm text-slate-400">
          {org ? org.name : "Set up your organization to get started."}
        </p>
      </div>

      {/* Plan Status */}
      <div className="glass-card rounded-2xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-500/25">
            <Zap className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Current Plan</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${planColor[subscription.plan] ?? "text-slate-400 bg-slate-500/10 ring-slate-500/20"}`}>
                {planLabel[subscription.plan] ?? subscription.plan}
              </span>
              {subscription.status === "TRIAL" && trialDaysLeft !== null && (
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                  trialDaysLeft <= 3
                    ? "bg-red-500/10 text-red-400 ring-red-500/20"
                    : "bg-amber-500/10 text-amber-400 ring-amber-500/20"
                }`}>
                  Trial · {trialDaysLeft}d left
                </span>
              )}
              {subscription.isExpired && (
                <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-400 ring-1 ring-red-500/20">Expired</span>
              )}
              {subscription.status === "ACTIVE" && subscription.currentPeriodEnd && (
                <span className="text-xs text-slate-500">
                  renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
        {(subscription.isExpired || subscription.status === "TRIAL") && (
          <Link href="/pricing" className="btn-gradient shrink-0 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/20">
            {subscription.isExpired ? "Renew" : "Upgrade"}
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="glass-card rounded-2xl p-6 flex items-center gap-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-500/25">
            <UserCheck className="h-6 w-6 text-violet-400" />
          </div>
          <div>
            <p className="text-3xl font-bold text-white">{activeTeacherCount}</p>
            <p className="text-sm text-slate-400">Teachers</p>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-6 flex items-center gap-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-500/25">
            <Users className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <p className="text-3xl font-bold text-white">{pendingTeacherCount}</p>
            <p className="text-sm text-slate-400">Total Invitations</p>
          </div>
        </div>
      </div>

      {/* Recent Teachers */}
      <div className="glass-card rounded-2xl p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-semibold text-white">Teachers</h2>
          <Link
            href="/organization/teachers"
            className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Manage <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {!org || recentTeachers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-500/10">
              <Building2 className="h-7 w-7 text-slate-500" />
            </div>
            <p className="text-sm text-slate-400">
              {!org ? "Complete your organization profile to invite teachers." : "No teachers yet."}
            </p>
            <Link
              href="/organization/profile"
              className="btn-gradient rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20"
            >
              {!org ? "Set Up Organization" : "Invite Teachers"}
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTeachers.map((t, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-4 py-3.5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-violet-700/20 text-sm font-semibold text-violet-300 ring-1 ring-white/10">
                    {t.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.email}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  t.status === "ACTIVE"
                    ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/20"
                    : t.status === "PENDING"
                    ? "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20"
                    : "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
                }`}>
                  {t.status.charAt(0) + t.status.slice(1).toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
