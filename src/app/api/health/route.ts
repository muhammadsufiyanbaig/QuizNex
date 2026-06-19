import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({
      status: "ok",
      db: "ok",
      latencyMs: Date.now() - start,
      ts: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "degraded",
        db: "error",
        error: err instanceof Error ? err.message : String(err),
        ts: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
