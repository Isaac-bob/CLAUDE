import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handleError } from "@/lib/http";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const where = status && ["PENDING", "RUNNING", "SUCCEEDED", "FAILED"].includes(status) ? { status: status as "FAILED" } : {};
    const jobs = await db.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        module: true,
        tool: true,
        status: true,
        inputFiles: true,
        inputBytes: true,
        outputBytes: true,
        errorMessage: true,
        durationMs: true,
        createdAt: true,
        user: { select: { email: true, name: true } },
      },
    });
    return NextResponse.json({
      jobs: jobs.map((j) => ({
        ...j,
        inputBytes: Number(j.inputBytes),
        outputBytes: j.outputBytes === null ? null : Number(j.outputBytes),
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}
