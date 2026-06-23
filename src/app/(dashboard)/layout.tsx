import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/dashboard/sidebar";
import NotificationBell from "@/components/dashboard/notification-bell";
import { getActiveSubscription } from "@/lib/plans/subscription";
import type { Role } from "@/types/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role as Role | null;
  const subscription =
    role === "TEACHER" || role === "ORGANIZATION"
      ? await getActiveSubscription(session.user.id, role)
      : null;

  return (
    <div className="flex min-h-screen">
      <Sidebar user={session.user} subscription={subscription} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-end gap-3 border-b border-white/8 bg-[#0a0f1a]/80 px-6 backdrop-blur-sm sticky top-0 z-30">
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
