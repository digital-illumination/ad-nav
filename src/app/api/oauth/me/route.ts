import { readSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Return the current session's user, or 401 if no session.
 *
 * Useful as a smoke test for the signin flow and, later, as a browser-side
 * check to decide whether to show signin or signout UI.
 */

export async function GET() {
  const session = await readSession();
  if (!session) {
    return new Response(JSON.stringify({ signedIn: false }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      signedIn: true,
      githubLogin: session.githubLogin,
      expiresAt: session.expiresAt,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
