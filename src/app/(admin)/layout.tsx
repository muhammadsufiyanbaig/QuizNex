"use server";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user)                    redirect("/login");
  if (session.user.role !== "ADMIN")     redirect("/");
  // 2FA is mandatory for admin — if not set up, force enrollment
  if (!session.user.twoFactorEnabled)    redirect("/settings?adminRequires2FA=1");

  return (
    <div className="flex min-h-screen bg-[#070b14]">
      <AdminSidebar user={session.user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/8 bg-[#0a0f1a]/80 px-6 backdrop-blur-sm sticky top-0 z-30">
          <span className="text-xs font-semibold tracking-widest text-red-400/80 uppercase">Admin Console</span>
          <span className="text-xs text-white/40">{session.user.email}</span>
        </header>
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
