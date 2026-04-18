import { createClient } from "@/lib/oauth-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * OAuth 2.0 Dynamic Client Registration (RFC 7591).
 *
 * Accepts a minimal client metadata POST and returns a registered client.
 * No initial access token required: registration is open (the only thing this
 * guards is knowledge of the URL), because downstream the user still has to
 * complete a GitHub-backed consent flow to actually get tokens.
 *
 * Public clients (native apps, SPAs) are the norm for MCP. We default
 * `token_endpoint_auth_method` to `"none"` and require PKCE at authorize time.
 */

interface RegistrationRequest {
  client_name?: string;
  redirect_uris?: string[];
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: string;
  scope?: string;
  software_id?: string;
  software_version?: string;
}

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: "invalid_client_metadata", error_description: message }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: Request) {
  let body: RegistrationRequest;
  try {
    body = (await req.json()) as RegistrationRequest;
  } catch {
    return badRequest("Body must be valid JSON.");
  }

  const redirect_uris = body.redirect_uris;
  if (!Array.isArray(redirect_uris) || redirect_uris.length === 0) {
    return badRequest("redirect_uris is required and must be a non-empty array.");
  }
  for (const uri of redirect_uris) {
    if (typeof uri !== "string" || uri.length === 0) {
      return badRequest("Each redirect_uri must be a non-empty string.");
    }
    try {
      // Allow http only for localhost (native/desktop clients loop back there).
      const parsed = new URL(uri);
      const isLocalhost =
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "[::1]";
      if (parsed.protocol !== "https:" && !isLocalhost) {
        return badRequest(`redirect_uri must use https (except for localhost): ${uri}`);
      }
    } catch {
      return badRequest(`Invalid redirect_uri: ${uri}`);
    }
  }

  const client = await createClient({
    client_name: body.client_name ?? "unnamed-client",
    redirect_uris,
    grant_types: body.grant_types,
    response_types: body.response_types,
    token_endpoint_auth_method: body.token_endpoint_auth_method,
    scope: body.scope,
    software_id: body.software_id,
    software_version: body.software_version,
  });

  return new Response(
    JSON.stringify({
      client_id: client.client_id,
      client_name: client.client_name,
      redirect_uris: client.redirect_uris,
      grant_types: client.grant_types,
      response_types: client.response_types,
      token_endpoint_auth_method: client.token_endpoint_auth_method,
      scope: client.scope,
      client_id_issued_at: Math.floor(client.created_at / 1000),
    }),
    {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }
  );
}
