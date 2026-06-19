import { NextRequest, NextResponse } from "next/server";

// In-memory sliding window rate limiter
// Per-instance on serverless — effective per warm Lambda, best-effort across cold starts
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

// Clean up old entries periodically to avoid memory leak
let lastCleanup = Date.now();
function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, val] of store.entries()) {
    if (now > val.resetAt) store.delete(key);
  }
}

export function middleware(req: NextRequest) {
  maybeCleanup();

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const path = req.nextUrl.pathname;

  // AI endpoints — 20 req / 60s per IP
  if (path.startsWith("/api/ai/")) {
    const allowed = rateLimit(`ai:${ip}`, 20, 60_000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before generating again." },
        { status: 429 }
      );
    }
  }

  // Auth endpoints — 10 req / 60s per IP (brute-force protection)
  if (
    path.startsWith("/api/auth/") &&
    (path.includes("signin") || path.includes("callback") || path.includes("session"))
  ) {
    const allowed = rateLimit(`auth:${ip}`, 10, 60_000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many auth attempts. Please try again later." },
        { status: 429 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/ai/:path*", "/api/auth/:path*"],
};
