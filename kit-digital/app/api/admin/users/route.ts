import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleError } from "@/lib/http";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
    const users = await db.user.findMany({
      where: q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {},
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, lastLoginAt: true, _count: { select: { jobs: true } } },
    });
    return NextResponse.json({ users: users.map(({ _count, ...u }) => ({ ...u, jobs: _count.jobs })) });
  } catch (err) {
    return handleError(err);
  }
}
