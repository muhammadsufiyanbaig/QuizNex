"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BarChart2,
  BookOpen,
  Building2,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  UserRound,
  Users,
  Zap,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import type { Role } from "@/types/auth";
import type { ActiveSubscription } from "@/lib/plans/subscription";
type Sub = Pick<ActiveSubscription, "plan" | "status" | "isExpired" | "trialEndsAt">;

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

function getNavItems(role: Role | null): NavItem[] {
  if (role === "STUDENT") {
    return [
      { label: "Dashboard",    href: "/student",                icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: "Classrooms",   href: "/student/classrooms",     icon: <BookOpen className="h-4 w-4" /> },
      { label: "Quiz History", href: "/student/quiz-history",   icon: <ClipboardList className="h-4 w-4" /> },
      { label: "Profile",      href: "/student/profile",        icon: <UserRound className="h-4 w-4" /> },
    ];
  }
  if (role === "TEACHER") {
    return [
      { label: "Dashboard",  href: "/teacher",            icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: "Classrooms", href: "/teacher/classrooms", icon: <BookOpen className="h-4 w-4" /> },
      { label: "Profile",    href: "/teacher/profile",    icon: <UserRound className="h-4 w-4" /> },
    ];
  }
  if (role === "ORGANIZATION") {
    return [
      { label: "Dashboard",  href: "/organization",            icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: "Teachers",   href: "/organization/teachers",   icon: <Users className="h-4 w-4" /> },
      { label: "Students",   href: "/organization/students",   icon: <GraduationCap className="h-4 w-4" /> },
      { label: "Analytics",  href: "/organization/analytics",  icon: <BarChart2 className="h-4 w-4" /> },
      { label: "Profile",    href: "/organization/profile",    icon: <UserRound className="h-4 w-4" /> },
    ];
  }
  return [];
}

function getRoleIcon(role: Role | null) {
  if (role === "STUDENT")      return <GraduationCap className="h-4 w-4 text-blue-400" />;
  if (role === "TEACHER")      return <BookOpen className="h-4 w-4 text-indigo-400" />;
  if (role === "ORGANIZATION") return <Building2 className="h-4 w-4 text-violet-400" />;
  return null;
}

function getRoleBadgeClass(role: Role | null) {
  if (role === "STUDENT")      return "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20";
  if (role === "TEACHER")      return "bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20";
  if (role === "ORGANIZATION") return "bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20";
  return "bg-slate-500/10 text-slate-400";
}

type SidebarUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: Role | null;
};

function NavLink({ item, pathname, onClick }: { item: NavItem; pathname: string; onClick?: () => void }) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
        isActive
          ? "bg-blue-500/15 text-white ring-1 ring-blue-500/20"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
      }`}
    >
      <span className={isActive ? "text-blue-400" : ""}>{item.icon}</span>
      {item.label}
    </Link>
  );
}

const PLAN_LABEL: Record<string, string> = {
  FREE: "Free", GOLD: "Gold", PLATINUM: "Platinum",
  ORG_STARTER: "Starter", ORG_GROWTH: "Growth", ORG_ENTERPRISE: "Enterprise",
};
const PLAN_COLOR: Record<string, string> = {
  FREE:           "bg-red-500/15 text-red-400 ring-red-500/25",
  GOLD:           "bg-yellow-500/15 text-yellow-400 ring-yellow-500/25",
  PLATINUM:       "bg-cyan-500/15 text-cyan-400 ring-cyan-500/25",
  ORG_STARTER:    "bg-blue-500/15 text-blue-400 ring-blue-500/25",
  ORG_GROWTH:     "bg-violet-500/15 text-violet-400 ring-violet-500/25",
  ORG_ENTERPRISE: "bg-amber-500/15 text-amber-400 ring-amber-500/25",
};

export default function Sidebar({ user, subscription }: { user: SidebarUser; subscription?: Sub | null }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = getNavItems((user.role as Role | null) ?? null);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-white/8">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight gradient-text">QuizNex</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            onClick={() => setMobileOpen(false)}
          />
        ))}

        {/* Settings section */}
        <div className="pt-3 mt-3 border-t border-white/8">
          <p className="px-3 mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
            Settings
          </p>
          <NavLink
            item={{ label: "Security", href: "/settings/security", icon: <ShieldCheck className="h-4 w-4" /> }}
            pathname={pathname}
            onClick={() => setMobileOpen(false)}
          />
        </div>
      </nav>

      {/* User section */}
      <div className="border-t border-white/8 p-3 space-y-1">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/30 to-blue-700/30 ring-1 ring-white/10 text-sm font-semibold text-blue-300">
            {user.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user.name ?? "User"}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
        </div>
        {user.role && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-1.5 flex-wrap">
            {getRoleIcon(user.role as Role)}
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getRoleBadgeClass(user.role as Role)}`}>
              {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
            </span>
            {subscription && (
              <Link
                href="/pricing"
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 transition-opacity hover:opacity-80 ${PLAN_COLOR[subscription.plan] ?? PLAN_COLOR.FREE}`}
              >
                {subscription.isExpired
                  ? "Expired"
                  : subscription.status === "TRIAL"
                  ? `Trial · ${Math.max(0, Math.ceil(((subscription.trialEndsAt?.getTime() ?? 0) - Date.now()) / 86_400_000))}d`
                  : (PLAN_LABEL[subscription.plan] ?? subscription.plan)}
              </Link>
            )}
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-red-500/8 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-slate-900/90 text-slate-400 backdrop-blur lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-white/8 bg-[#0a0f1a] transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-slate-300"
        >
          <X className="h-4 w-4" />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-white/8 bg-[#0a0f1a]">
        {sidebarContent}
      </aside>
    </>
  );
}
