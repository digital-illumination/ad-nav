import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getContextFiles, getContextFile } from "./content";

/**
 * Build a configured `McpServer` instance exposing Adam's context portfolio.
 *
 * Returns a fresh server each call — callers own the lifecycle (connect transport,
 * close when done). Identical tools and resources to the stdio server in `mcp/`,
 * but uses the Next.js `content.ts` loaders so it works inside an App Router route.
 */
export function createContextMcpServer(): McpServer {
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

  return server;
}
