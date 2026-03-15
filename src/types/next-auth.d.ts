import type { DefaultSession } from "next-auth";
import type { Role } from "./auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      twoFactorEnabled: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    twoFactorEnabled: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    twoFactorEnabled: boolean;
  }
}
