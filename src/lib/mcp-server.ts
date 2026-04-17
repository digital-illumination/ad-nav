import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import matter from "gray-matter";
import { getContextFiles, getContextFile } from "./content";

export interface McpServerOptions {
  authHeader?: string | null;
}

/**
 * Build a configured `McpServer` instance exposing Adam's context portfolio.
 *
 * Returns a fresh server each call — callers own the lifecycle (connect transport,
 * close when done). Identical read tools and resources to the stdio server in `mcp/`,
 * but uses the Next.js `content.ts` loaders so it works inside an App Router route.
 *
 * `authHeader` is the raw `Authorization` header from the incoming request. Read
 * tools ignore it. The `append_to_context` write tool compares the presented
 * bearer against `MCP_WRITE_TOKEN` and refuses if they don't match.
 */
export function createContextMcpServer(options: McpServerOptions = {}): McpServer {
  const { authHeader } = options;

  const server = new McpServer({
    name: "adam-stacey-context",
    version: "1.0.0",
    description:
      "Personal context portfolio for Adam Stacey. Provides structured context files covering identity, expertise, communication style, and working preferences for AI agents acting on his behalf.",
  });

  // --- Resources ---

  server.resource(
    "context-file",
    new ResourceTemplate("context://adam-stacey/{filename}", {
      list: async () => {
        const files = getContextFiles();
        return {
          resources: files.map((f) => ({
            uri: `context://adam-stacey/${f.filename}`,
            name: f.title,
            description: f.description,
            mimeType: "text/markdown",
          })),
        };
      },
    }),
    async (uri, variables) => {
      const filename = variables.filename as string;
      const file = getContextFile(filename);
      if (!file) {
        return { contents: [] };
      }
      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: "text/markdown",
            text: file.content,
          },
        ],
      };
    }
  );

  // --- Tools ---

  server.tool(
    "list_context_files",
    "List all available context files with titles and descriptions. Use this first to see what context is available.",
    async () => {
      const files = getContextFiles();
      if (files.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No context files found. Check that the content directory exists.",
            },
          ],
        };
      }

      const listing = files
        .map((f) => `- **${f.title}** (\`${f.filename}\`): ${f.description}`)
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `# Context Portfolio\n\n${files.length} files available.\n\n${listing}`,
          },
        ],
      };
    }
  );

  server.tool(
    "search_context",
    "Search across all context files for a keyword or phrase. Returns matching files with relevant excerpts.",
    { query: z.string().describe("Search term or phrase") },
    async ({ query }) => {
      const files = getContextFiles();
      const lower = query.toLowerCase();

      const matches = files
        .filter(
          (f) =>
            f.content.toLowerCase().includes(lower) ||
            f.title.toLowerCase().includes(lower)
        )
        .map((f) => {
          const lines = f.content.split("\n");
          const matchingLines = lines
            .filter((line) => line.toLowerCase().includes(lower))
            .slice(0, 3)
            .map((line) => line.trim());
          return { file: f, matchingLines };
        });

      if (matches.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No results found for "${query}".`,
            },
          ],
        };
      }

      const results = matches
        .map((m) => {
          const excerpts =
            m.matchingLines.length > 0
              ? m.matchingLines.map((l) => `  > ${l}`).join("\n")
              : "  (match in title)";
          return `### ${m.file.title} (\`${m.file.filename}\`)\n${excerpts}`;
        })
        .join("\n\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `# Search: "${query}"\n\n${matches.length} file(s) matched.\n\n${results}`,
          },
        ],
      };
    }
  );

  server.tool(
    "get_full_context",
    "Load the entire context portfolio as a single document. Use this when you need to understand Adam fully before drafting content, making decisions, or acting on his behalf.",
    async () => {
      const files = getContextFiles();
      if (files.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No context files found.",
            },
          ],
        };
      }

      const combined = files
        .map((f) => `# ${f.title}\n\n${f.content}`)
        .join("\n\n---\n\n");

      return {
        content: [
          {
            type: "text" as const,
            text: combined,
          },
        ],
      };
    }
  );

  server.tool(
    "append_to_context",
    "Append to or replace the body of a context portfolio file. Commits directly to the repo on GitHub. Requires a bearer token matching MCP_WRITE_TOKEN. Frontmatter (title, description) is always preserved.",
    {
      filename: z
        .string()
        .describe(
          "Context file name without the .md extension, e.g. 'current-projects'. Must match an existing file."
        ),
      content: z
        .string()
        .describe(
          "Markdown to append, or (in replace mode) the full new body. Do not include frontmatter — it is preserved automatically."
        ),
      mode: z
        .enum(["append", "replace"])
        .default("append")
        .describe("'append' (default) adds to the end of the body; 'replace' overwrites the body entirely."),
      message: z
        .string()
        .optional()
        .describe("Optional commit message. Defaults to 'Update <file> via MCP (<mode>)'."),
    },
    async ({ filename, content, mode, message }) => {
      return writeContextFile({ authHeader, filename, content, mode, message });
    }
  );

  return server;
}

function toolError(text: string) {
  return {
    isError: true,
    content: [{ type: "text" as const, text }],
  };
}

function extractBearer(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

interface WriteArgs {
  authHeader: string | null | undefined;
  filename: string;
  content: string;
  mode: "append" | "replace";
  message?: string;
}

async function writeContextFile({ authHeader, filename, content, mode, message }: WriteArgs) {
  const writeToken = process.env.MCP_WRITE_TOKEN;
  if (!writeToken) {
    return toolError(
      "append_to_context is disabled: MCP_WRITE_TOKEN is not set on the server."
    );
  }

  const presented = extractBearer(authHeader);
  if (!presented || presented !== writeToken) {
    return toolError(
      "Unauthorized: append_to_context requires Authorization: Bearer <MCP_WRITE_TOKEN>."
    );
  }

  if (!/^[a-z0-9][a-z0-9-]*$/.test(filename)) {
    return toolError(
      "Invalid filename. Use lowercase letters, digits, and hyphens only (no .md extension, no path separators)."
    );
  }

  const repo = process.env.GITHUB_REPO;
  const githubToken = process.env.GITHUB_TOKEN;
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!repo || !githubToken) {
    return toolError(
      "GitHub is not configured: set GITHUB_REPO (owner/repo) and GITHUB_TOKEN."
    );
  }

  const filePath = `content/context/${filename}.md`;
  const apiBase = `https://api.github.com/repos/${repo}/contents/${filePath}`;
  const ghHeaders = {
    Authorization: `Bearer ${githubToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ad-nav-mcp",
  };

  const getRes = await fetch(`${apiBase}?ref=${encodeURIComponent(branch)}`, {
    headers: ghHeaders,
  });

  if (getRes.status === 404) {
    return toolError(
      `File not found: ${filePath} on branch ${branch}. append_to_context only edits existing context files.`
    );
  }
  if (!getRes.ok) {
    return toolError(`GitHub GET failed (${getRes.status}): ${await getRes.text()}`);
  }

  const fileJson = (await getRes.json()) as { content: string; sha: string; encoding: string };
  if (fileJson.encoding !== "base64") {
    return toolError(`Unexpected GitHub encoding: ${fileJson.encoding}`);
  }

  const currentRaw = Buffer.from(fileJson.content, "base64").toString("utf-8");
  const parsed = matter(currentRaw);

  const incoming = content.trim();
  const newBody =
    mode === "append"
      ? `${parsed.content.trimEnd()}\n\n${incoming}\n`
      : `${incoming}\n`;

  const newRaw = matter.stringify(newBody, parsed.data);

  const putRes = await fetch(apiBase, {
    method: "PUT",
    headers: { ...ghHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: message ?? `Update ${filePath} via MCP (${mode})`,
      content: Buffer.from(newRaw, "utf-8").toString("base64"),
      sha: fileJson.sha,
      branch,
    }),
  });

  if (!putRes.ok) {
    return toolError(`GitHub PUT failed (${putRes.status}): ${await putRes.text()}`);
  }

  const putJson = (await putRes.json()) as { commit: { sha: string; html_url: string } };

  return {
    content: [
      {
        type: "text" as const,
        text: `Committed ${mode} to ${filePath} on ${branch}.\nCommit: ${putJson.commit.sha}\n${putJson.commit.html_url}`,
      },
    ],
  };
}
