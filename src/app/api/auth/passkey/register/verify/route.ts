import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { passkeys, webauthnChallenges } from "@/lib/db/schema";
import { getRpConfig, uint8ArrayToBase64url } from "@/lib/auth/passkey";

const schema = z.object({
  challengeId: z.string().uuid(),
  name:        z.string().min(1).max(100).default("Passkey"),
  response:    z.any(),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 422 });

  const { challengeId, name, response } = parsed.data;
  const userId = session!.user.id;

  // Fetch + validate challenge
  const [challengeRow] = await db
    .select()
    .from(webauthnChallenges)
    .where(
      and(
        eq(webauthnChallenges.id, challengeId),
        eq(webauthnChallenges.userId, userId),
        gt(webauthnChallenges.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!challengeRow) {
    return NextResponse.json({ error: "Challenge not found or expired." }, { status: 400 });
  }

  const { rpID, origin } = getRpConfig();

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge:     challengeRow.challenge,
      expectedOrigin:        origin,
      expectedRPID:          rpID,
      requireUserVerification: true,
    });
  } catch (e) {
    return NextResponse.json({ error: `Verification failed: ${(e as Error).message}` }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Passkey verification failed." }, { status: 400 });
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

  // Delete used challenge
  await db.delete(webauthnChallenges).where(eq(webauthnChallenges.id, challengeId));

  // Save passkey
  await db.insert(passkeys).values({
    userId,
    credentialId: credential.id,
    publicKey:    uint8ArrayToBase64url(credential.publicKey),
    counter:      credential.counter,
    deviceType:   credentialDeviceType,
    backedUp:     credentialBackedUp,
    transports:   credential.transports ? JSON.stringify(credential.transports) : null,
    name,
  });

  return NextResponse.json({ verified: true });
}
