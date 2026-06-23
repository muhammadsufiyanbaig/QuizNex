import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as schema from "../src/lib/db/schema";

const ADMIN_EMAIL    = "admin@quiznex.com";
const ADMIN_NAME     = "Super Admin";
const ADMIN_PASSWORD = "QuizNex@Admin#2026!";

const ORG_EMAIL    = "org@quiznex.com";
const ORG_NAME     = "QuizNex Academy";
const ORG_PASSWORD = "OrgQuizNex@2026!";

async function seedAdmin(db: ReturnType<typeof drizzle>) {
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, ADMIN_EMAIL))
    .limit(1);

  if (existing.length > 0) {
    console.log("⚠ Admin already exists:", ADMIN_EMAIL);
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  await db.insert(schema.users).values({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    passwordHash,
    role: "ADMIN",
    status: "ACTIVE",
    emailVerified: true,
  });

  console.log("✓ Admin seeded");
  console.log("  Email   :", ADMIN_EMAIL);
  console.log("  Password:", ADMIN_PASSWORD);
}

async function seedOrganization(db: ReturnType<typeof drizzle>) {
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, ORG_EMAIL))
    .limit(1);

  if (existing.length > 0) {
    console.log("⚠ Organization already exists:", ORG_EMAIL);
    return;
  }

  const passwordHash = await bcrypt.hash(ORG_PASSWORD, 12);

  const [orgUser] = await db
    .insert(schema.users)
    .values({
      name: ORG_NAME,
      email: ORG_EMAIL,
      passwordHash,
      role: "ORGANIZATION",
      status: "ACTIVE",
      emailVerified: true,
    })
    .returning({ id: schema.users.id });

  await db.insert(schema.organizations).values({
    userId: orgUser.id,
    name: ORG_NAME,
    description: "Demo organization for QuizNex platform.",
    contactEmail: ORG_EMAIL,
  });

  await db.insert(schema.subscriptions).values({
    userId: orgUser.id,
    plan: "ORG_STARTER",
    status: "ACTIVE",
  });

  console.log("✓ Organization seeded");
  console.log("  Email   :", ORG_EMAIL);
  console.log("  Password:", ORG_PASSWORD);
  console.log("  Plan    : ORG_STARTER");
}

async function main() {
  const sql = neon(process.env.NEON_DATABASE_URL!);
  const db = drizzle(sql, { schema });

  await seedAdmin(db);
  await seedOrganization(db);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
