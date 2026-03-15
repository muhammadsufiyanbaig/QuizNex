import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { Role } from "@/types/auth";

/**
 * Returns the current session or throws a 401 response.
 * Use inside API route handlers.
 *
 * @example
 * const { session, error } = await requireAuth();
 * if (error) return error;
 */
export async function requireAuth(allowedRoles?: Role[]) {
  const session = await auth();

  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (allowedRoles && !allowedRoles.includes(session.user.role as Role)) {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { session, error: null };
}
