import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/utils";
import { verifyTotpCode } from "@/lib/auth/totp";
import { loginSchema } from "@/lib/validations/auth";
import { authConfig } from "@/auth.config";
import type { Role } from "@/types/auth";

class UnverifiedEmailError extends CredentialsSignin {
  code = "unverified_email";
}

class InvalidTotpError extends CredentialsSignin {
  code = "invalid_totp";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email:    { label: "Email",     type: "email"    },
        password: { label: "Password",  type: "password" },
        totpCode: { label: "2FA Code",  type: "text"     },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const totpCode = (credentials?.totpCode as string | undefined)?.replace(/\s/g, "") ?? "";

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);

        if (!user) return null;
        if (!user.emailVerified) throw new UnverifiedEmailError();

        const passwordValid = await verifyPassword(password, user.passwordHash);
        if (!passwordValid) return null;

        // 2FA check
        if (user.twoFactorEnabled) {
          if (!totpCode || totpCode.length !== 6) throw new InvalidTotpError();
          const codeValid = verifyTotpCode(totpCode, user.twoFactorSecret!);
          if (!codeValid) throw new InvalidTotpError();
        }

        return {
          id:               user.id,
          name:             user.name,
          email:            user.email,
          role:             user.role as Role,
          twoFactorEnabled: user.twoFactorEnabled,
          image:            user.image ?? null,
        };
      },
    }),
  ],
});
