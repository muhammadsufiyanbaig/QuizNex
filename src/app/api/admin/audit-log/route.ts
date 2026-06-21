import { requireAdmin } from "@/lib/admin/guard";
import { db } from "@/lib/db";
import { adminAuditLog, users } from "@/lib/db/schema";
import { count, eq, desc, and, gte, lte } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url    = new URL(req.url);
  const page   = Math.max(1, Number(url.searchParams.get("page")  ?? 1));
  const limit  = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
  const from   = url.searchParams.get("from");
  const to     = url.searchParams.get("to");

  const filters = [];
  if (from) filters.push(gte(adminAuditLog.createdAt, new Date(from)));
  if (to)   filters.push(lte(adminAuditLog.createdAt, new Date(to)));

  const where = filters.length > 0 ? and(...filters) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.select({
      id:         adminAuditLog.id,
      action:     adminAuditLog.action,
      targetType: adminAuditLog.targetType,
      targetId:   adminAuditLog.targetId,
      metadata:   adminAuditLog.metadata,
      ip:         adminAuditLog.ip,
      createdAt:  adminAuditLog.createdAt,
      adminName:  users.name,
      adminEmail: users.email,
    })
    .from(adminAuditLog)
    .innerJoin(users, eq(adminAuditLog.adminId, users.id))
    .where(where)
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(limit)
    .offset((page - 1) * limit),

    db.select({ total: count() }).from(adminAuditLog).where(where),
  ]);

  return NextResponse.json({ logs: rows, total, page, limit, pages: Math.ceil(Number(total) / limit) });
}
