import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";
import { BASE_URL } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Destroy the current session. Accepts GET for simple browser navigation,
 * and POST for clients that prefer non-idempotent semantics.
 *
 * Redirects to `/` on success.
 */

async function handle() {
  await destroySession();
  return NextResponse.redirect(new URL("/", BASE_URL));
}

export async function GET() {
  return handle();
}

export async function POST() {
  return handle();
}
