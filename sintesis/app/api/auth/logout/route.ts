import { NextResponse } from "next/server";
import { destroyCurrentSession } from "@/lib/session";
import { handleError } from "@/lib/http";

export async function POST() {
  try {
    await destroyCurrentSession();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
