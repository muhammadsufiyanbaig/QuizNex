import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import TwoFactorSettings from "./two-factor-settings";
import PasskeySettings   from "./passkey-settings";

export default async function SecuritySettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [user] = await db
    .select({ twoFactorEnabled: users.twoFactorEnabled })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Security Settings</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage your account security and authentication preferences.
        </p>
      </div>

      <TwoFactorSettings
        isEnabled={user?.twoFactorEnabled ?? false}
        userEmail={session.user.email ?? ""}
      />

      <PasskeySettings />
    </div>
  );
}
