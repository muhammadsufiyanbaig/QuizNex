import crypto from "crypto";

const HOST =
  process.env.SAFEPAY_ENV === "production"
    ? "https://api.getsafepay.com"
    : "https://sandbox.api.getsafepay.com";

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.SAFEPAY_SECRET_KEY}`,
  };
}

/**
 * Step 1: Create a payment tracker session.
 * Returns the tracker token (track_xxx).
 */
export async function createPaymentSession(
  amountPkr: number,
  metadata: Record<string, string>
): Promise<string> {
  const res = await fetch(`${HOST}/order/payments/v3/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      merchant_api_key: process.env.SAFEPAY_PUBLIC_KEY,
      intent: "CYBERSOURCE",
      mode: "payment",
      currency: "PKR",
      amount: amountPkr * 100, // PKR → paisa
      metadata,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Safepay session error ${res.status}: ${text}`);
  }
  const json = await res.json();
  return json.data.tracker.token as string;
}

/**
 * Step 2: Get a short-lived bearer token (tbt) for the checkout URL.
 * Expires in 1 hour.
 */
export async function getAuthToken(): Promise<string> {
  const res = await fetch(`${HOST}/client/passport/v1/token`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Safepay auth token error ${res.status}: ${text}`);
  }
  const json = await res.json();
  return json.data as string;
}

/**
 * Step 3: Build the hosted checkout URL.
 * User is redirected here to complete payment.
 */
export function buildCheckoutUrl(
  tracker: string,
  tbt: string,
  redirectUrl: string,
  cancelUrl: string
): string {
  const env = process.env.SAFEPAY_ENV === "production" ? "production" : "sandbox";
  const params = new URLSearchParams({
    env,
    tbt,
    tracker,
    source: "hosted",
    redirect_url: redirectUrl,
    cancel_url: cancelUrl,
  });
  return `${HOST}/checkout?${params.toString()}`;
}

/**
 * Verify payment status with Safepay.
 * Returns true only when tracker state is TRACKER_ENDED (payment confirmed).
 */
export async function verifyPayment(
  tracker: string
): Promise<{ succeeded: boolean; reference?: string }> {
  const res = await fetch(`${HOST}/reporter/api/v1/payments/${tracker}`, {
    headers: authHeaders(),
  });
  if (!res.ok) return { succeeded: false };
  const json = await res.json();
  const state = json.data?.tracker?.state as string | undefined;
  return {
    succeeded: state === "TRACKER_ENDED",
    reference: json.data?.tracker?.reference as string | undefined,
  };
}

/**
 * Verify the HMAC-SHA512 signature on incoming webhook payloads.
 * Uses the webhook secret from your Safepay dashboard (Developers → Endpoints).
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.SAFEPAY_WEBHOOK_SECRET ?? "";
  if (!secret) {
    console.error("[safepay] SAFEPAY_WEBHOOK_SECRET is not set — rejecting all webhooks");
    return false;
  }

  // Safepay sends a 128-char hex SHA-512 digest
  if (!/^[0-9a-f]{128}$/i.test(signature)) {
    console.error("[safepay] Webhook signature is not valid hex SHA-512");
    return false;
  }

  const computed = crypto
    .createHmac("sha512", secret)
    .update(Buffer.from(rawBody))
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}
