import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import ProfilePage from "@/components/profile/profile-page";
import { getActiveSubscription } from "@/lib/plans/subscription";

export default async function TeacherProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!user) redirect("/login");

  const sub = await getActiveSubscription(session.user.id, "TEACHER");
  const subscription = {
    plan:             sub.plan,
    status:           sub.status,
    isExpired:        sub.isExpired,
    trialEndsAt:      sub.trialEndsAt?.toISOString() ?? null,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
  };

  return (
    <ProfilePage
      name={user.name}
      email={user.email}
      role="TEACHER"
      image={user.image}
      twoFactorEnabled={user.twoFactorEnabled}
      createdAt={user.createdAt}
      hasPassword={!!user.passwordHash}
      subscription={subscription}
    />
  );
}
