import { BASE_URL } from "@/lib/constants";
import { SUPPORTED_SCOPES } from "@/lib/oauth";

export const runtime = "nodejs";

/**
 * OAuth 2.0 Protected Resource Metadata (RFC 9728).
 *
 * Served at /.well-known/oauth-protected-resource via a Next.js rewrite.
 * Points MCP clients at the authorization server they should talk to.
 */

export async function GET() {
  const body = {
    resource: `${BASE_URL}/api/mcp`,
    authorization_servers: [BASE_URL],
    scopes_supported: SUPPORTED_SCOPES,
    bearer_methods_supported: ["header"],
    resource_documentation: `${BASE_URL}/context`,
  };
  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
}
