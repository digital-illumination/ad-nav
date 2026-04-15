import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createContextMcpServer } from "@/lib/mcp-server";

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
 * Auth: if `MCP_BEARER_TOKEN` is set, requests must include
 *       `Authorization: Bearer <token>`. Otherwise the endpoint is public.
 */

function unauthorized(): Response {
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
        "WWW-Authenticate": 'Bearer realm="mcp"',
      },
    }
  );
}

function checkAuth(req: Request): Response | null {
  const expected = process.env.MCP_BEARER_TOKEN;
  if (!expected) return null; // auth disabled

  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match || match[1] !== expected) {
    return unauthorized();
  }
  return null;
}

async function handle(req: Request): Promise<Response> {
  const authFail = checkAuth(req);
  if (authFail) return authFail;

  // Stateless: fresh server + transport per request. Each request is
  // self-contained — no session state, no sticky routing needed.
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  const server = createContextMcpServer();

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
