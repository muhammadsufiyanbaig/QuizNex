import type { DefaultSession } from "next-auth";
import type { Role } from "./auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role | null;           // null for new OAuth users until role is selected
      twoFactorEnabled: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role | null;
    twoFactorEnabled: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role | null;
    twoFactorEnabled: boolean;
  }
}
