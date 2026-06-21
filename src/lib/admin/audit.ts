import { db } from "@/lib/db";
import { adminAuditLog } from "@/lib/db/schema";

type TargetType = "user" | "classroom" | "quiz" | "attempt" | "org" | "document";

export async function logAdminAction(params: {
  adminId: string;
  action: string;
  targetType?: TargetType;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}) {
  try {
    await db.insert(adminAuditLog).values({
      adminId:    params.adminId,
      action:     params.action,
      targetType: params.targetType,
      targetId:   params.targetId,
      metadata:   params.metadata ?? null,
      ip:         params.ip,
    });
  } catch {
    // Audit log failure must never crash the main operation
    console.error("[admin-audit] failed to log action:", params.action);
  }
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
