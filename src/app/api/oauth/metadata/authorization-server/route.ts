import { BASE_URL } from "@/lib/constants";
import { SUPPORTED_SCOPES } from "@/lib/oauth";

export const runtime = "nodejs";

/**
 * OAuth 2.1 Authorization Server Metadata (RFC 8414).
 *
 * Served at /.well-known/oauth-authorization-server via a Next.js rewrite.
 * Clients fetch this to discover endpoint URLs and capabilities.
 */

export async function GET() {
  const body = {
    issuer: BASE_URL,
    authorization_endpoint: `${BASE_URL}/api/oauth/authorize`,
    token_endpoint: `${BASE_URL}/api/oauth/token`,
    registration_endpoint: `${BASE_URL}/api/oauth/register`,
    scopes_supported: SUPPORTED_SCOPES,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
    service_documentation: `${BASE_URL}/context`,
  };
  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
}
