import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeCodeForToken, fetchGithubUser } from "@/lib/github-oauth";
import { isAllowed } from "@/lib/allowlist";
import { createSession } from "@/lib/session";
import { OAUTH_STATE_COOKIE } from "../../signin/route";
import { BASE_URL } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Receive GitHub's OAuth callback, verify state, exchange the code, check the
 * login against the allowlist, and start a server-side session.
 *
 * On success: redirect to the caller's `return_to` (stored in the state cookie
 * at signin time), or `/` by default.
 * On failure: respond with 401/403 plain text. The browser will display it;
 * the client (whoever initiated signin) can retry.
 */

function denied(status: number, text: string) {
  return new Response(text, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return denied(400, `GitHub returned an error: ${error}`);
  }
  if (!code || !state) {
    return denied(400, "Missing code or state.");
  }

  const cookieStore = await cookies();
  const stateCookie = cookieStore.get(OAUTH_STATE_COOKIE);
  if (!stateCookie?.value) {
    return denied(400, "Missing state cookie. Try signing in again.");
  }

  let stored: { state: string; returnTo: string };
  try {
    stored = JSON.parse(stateCookie.value);
  } catch {
    return denied(400, "Malformed state cookie.");
  }

  if (stored.state !== state) {
    return denied(400, "State mismatch. CSRF check failed.");
  }

  // Consume the state cookie immediately, whether or not the rest succeeds.
  cookieStore.delete(OAUTH_STATE_COOKIE);

  let accessToken: string;
  try {
    accessToken = await exchangeCodeForToken(code);
  } catch (err) {
    return denied(502, `Token exchange failed: ${(err as Error).message}`);
  }

  let githubUser;
  try {
    githubUser = await fetchGithubUser(accessToken);
  } catch (err) {
    return denied(502, `GitHub user fetch failed: ${(err as Error).message}`);
  }

  if (!isAllowed(githubUser.login)) {
    return denied(
      403,
      `Signed in as ${githubUser.login}, but that login isn't on the allowlist for this server.`
    );
  }

  await createSession(githubUser.login);

  const returnTo = stored.returnTo || "/";
  return NextResponse.redirect(new URL(returnTo, BASE_URL));
}
