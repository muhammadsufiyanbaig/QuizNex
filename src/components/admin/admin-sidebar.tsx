"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, School, BookOpen,
  AlertTriangle, ScrollText, Bell, LogOut, ShieldCheck,
} from "lucide-react";
import { signOut } from "next-auth/react";

const NAV = [
  { href: "/admin",              label: "Dashboard",     icon: LayoutDashboard },
  { href: "/admin/users",        label: "Users",         icon: Users           },
  { href: "/admin/classrooms",   label: "Classrooms",    icon: School          },
  { href: "/admin/quizzes",      label: "Quizzes",       icon: BookOpen        },
  { href: "/admin/flagged",      label: "Flagged",       icon: AlertTriangle   },
  { href: "/admin/audit-log",    label: "Audit Log",     icon: ScrollText      },
  { href: "/admin/notifications",label: "Notify",        icon: Bell            },
];

export default function AdminSidebar({ user }: { user: { name?: string | null; email?: string | null } }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 flex-col border-r border-white/8 bg-[#0a0f1a]">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 px-4 border-b border-white/8">
        <ShieldCheck className="h-5 w-5 text-red-400" />
        <span className="font-bold text-white text-sm">QuizNex Admin</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-red-500/15 text-red-400 font-medium"
                  : "text-white/50 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="border-t border-white/8 p-3">
        <p className="text-xs text-white/40 truncate mb-2 px-1">{user.email}</p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/50 hover:bg-white/5 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
