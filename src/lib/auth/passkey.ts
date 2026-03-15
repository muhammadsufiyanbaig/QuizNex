/** RP config + buffer helpers for WebAuthn */

export function getRpConfig() {
  const url    = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const parsed = new URL(url);
  return {
    rpName: "QuizNex",
    rpID:   parsed.hostname,
    origin: `${parsed.protocol}//${parsed.host}`,
  };
}

export function uint8ArrayToBase64url(buf: Uint8Array): string {
  return Buffer.from(buf).toString("base64url");
}

export function base64urlToUint8Array(str: string): Uint8Array<ArrayBuffer> {
  const buf = Buffer.from(str, "base64url");
  const ab  = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  return new Uint8Array(ab);
}
