import { requireAdmin } from "@/lib/admin/guard";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { count, ilike, eq, and, desc, or } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url    = new URL(req.url);
  const page   = Math.max(1, Number(url.searchParams.get("page")  ?? 1));
  const limit  = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));
  const search = url.searchParams.get("search")?.trim() ?? "";
  const role   = url.searchParams.get("role") ?? "";
  const status = url.searchParams.get("status") ?? "";

  const filters = [];
  if (search) filters.push(or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`)));
  if (role)   filters.push(eq(users.role, role as "STUDENT" | "TEACHER" | "ORGANIZATION" | "ADMIN"));
  if (status) filters.push(eq(users.status, status));

  const where = filters.length > 0 ? and(...filters) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.select({
      id:               users.id,
      name:             users.name,
      email:            users.email,
      role:             users.role,
      status:           users.status,
      emailVerified:    users.emailVerified,
      twoFactorEnabled: users.twoFactorEnabled,
      image:            users.image,
      lastLoginAt:      users.lastLoginAt,
      createdAt:        users.createdAt,
    })
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset((page - 1) * limit),

    db.select({ total: count() }).from(users).where(where),
  ]);

  return NextResponse.json({ users: rows, total, page, limit, pages: Math.ceil(Number(total) / limit) });
}
