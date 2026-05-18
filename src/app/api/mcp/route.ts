import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  createContextMcpServer,
  type AuthContext,
  ANONYMOUS_AUTH,
  AUTH_REQUIRED_TOOLS,
} from "@/lib/mcp-server";
import {
  SCOPE_CONTEXT_READ,
  SCOPE_CONTEXT_WRITE,
  parseScopeString,
  verifyAccessToken,
} from "@/lib/oauth";
import { BASE_URL } from "@/lib/constants";

const RESOURCE_METADATA_URL = `${BASE_URL}/.well-known/oauth-protected-resource`;

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

/**
 * RFC 9728 / MCP-spec auth challenge. The `resource_metadata` parameter is
 * the critical bit: it points the client at the protected-resource metadata,
 * which is how an MCP client (claude.ai) discovers the authorization server
 * and starts the OAuth flow. Without this 401, a client that connects
 * anonymously, succeeds on public reads, and only gets a tool-level error on
 * writes never learns it needs to authenticate at all.
 */
function authChallenge(error: string, description: string): Response {
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
        "WWW-Authenticate": `Bearer realm="mcp", error="${error}", error_description="${description}", resource_metadata="${RESOURCE_METADATA_URL}"`,
      },
    }
  );
}

/**
 * Does this raw JSON-RPC body contain a `tools/call` for a tool that requires
 * write auth? Tolerant of single messages and batches; never throws.
 */
function callsAuthRequiredTool(rawBody: string): boolean {
  if (!rawBody) return false;
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return false;
  }
  const messages = Array.isArray(parsed) ? parsed : [parsed];
  return messages.some((m) => {
    if (!m || typeof m !== "object") return false;
    const msg = m as Record<string, unknown>;
    if (msg.method !== "tools/call") return false;
    const params = msg.params as Record<string, unknown> | undefined;
    const name = params?.name;
    return typeof name === "string" && AUTH_REQUIRED_TOOLS.has(name);
  });
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

  // Pre-dispatch OAuth challenge. If this is a write-gated tools/call and the
  // caller can't satisfy it, answer with a 401 + WWW-Authenticate carrying the
  // resource_metadata pointer. That is the signal MCP clients use to begin the
  // OAuth flow. Without it, an anonymous client (claude.ai) just gets a
  // tool-level error inside a 200 and never authenticates.
  //
  // Only POST carries a JSON-RPC body. The body stream is single-use, so we
  // buffer it and rebuild the Request for the transport.
  let forwardReq = req;
  if (req.method === "POST") {
    const rawBody = await req.text();
    const authorised =
      auth.isAdmin || auth.scopes.includes(SCOPE_CONTEXT_WRITE);
    if (!authorised && callsAuthRequiredTool(rawBody)) {
      return auth.subject
        ? authChallenge(
            "insufficient_scope",
            "This tool requires the context:write scope. Re-authorise to obtain it."
          )
        : authChallenge(
            "invalid_token",
            "Authentication required. Discover the authorization server via resource_metadata and obtain a token."
          );
    }
    forwardReq = new Request(req.url, {
      method: req.method,
      headers: req.headers,
      body: rawBody,
    });
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
    const response = await transport.handleRequest(forwardReq);
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
