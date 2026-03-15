import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/types/auth";

const ROLE_HOME: Record<Role, string> = {
  STUDENT:      "/student",
  TEACHER:      "/teacher",
  ORGANIZATION: "/organization",
};

const ROLE_ALLOWED_PREFIXES: Record<Role, string[]> = {
  STUDENT:      ["/student"],
  TEACHER:      ["/teacher"],
  ORGANIZATION: ["/organization"],
};

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/api/auth",
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
  role?: Role;
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
  providers: [],   // providers are added in auth.ts (Node.js only)

  pages: {
    signIn: "/login",
    error:  "/login",
  },

  session: { strategy: "jwt" },

  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const { pathname } = nextUrl;
      const user = auth?.user as AuthUser | undefined;

      // Allow static assets
      if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/public") ||
        pathname === "/favicon.ico"
      ) {
        return true;
      }

      // ── /setup-2fa: onboarding gate ──────────────────────────────
      if (pathname === "/setup-2fa") {
        if (!user?.role) {
          // Not authenticated → send to login
          return Response.redirect(new URL("/login", nextUrl));
        }
        if (user.twoFactorEnabled) {
          // Already has 2FA → go to dashboard
          return Response.redirect(new URL(ROLE_HOME[user.role!], nextUrl));
        }
        // Authenticated + no 2FA → allow
        return true;
      }

      // ── Root redirect ─────────────────────────────────────────────
      if (pathname === "/") {
        if (!user?.role) return Response.redirect(new URL("/login", nextUrl));
        if (!user.twoFactorEnabled) return Response.redirect(new URL("/setup-2fa", nextUrl));
        return Response.redirect(new URL(ROLE_HOME[user.role], nextUrl));
      }

      // ── Public auth pages ─────────────────────────────────────────
      if (isPublic(pathname)) {
        if (user?.role && !pathname.startsWith("/api")) {
          // Authenticated but no 2FA → must complete onboarding
          if (!user.twoFactorEnabled) {
            return Response.redirect(new URL("/setup-2fa", nextUrl));
          }
          return Response.redirect(new URL(ROLE_HOME[user.role], nextUrl));
        }
        return true;
      }

      // ── Protected pages ───────────────────────────────────────────
      if (!user?.role) {
        const loginUrl = new URL("/login", nextUrl);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return Response.redirect(loginUrl);
      }

      // Must complete 2FA onboarding before accessing any dashboard page
      if (!user.twoFactorEnabled) {
        return Response.redirect(new URL("/setup-2fa", nextUrl));
      }

      // Wrong role → own home
      const allowed = ROLE_ALLOWED_PREFIXES[user.role!];
      if (!allowed?.some((prefix) => pathname.startsWith(prefix))) {
        return Response.redirect(new URL(ROLE_HOME[user.role!], nextUrl));
      }

      return true;
    },

    async jwt({ token, user, trigger, session }) {
      // Initial sign-in — hydrate token from the user object
      if (user) {
        token.id               = user.id as string;
        token.role             = (user as { role: Role }).role;
        token.twoFactorEnabled = (user as { twoFactorEnabled: boolean }).twoFactorEnabled ?? false;
      }
      // Client-side update() call — e.g. after enabling 2FA
      if (trigger === "update" && session?.twoFactorEnabled !== undefined) {
        token.twoFactorEnabled = session.twoFactorEnabled as boolean;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id               = token.id as string;
        session.user.role             = token.role as Role;
        session.user.twoFactorEnabled = token.twoFactorEnabled as boolean ?? false;
      }
      return session;
    },
  },

  secret: process.env.AUTH_SECRET,
};
