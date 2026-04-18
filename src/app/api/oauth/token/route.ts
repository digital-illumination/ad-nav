import {
  consumeCode,
  createRefreshToken,
  readClient,
  rotateRefreshToken,
} from "@/lib/oauth-storage";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  signAccessToken,
  verifyPkce,
} from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * OAuth 2.1 Token endpoint.
 *
 * Supports:
 * - authorization_code grant (with PKCE)
 * - refresh_token grant (with rotation)
 *
 * Accepts application/x-www-form-urlencoded or application/json.
 */

function oauthError(status: number, error: string, description?: string) {
  const body: Record<string, string> = { error };
  if (description) body.error_description = description;
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    },
  });
}

async function readBody(req: Request): Promise<Record<string, string>> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const raw = (await req.json()) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  }
  // Default: form-urlencoded
  const form = await req.formData();
  const out: Record<string, string> = {};
  for (const [k, v] of form.entries()) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

export async function POST(req: Request) {
  let body: Record<string, string>;
  try {
    body = await readBody(req);
  } catch {
    return oauthError(400, "invalid_request", "Unable to parse request body.");
  }

  const grant_type = body.grant_type;

  if (grant_type === "authorization_code") {
    return handleAuthorizationCode(body);
  }
  if (grant_type === "refresh_token") {
    return handleRefreshToken(body);
  }
  return oauthError(400, "unsupported_grant_type", `grant_type=${grant_type ?? "(missing)"}`);
}

async function handleAuthorizationCode(body: Record<string, string>) {
  const code = body.code;
  const client_id = body.client_id;
  const redirect_uri = body.redirect_uri;
  const code_verifier = body.code_verifier;

  if (!code) return oauthError(400, "invalid_request", "Missing code.");
  if (!client_id) return oauthError(400, "invalid_request", "Missing client_id.");
  if (!redirect_uri) return oauthError(400, "invalid_request", "Missing redirect_uri.");
  if (!code_verifier) return oauthError(400, "invalid_request", "Missing code_verifier (PKCE).");

  const client = await readClient(client_id);
  if (!client) return oauthError(401, "invalid_client", "Unknown client_id.");

  const stored = await consumeCode(code);
  if (!stored) {
    return oauthError(400, "invalid_grant", "Authorization code is invalid, expired, or already used.");
  }

  if (stored.client_id !== client_id) {
    return oauthError(400, "invalid_grant", "client_id mismatch.");
  }
  if (stored.redirect_uri !== redirect_uri) {
    return oauthError(400, "invalid_grant", "redirect_uri mismatch.");
  }
  if (!verifyPkce(code_verifier, stored.code_challenge, stored.code_challenge_method)) {
    return oauthError(400, "invalid_grant", "PKCE verification failed.");
  }

  const access_token = await signAccessToken({
    subject: stored.subject,
    clientId: client_id,
    scopes: stored.scopes,
  });
  const refresh = await createRefreshToken({
    client_id,
    subject: stored.subject,
    scopes: stored.scopes,
  });

  return new Response(
    JSON.stringify({
      access_token,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      refresh_token: refresh.token,
      scope: stored.scopes.join(" "),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    }
  );
}

async function handleRefreshToken(body: Record<string, string>) {
  const refresh_token = body.refresh_token;
  const client_id = body.client_id;
  if (!refresh_token) return oauthError(400, "invalid_request", "Missing refresh_token.");
  if (!client_id) return oauthError(400, "invalid_request", "Missing client_id.");

  const client = await readClient(client_id);
  if (!client) return oauthError(401, "invalid_client", "Unknown client_id.");

  const rotated = await rotateRefreshToken(refresh_token);
  if (!rotated) {
    return oauthError(400, "invalid_grant", "Refresh token is invalid, expired, or already used.");
  }
  if (rotated.client_id !== client_id) {
    // Client mismatch — revoke to be safe. rotateRefreshToken already revoked
    // the original; the new one is orphaned here.
    return oauthError(400, "invalid_grant", "client_id mismatch.");
  }

  const access_token = await signAccessToken({
    subject: rotated.subject,
    clientId: client_id,
    scopes: rotated.scopes,
  });

  return new Response(
    JSON.stringify({
      access_token,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      refresh_token: rotated.token,
      scope: rotated.scopes.join(" "),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    }
  );
}
