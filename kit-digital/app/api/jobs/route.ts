import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError } from "@/lib/http";

// Historial del propio usuario. Nunca devuelve trabajos de otros.
export async function GET() {
  try {
    const user = await requireUser();
    const jobs = await db.job.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        module: true,
        tool: true,
        status: true,
        inputFiles: true,
        outputName: true,
        errorMessage: true,
        durationMs: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ jobs });
  } catch (err) {
    return handleError(err);
  }
}
