import { TOTP, Secret } from "otpauth";
import QRCode from "qrcode";
import crypto from "crypto";

const APP_NAME = "QuizNex";

// ── Encryption (AES-256-GCM) ───────────────────────────────────────────────
function getEncryptionKey(): Buffer {
  return crypto
    .createHash("sha256")
    .update(process.env.AUTH_SECRET ?? "fallback-dev-key")
    .digest();
}

export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv  = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(encoded: string): string {
  const key  = getEncryptionKey();
  const buf  = Buffer.from(encoded, "base64");
  const iv   = buf.subarray(0, 12);
  const tag  = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data).toString("utf8") + decipher.final("utf8");
}

// ── TOTP helpers ───────────────────────────────────────────────────────────

/** Generates a random Base32 secret string */
export function generateTotpSecret(): string {
  // 20 random bytes → Base32 encoded by otpauth
  return new Secret({ size: 20 }).base32;
}

/** Returns the otpauth:// URI for QR code scanning */
export function generateOtpAuthUri(email: string, secret: string): string {
  const totp = new TOTP({
    issuer: APP_NAME,
    label:  email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });
  return totp.toString();
}

/** Renders the otpauth URI as a QR code data URL */
export async function generateQrCodeDataUrl(otpAuthUri: string): Promise<string> {
  return QRCode.toDataURL(otpAuthUri, {
    color: { dark: "#000000", light: "#ffffff" },
    width: 200,
    margin: 2,
  });
}

/** Verifies a 6-digit TOTP code against the stored encrypted secret */
export function verifyTotpCode(code: string, encryptedSecret: string): boolean {
  try {
    const plainSecret = decryptSecret(encryptedSecret);
    const totp = new TOTP({
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(plainSecret),
    });
    // validate returns the time-step delta (0, ±1) or null if invalid
    const delta = totp.validate({ token: code.replace(/\s/g, ""), window: 1 });
    return delta !== null;
  } catch {
    return false;
  }
}
