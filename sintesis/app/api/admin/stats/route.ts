import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleError } from "@/lib/http";

export async function GET() {
  try {
    await requireAdmin();
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [users, activeUsers, admins, jobsTotal, jobsWeek, jobsFailedWeek, byTool] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { isActive: true } }),
      db.user.count({ where: { role: "ADMIN" } }),
      db.job.count(),
      db.job.count({ where: { createdAt: { gte: since } } }),
      db.job.count({ where: { createdAt: { gte: since }, status: "FAILED" } }),
      db.job.groupBy({ by: ["tool"], _count: { _all: true }, orderBy: { _count: { tool: "desc" } }, take: 10 }),
    ]);
    return NextResponse.json({
      users,
      activeUsers,
      admins,
      jobsTotal,
      jobsWeek,
      jobsFailedWeek,
      byTool: byTool.map((r) => ({ tool: r.tool, count: r._count._all })),
    });
  } catch (err) {
    return handleError(err);
  }
}
