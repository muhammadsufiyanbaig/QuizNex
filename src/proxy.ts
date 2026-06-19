import { NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

// ─── In-memory rate limiter ───────────────────────────────────────────────────
type Window = { count: number; resetAt: number };
const store = new Map<string, Window>();

function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

let lastCleanup = Date.now();
function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, val] of store.entries()) {
    if (now > val.resetAt) store.delete(key);
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export default async function middleware(req: NextRequest) {
  maybeCleanup();

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const path = req.nextUrl.pathname;

  // AI endpoints — 20 req / 60s per IP
  if (path.startsWith("/api/ai/")) {
    if (!rateLimit(`ai:${ip}`, 20, 60_000)) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please wait before generating again." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // Auth endpoints — 10 req / 60s per IP
  if (
    path.startsWith("/api/auth/") &&
    (path.includes("signin") || path.includes("callback") || path.includes("session"))
  ) {
    if (!rateLimit(`auth:${ip}`, 10, 60_000)) {
      return new NextResponse(
        JSON.stringify({ error: "Too many auth attempts. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // Delegate to NextAuth edge auth
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (auth as any)(req);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
