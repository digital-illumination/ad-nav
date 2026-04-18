import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildAuthorizeUrl, newOAuthState } from "@/lib/github-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Kick off the upstream GitHub OAuth flow.
 *
 * Accepts an optional `return_to` query param, which must be a same-origin
 * relative path. Stores `{state, returnTo}` in a short-lived cookie so the
 * callback can verify the state (CSRF) and resume the journey.
 */

export const OAUTH_STATE_COOKIE = "adnav_oauth_state";
const STATE_COOKIE_MAX_AGE = 60 * 10; // 10 minutes

function safeReturnTo(raw: string | null): string {
  if (!raw) return "/";
  // Only allow same-origin relative paths.
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const returnTo = safeReturnTo(url.searchParams.get("return_to"));
  const state = newOAuthState();

  const cookieStore = await cookies();
  cookieStore.set(OAUTH_STATE_COOKIE, JSON.stringify({ state, returnTo }), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: STATE_COOKIE_MAX_AGE,
  });

  return NextResponse.redirect(buildAuthorizeUrl(state));
}
