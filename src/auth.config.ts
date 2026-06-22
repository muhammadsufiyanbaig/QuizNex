import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/types/auth";

const ROLE_HOME: Record<Role, string> = {
  STUDENT:      "/student",
  TEACHER:      "/teacher",
  ORGANIZATION: "/organization",
  ADMIN:        "/admin",
};

const ROLE_ALLOWED_PREFIXES: Record<Role, string[]> = {
  STUDENT:      ["/student",      "/settings"],
  TEACHER:      ["/teacher",      "/settings"],
  ORGANIZATION: ["/organization", "/settings"],
  ADMIN:        ["/admin",        "/settings"],
};

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/api/auth",
  "/privacy",
  "/terms",
  "/pricing",
  "/payments",
  "/api/payments/webhook",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) =>
      pathname === p ||
      pathname.startsWith(p + "/") ||
      pathname.startsWith(p + "?")
  );
}

type AuthUser = {
  role?: Role | null;
  twoFactorEnabled?: boolean;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

/**
 * Edge-safe auth config — no Node.js imports.
 * Used by both proxy.ts (Edge) and the full auth.ts (Node.js).
 */
export const authConfig: NextAuthConfig = {
  providers: [],
  trustHost: true,

  pages: {
    signIn: "/login",
    error:  "/login",
  },

  session: { strategy: "jwt" },

  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const { pathname } = nextUrl;
      const user = auth?.user as AuthUser | undefined;
      const isAuthenticated = !!user;
      const hasRole = !!user?.role;
      const has2FA  = !!user?.twoFactorEnabled;

      // Static assets — always allow
      if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/public") ||
        pathname === "/favicon.ico"
      ) return true;

      // ── /setup-role: only for authenticated users without a role ──
      if (pathname === "/setup-role") {
        if (!isAuthenticated) return Response.redirect(new URL("/login", nextUrl));
        if (hasRole) {
          return Response.redirect(
            new URL(has2FA ? ROLE_HOME[user!.role!] : "/setup-2fa", nextUrl)
          );
        }
        return true;
      }

      // ── /setup-2fa: only for authenticated users with role but no 2FA ──
      // ADMIN: 2FA is mandatory — they are NOT exempt from this step
      if (pathname === "/setup-2fa") {
        if (!isAuthenticated) return Response.redirect(new URL("/login", nextUrl));
        if (!hasRole) return Response.redirect(new URL("/setup-role", nextUrl));
        if (has2FA) return Response.redirect(new URL(ROLE_HOME[user!.role!], nextUrl));
        return true;
      }

      // ── Root: landing page (public) → redirect authenticated users ──
      if (pathname === "/") {
        if (!isAuthenticated) return true; // show landing page
        if (!hasRole)  return Response.redirect(new URL("/setup-role", nextUrl));
        if (!has2FA)   return Response.redirect(new URL("/setup-2fa", nextUrl));
        return Response.redirect(new URL(ROLE_HOME[user!.role!], nextUrl));
      }

      // ── Public auth pages ─────────────────────────────────────────
      if (isPublic(pathname)) {
        if (isAuthenticated && !pathname.startsWith("/api")) {
          if (!hasRole)  return Response.redirect(new URL("/setup-role", nextUrl));
          if (!has2FA)   return Response.redirect(new URL("/setup-2fa", nextUrl));
          return Response.redirect(new URL(ROLE_HOME[user!.role!], nextUrl));
        }
        return true;
      }

      // ── Protected dashboard pages ─────────────────────────────────
      if (!isAuthenticated) {
        const loginUrl = new URL("/login", nextUrl);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return Response.redirect(loginUrl);
      }
      if (!hasRole)  return Response.redirect(new URL("/setup-role", nextUrl));
      if (!has2FA)   return Response.redirect(new URL("/setup-2fa", nextUrl));

      // API routes (non-auth) handle their own authz — skip role-prefix check
      if (pathname.startsWith("/api/")) return true;

      // Wrong role → own home
      const allowed = ROLE_ALLOWED_PREFIXES[user!.role!];
      if (!allowed?.some((prefix) => pathname.startsWith(prefix))) {
        return Response.redirect(new URL(ROLE_HOME[user!.role!], nextUrl));
      }

      return true;
    },

    // Minimal edge-safe JWT callback — full version is in auth.ts
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id               = user.id as string;
        token.role             = (user as { role: Role | null }).role ?? null;
        token.twoFactorEnabled = (user as { twoFactorEnabled: boolean }).twoFactorEnabled ?? false;
      }
      if (trigger === "update") {
        if (session?.twoFactorEnabled !== undefined) token.twoFactorEnabled = session.twoFactorEnabled;
        if (session?.role !== undefined)             token.role             = session.role;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id               = token.id as string;
        session.user.role             = (token.role as Role | null) ?? null;
        session.user.twoFactorEnabled = (token.twoFactorEnabled as boolean) ?? false;
      }
      return session;
    },
  },

  secret: process.env.APP_SECRET,
};
