import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users, passkeys, webauthnChallenges } from "@/lib/db/schema";
import { getRpConfig } from "@/lib/auth/passkey";

export async function POST() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const userId = session!.user.id;

  // Fetch existing credentials to exclude
  const existing = await db
    .select({ credentialId: passkeys.credentialId, transports: passkeys.transports })
    .from(passkeys)
    .where(eq(passkeys.userId, userId));

  const [user] = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const { rpName, rpID } = getRpConfig();

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName:        user.email,
    userDisplayName: user.name,
    userID:          new Uint8Array(Buffer.from(userId, "utf8")),
    excludeCredentials: existing.map((pk) => ({
      id:         pk.credentialId,
      transports: pk.transports ? JSON.parse(pk.transports) : [],
    })),
    authenticatorSelection: {
      residentKey:          "preferred",
      userVerification:     "required",
      authenticatorAttachment: "platform",
    },
  });

  // Store challenge (5-min expiry)
  const [challenge] = await db
    .insert(webauthnChallenges)
    .values({
      challenge: options.challenge,
      userId,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    })
    .returning({ id: webauthnChallenges.id });

  return NextResponse.json({ options, challengeId: challenge.id });
}
