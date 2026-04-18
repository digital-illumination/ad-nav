import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createContextMcpServer, type AuthContext, ANONYMOUS_AUTH } from "@/lib/mcp-server";
import {
  SCOPE_CONTEXT_READ,
  SCOPE_CONTEXT_WRITE,
  parseScopeString,
  verifyAccessToken,
} from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Remote MCP endpoint using Streamable HTTP transport (stateless mode).
 *
 * Spec: https://modelcontextprotocol.io/specification/draft/basic/transports#streamable-http
 *
 * - POST: JSON-RPC request/response (tools.call, resources.read, etc.)
 * - GET:  SSE stream for server-initiated notifications (not used in stateless mode)
 * - DELETE: session termination (no-op in stateless mode)
 *
 * Auth model (two orthogonal gates):
 *
 *   Transport level — if `MCP_BEARER_TOKEN` is set, every request must carry
 *   `Authorization: Bearer <MCP_BEARER_TOKEN>`. Leaves no room for OAuth in
 *   that mode. For public reads + OAuth writes, leave this env var UNSET.
 *
 *   Tool level — when transport auth is off (no `MCP_BEARER_TOKEN`), each
 *   request is resolved into an `AuthContext` here and passed to the server
 *   factory. The context carries a subject, scopes, and an `isAdmin` flag.
 *   Individual tools decide whether to gate on it.
 *
 * Bearer resolution order:
 *   1. No Authorization header → anonymous (empty scopes). Reads still work.
 *   2. Bearer matches MCP_WRITE_TOKEN → admin (full scopes, bypasses checks).
 *   3. Bearer looks like a JWT and verifies → subject + scopes from the token.
 *   4. Anything else (invalid bearer) → 401.
 */

function unauthorized(description?: string): Response {
  const challenge = description
    ? `Bearer realm="mcp", error="invalid_token", error_description="${description}"`
    : 'Bearer realm="mcp"';
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized" },
      id: null,
    }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": challenge,
      },
    }
  );
}

function checkTransportAuth(req: Request): Response | null {
  const expected = process.env.MCP_BEARER_TOKEN;
  if (!expected) return null; // transport gate disabled

  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match || match[1] !== expected) {
    return unauthorized();
  }
  return null;
}

function looksLikeJwt(token: string): boolean {
  return token.split(".").length === 3;
}

/**
 * Resolve the request's bearer into an AuthContext. Throws if a bearer is
 * presented but can't be recognised; that signals 401 to the caller.
 */
async function resolveAuth(req: Request): Promise<AuthContext> {
  const header = req.headers.get("authorization");
  if (!header) return ANONYMOUS_AUTH;

  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    // Non-Bearer scheme (Basic, etc.) — we don't support it.
    throw new Error("Unsupported authorization scheme.");
  }
  const token = match[1].trim();

  // Admin static token
  const adminToken = process.env.MCP_WRITE_TOKEN;
  if (adminToken && token === adminToken) {
    return {
      subject: "admin",
      scopes: [SCOPE_CONTEXT_READ, SCOPE_CONTEXT_WRITE],
      isAdmin: true,
    };
  }

  // JWT
  if (looksLikeJwt(token)) {
    const claims = await verifyAccessToken(token);
    if (!claims) throw new Error("Invalid or expired token.");
    return {
      subject: (claims.sub as string | undefined) ?? null,
      scopes: parseScopeString((claims.scope as string | undefined) ?? ""),
      isAdmin: false,
    };
  }

  throw new Error("Bearer token not recognised.");
}

async function handle(req: Request): Promise<Response> {
  const authFail = checkTransportAuth(req);
  if (authFail) return authFail;

  let auth: AuthContext;
  try {
    auth = await resolveAuth(req);
  } catch (err) {
    return unauthorized((err as Error).message);
  }

  // Stateless: fresh server + transport per request. Each request is
  // self-contained — no session state, no sticky routing needed.
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  const server = createContextMcpServer({ auth });

  try {
    await server.connect(transport);
    const response = await transport.handleRequest(req);
    return response;
  } catch (err) {
    console.error("[mcp] request failed:", err);
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  } finally {
    // Best-effort cleanup. Transport is per-request, so this just releases
    // handler state.
    await server.close().catch(() => {});
  }
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}

export async function DELETE(req: Request) {
  return handle(req);
}
