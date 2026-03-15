import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { passkeys, webauthnChallenges, passkeyTokens } from "@/lib/db/schema";
import { getRpConfig, base64urlToUint8Array } from "@/lib/auth/passkey";
import { generateToken } from "@/lib/auth/utils";

const schema = z.object({
  challengeId: z.string().uuid(),
  response:    z.any(),
});

export async function POST(req: NextRequest) {
  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 422 });

  const { challengeId, response } = parsed.data;

  // Fetch challenge
  const [challengeRow] = await db
    .select()
    .from(webauthnChallenges)
    .where(
      and(
        eq(webauthnChallenges.id, challengeId),
        gt(webauthnChallenges.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!challengeRow) {
    return NextResponse.json({ error: "Challenge not found or expired." }, { status: 400 });
  }

  // Find passkey by credential ID from the response
  const credentialId = response?.id as string | undefined;
  if (!credentialId) {
    return NextResponse.json({ error: "Missing credential ID." }, { status: 400 });
  }

  const [passkey] = await db
    .select()
    .from(passkeys)
    .where(eq(passkeys.credentialId, credentialId))
    .limit(1);

  if (!passkey) {
    return NextResponse.json({ error: "Passkey not registered." }, { status: 404 });
  }

  const { rpID, origin } = getRpConfig();

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge:     challengeRow.challenge,
      expectedOrigin:        origin,
      expectedRPID:          rpID,
      requireUserVerification: true,
      credential: {
        id:         passkey.credentialId,
        publicKey:  base64urlToUint8Array(passkey.publicKey),
        counter:    passkey.counter,
        transports: passkey.transports ? JSON.parse(passkey.transports) : [],
      },
    });
  } catch (e) {
    return NextResponse.json({ error: `Verification failed: ${(e as Error).message}` }, { status: 400 });
  }

  if (!verification.verified) {
    return NextResponse.json({ error: "Passkey authentication failed." }, { status: 400 });
  }

  // Update counter + lastUsedAt
  await db
    .update(passkeys)
    .set({
      counter:    verification.authenticationInfo.newCounter,
      lastUsedAt: new Date(),
    })
    .where(eq(passkeys.id, passkey.id));

  // Delete used challenge
  await db.delete(webauthnChallenges).where(eq(webauthnChallenges.id, challengeId));

  // Issue one-time token (2-minute expiry)
  const token = generateToken(32);
  await db.insert(passkeyTokens).values({
    userId:    passkey.userId,
    token,
    expiresAt: new Date(Date.now() + 2 * 60 * 1000),
  });

  return NextResponse.json({ verified: true, passkeyToken: token });
}
