import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google      from "next-auth/providers/google";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, passkeyTokens } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/utils";
import { verifyTotpCode } from "@/lib/auth/totp";
import { loginSchema } from "@/lib/validations/auth";
import { authConfig } from "@/auth.config";
import type { Role } from "@/types/auth";

class UnverifiedEmailError extends CredentialsSignin { code = "unverified_email"; }
class InvalidTotpError     extends CredentialsSignin { code = "invalid_totp"; }

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email:        { label: "Email",         type: "email"    },
        password:     { label: "Password",      type: "password" },
        totpCode:     { label: "2FA Code",      type: "text"     },
        passkeyToken: { label: "Passkey Token", type: "text"     },
      },
      async authorize(credentials) {
        // ── Passkey one-time token flow ────────────────────────
        const passkeyToken = (credentials?.passkeyToken as string | undefined)?.trim() ?? "";
        if (passkeyToken) {
          const [record] = await db
            .select()
            .from(passkeyTokens)
            .where(
              and(
                eq(passkeyTokens.token, passkeyToken),
                isNull(passkeyTokens.usedAt),
                gt(passkeyTokens.expiresAt, new Date()),
              ),
            )
            .limit(1);

          if (!record) return null;

          await db
            .update(passkeyTokens)
            .set({ usedAt: new Date() })
            .where(eq(passkeyTokens.id, record.id));

          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, record.userId))
            .limit(1);

          if (!user) return null;

          return {
            id:               user.id,
            name:             user.name,
            email:            user.email,
            role:             user.role as Role | null,
            twoFactorEnabled: user.twoFactorEnabled,
            image:            user.image ?? null,
          };
        }

        // ── Email + password flow ──────────────────────────────
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const totpCode = (credentials?.totpCode as string | undefined)?.replace(/\s/g, "") ?? "";

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);

        if (!user || !user.passwordHash) return null;
        if (!user.emailVerified) throw new UnverifiedEmailError();

        const passwordValid = await verifyPassword(password, user.passwordHash);
        if (!passwordValid) return null;

        if (user.twoFactorEnabled) {
          if (!totpCode || totpCode.length !== 6) throw new InvalidTotpError();
          const codeValid = verifyTotpCode(totpCode, user.twoFactorSecret!);
          if (!codeValid) throw new InvalidTotpError();
        }

        return {
          id:               user.id,
          name:             user.name,
          email:            user.email,
          role:             user.role as Role | null,
          twoFactorEnabled: user.twoFactorEnabled,
          image:            user.image ?? null,
        };
      },
    }),

    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  callbacks: {
    authorized: authConfig.callbacks!.authorized!,

    async jwt({ token, user, account, trigger, session }) {
      // ── OAuth sign-in ──────────────────────────────────────
      if (account && account.provider !== "credentials") {
        const email = (token.email ?? "").toLowerCase();
        const [existing] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existing) {
          token.id               = existing.id;
          token.role             = existing.role as Role | null;
          token.twoFactorEnabled = existing.twoFactorEnabled;
        } else {
          const [newUser] = await db
            .insert(users)
            .values({
              name:          token.name ?? "User",
              email,
              passwordHash:  null,
              role:          null,
              emailVerified: true,
              image:         (token.picture as string | null) ?? null,
            })
            .returning({ id: users.id });

          token.id               = newUser.id;
          token.role             = null;
          token.twoFactorEnabled = false;
        }
      }

      // ── Credentials sign-in ────────────────────────────────
      if (user && account?.provider === "credentials") {
        token.id               = user.id as string;
        token.role             = (user as { role: Role | null }).role ?? null;
        token.twoFactorEnabled = (user as { twoFactorEnabled: boolean }).twoFactorEnabled ?? false;
      }

      // ── Session update (2FA enable, role set) ──────────────
      if (trigger === "update") {
        if (session?.twoFactorEnabled !== undefined) token.twoFactorEnabled = session.twoFactorEnabled;
        if (session?.role             !== undefined) token.role             = session.role;
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
});
