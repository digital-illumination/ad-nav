import { NextResponse } from "next/server";
import { readSession } from "@/lib/session";
import { readClient, createCode } from "@/lib/oauth-storage";
import {
  filterSupportedScopes,
  htmlEscape,
  parseScopeString,
  SCOPE_CONTEXT_READ,
} from "@/lib/oauth";
import { BASE_URL } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * OAuth 2.1 Authorization endpoint.
 *
 * GET  — validate params, ensure the user is signed in (redirect to signin if
 *        not), render the consent page.
 * POST — user has clicked Approve or Deny. Issue an authorization code on
 *        approval (bound to the PKCE challenge), or redirect with
 *        `error=access_denied` on denial.
 *
 * Pre-validation failures that occur before we can trust `redirect_uri`
 * (missing/invalid client_id, unregistered redirect_uri) render an HTML error
 * page. Post-validation failures redirect back to the client with OAuth error
 * parameters per RFC 6749 §4.1.2.1.
 */

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  "context:read": "Read your context portfolio and journal",
  "context:write": "Append entries to your journal",
};

// --- GET: consent page ---

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = url.searchParams;

  const response_type = params.get("response_type");
  const client_id = params.get("client_id");
  const redirect_uri = params.get("redirect_uri");
  const code_challenge = params.get("code_challenge");
  const code_challenge_method = params.get("code_challenge_method");
  const scopeRaw = params.get("scope");
  const state = params.get("state") ?? "";

  if (response_type !== "code") {
    return errorPage("Only response_type=code is supported.");
  }
  if (!client_id) return errorPage("Missing client_id.");
  if (!redirect_uri) return errorPage("Missing redirect_uri.");
  if (!code_challenge) return errorPage("Missing code_challenge (PKCE required).");
  if (code_challenge_method !== "S256") {
    return errorPage("code_challenge_method must be S256.");
  }

  const client = await readClient(client_id);
  if (!client) return errorPage(`Unknown client_id: ${client_id}`);
  if (!client.redirect_uris.includes(redirect_uri)) {
    return errorPage("redirect_uri is not registered for this client.");
  }

  const requestedScopes = parseScopeString(scopeRaw);
  const scopes = filterSupportedScopes(requestedScopes);
  if (requestedScopes.length > 0 && scopes.length === 0) {
    return redirectWithError(redirect_uri, "invalid_scope", state);
  }
  // Default to read-only if the client requested no specific scope.
  const effectiveScopes = scopes.length > 0 ? scopes : [SCOPE_CONTEXT_READ];

  const session = await readSession();
  if (!session) {
    // Send the user to signin, then back here with all params preserved.
    const returnTo = `/api/oauth/authorize?${params.toString()}`;
    const signinUrl = `/api/oauth/signin?return_to=${encodeURIComponent(returnTo)}`;
    return NextResponse.redirect(new URL(signinUrl, BASE_URL));
  }

  return renderConsentPage({
    clientName: client.client_name,
    clientId: client.client_id,
    redirectUri: redirect_uri,
    state,
    scopes: effectiveScopes,
    codeChallenge: code_challenge,
    codeChallengeMethod: code_challenge_method,
    githubLogin: session.githubLogin,
  });
}

// --- POST: consent decision ---

export async function POST(req: Request) {
  const form = await req.formData();

  const action = String(form.get("action") ?? "");
  const client_id = String(form.get("client_id") ?? "");
  const redirect_uri = String(form.get("redirect_uri") ?? "");
  const state = String(form.get("state") ?? "");
  const scopeRaw = String(form.get("scope") ?? "");
  const code_challenge = String(form.get("code_challenge") ?? "");
  const code_challenge_method = String(form.get("code_challenge_method") ?? "");

  const session = await readSession();
  if (!session) {
    return errorPage("Session expired. Please sign in and try again.");
  }

  const client = await readClient(client_id);
  if (!client) return errorPage(`Unknown client_id: ${client_id}`);
  if (!client.redirect_uris.includes(redirect_uri)) {
    return errorPage("redirect_uri is not registered for this client.");
  }

  if (action === "deny") {
    return redirectWithError(redirect_uri, "access_denied", state);
  }

  if (action !== "approve") {
    return errorPage("Invalid action.");
  }

  if (!code_challenge || code_challenge_method !== "S256") {
    return redirectWithError(redirect_uri, "invalid_request", state);
  }

  const scopes = filterSupportedScopes(parseScopeString(scopeRaw));
  const effectiveScopes = scopes.length > 0 ? scopes : [SCOPE_CONTEXT_READ];

  const code = await createCode({
    client_id,
    subject: session.githubLogin,
    scopes: effectiveScopes,
    redirect_uri,
    code_challenge,
    code_challenge_method,
  });

  const target = new URL(redirect_uri);
  target.searchParams.set("code", code.code);
  if (state) target.searchParams.set("state", state);
  return NextResponse.redirect(target.toString());
}

// --- Helpers ---

function redirectWithError(redirect_uri: string, error: string, state: string) {
  const target = new URL(redirect_uri);
  target.searchParams.set("error", error);
  if (state) target.searchParams.set("state", state);
  return NextResponse.redirect(target.toString());
}

function errorPage(message: string) {
  const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><title>Authorisation error</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>${pageCss()}</style>
</head><body>
<main>
<h1>Authorisation error</h1>
<p class="error">${htmlEscape(message)}</p>
<p><a href="/">Return to site</a></p>
</main>
</body></html>`;
  return new Response(html, {
    status: 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function renderConsentPage(args: {
  clientName: string;
  clientId: string;
  redirectUri: string;
  state: string;
  scopes: string[];
  codeChallenge: string;
  codeChallengeMethod: string;
  githubLogin: string;
}) {
  const scopeRows = args.scopes
    .map((s) => {
      const label = SCOPE_DESCRIPTIONS[s] ?? s;
      return `<li class="scope"><code>${htmlEscape(s)}</code><span>${htmlEscape(label)}</span></li>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><title>Authorise ${htmlEscape(args.clientName)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>${pageCss()}</style>
</head><body>
<main>
<h1>Authorise application</h1>
<p class="intro">
  <strong>${htmlEscape(args.clientName)}</strong> wants to access your Ad-Nav context portfolio.
</p>
<p class="client-id">Client ID: <code>${htmlEscape(args.clientId)}</code></p>
<ul class="scopes">${scopeRows}</ul>

<form method="post">
  <input type="hidden" name="client_id" value="${htmlEscape(args.clientId)}">
  <input type="hidden" name="redirect_uri" value="${htmlEscape(args.redirectUri)}">
  <input type="hidden" name="state" value="${htmlEscape(args.state)}">
  <input type="hidden" name="scope" value="${htmlEscape(args.scopes.join(" "))}">
  <input type="hidden" name="code_challenge" value="${htmlEscape(args.codeChallenge)}">
  <input type="hidden" name="code_challenge_method" value="${htmlEscape(args.codeChallengeMethod)}">
  <div class="actions">
    <button type="submit" name="action" value="approve" class="approve">Approve</button>
    <button type="submit" name="action" value="deny" class="deny">Deny</button>
  </div>
</form>

<footer>
  Signed in as <strong>${htmlEscape(args.githubLogin)}</strong>.
  <a href="/api/oauth/signout">Sign out</a>.
  <br>
  Only approve if you started this flow yourself.
</footer>
</main>
</body></html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function pageCss(): string {
  return `
:root {
  --bg: #0a0a0f;
  --ink: #e0e0e0;
  --muted: #888;
  --purple: #b829e3;
  --cyan: #00f0ff;
  --pink: #ff2d95;
  --surface: rgba(184, 41, 227, 0.08);
  --border: rgba(184, 41, 227, 0.45);
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; }
main { max-width: 520px; margin: 60px auto; padding: 32px 24px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; }
h1 { color: var(--purple); margin: 0 0 16px; font-size: 24px; }
p { margin: 12px 0; }
.intro strong { color: var(--cyan); }
.client-id { font-size: 12px; color: var(--muted); }
.client-id code { font-size: 11px; }
code { background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 3px; font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; }
.scopes { list-style: none; padding: 0; margin: 20px 0; }
.scope { padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; gap: 12px; align-items: baseline; }
.scope code { white-space: nowrap; color: var(--cyan); }
.scope span { color: var(--ink); }
.actions { display: flex; gap: 12px; margin-top: 24px; }
button { flex: 1; padding: 12px 20px; font-family: inherit; font-size: 14px; font-weight: 600; border: none; border-radius: 4px; cursor: pointer; }
.approve { background: var(--cyan); color: #000; }
.approve:hover { background: #33f3ff; }
.deny { background: #2a2a30; color: var(--ink); }
.deny:hover { background: #3a3a40; }
.error { color: var(--pink); }
footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 12px; color: var(--muted); }
footer a { color: var(--cyan); }
a { color: var(--cyan); }
`;
}
