import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import ProfilePage from "@/components/profile/profile-page";

export default async function StudentProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!user) redirect("/login");

  return (
    <ProfilePage
      name={user.name}
      email={user.email}
      role="STUDENT"
      image={user.image}
      twoFactorEnabled={user.twoFactorEnabled}
      createdAt={user.createdAt}
      hasPassword={!!user.passwordHash}
    />
  );
}
