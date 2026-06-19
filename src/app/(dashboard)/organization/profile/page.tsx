import { auth } from "@/auth";
import { db } from "@/lib/db";
import { organizations, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import OrgProfileClient from "./org-profile-client";

export default async function OrgProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [user] = await db
    .select({ name: users.name, email: users.email, twoFactorEnabled: users.twoFactorEnabled, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) redirect("/login");

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.userId, session.user.id))
    .limit(1);

  return (
    <OrgProfileClient
      user={{ name: user.name, email: user.email, twoFactorEnabled: user.twoFactorEnabled, createdAt: user.createdAt }}
      org={org ?? null}
    />
  );
}
