import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge-safe — no Node.js modules imported
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
