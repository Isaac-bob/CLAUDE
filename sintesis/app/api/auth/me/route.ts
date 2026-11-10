import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { handleError } from "@/lib/http";

export async function GET() {
  try {
    return NextResponse.json({ user: await getCurrentUser() });
  } catch (err) {
    return handleError(err);
  }
}
