import bcrypt from "bcryptjs";
import crypto from "crypto";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Generates a cryptographically secure random hex token */
export function generateToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString("hex");
}

/** Generates a 6-digit numeric OTP for email verification */
export function generateOtp(): string {
  return crypto.randomInt(100_000, 1_000_000).toString();
}

/** Generates a classroom join key in format: ABC-123 */
export function generateJoinKey(): string {
  const letters = crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 3);
  const numbers = crypto.randomInt(100, 999).toString();
  return `${letters}-${numbers}`;
}
