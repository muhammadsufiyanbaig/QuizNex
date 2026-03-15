import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { db } from "@/lib/db";
import { webauthnChallenges } from "@/lib/db/schema";
import { getRpConfig } from "@/lib/auth/passkey";

// Public endpoint — no auth required.
// Uses discoverable credentials (empty allowCredentials) so any registered
// passkey for this RP can be used.
export async function POST() {
  const { rpID } = getRpConfig();

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: [], // discoverable — browser shows all passkeys for this site
  });

  const [challenge] = await db
    .insert(webauthnChallenges)
    .values({
      challenge: options.challenge,
      userId:    null,  // unknown until verify
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    })
    .returning({ id: webauthnChallenges.id });

  return NextResponse.json({ options, challengeId: challenge.id });
}
