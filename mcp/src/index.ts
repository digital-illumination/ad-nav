#!/usr/bin/env node

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Content directory: env var override, or default to ../content/context from repo root
const CONTENT_DIR =
  process.env.CONTEXT_DIR ||
  path.resolve(__dirname, "..", "..", "content", "context");

// Log file for usage tracking
const LOG_DIR = process.env.MCP_LOG_DIR || path.resolve(os.homedir(), ".adam-stacey-context");
const LOG_FILE = path.join(LOG_DIR, "usage.log");

let clientName = "unknown";
let clientResolved = false;

function resolveClient() {
  if (clientResolved) return;
  try {
    const version = server.server.getClientVersion();
    if (version?.name) {
      clientName = version.name;
      clientResolved = true;
    }
  } catch {
    // Not yet available
  }
}

function log(action: string, detail: string = "") {
  try {
    resolveClient();
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    const timestamp = new Date().toISOString();
    const entry = `${timestamp} | ${clientName} | ${action}${detail ? ` | ${detail}` : ""}\n`;
    fs.appendFileSync(LOG_FILE, entry);
  } catch {
    // Logging should never break the server
  }
}

interface ContextFile {
  filename: string;
  title: string;
  description: string;
  content: string;
}

function loadAllContextFiles(): ContextFile[] {
  if (!fs.existsSync(CONTENT_DIR)) {
    console.error(`Context directory not found: ${CONTENT_DIR}`);
    return [];
  }

  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");
      const { data, content } = matter(raw);
      return {
        filename: file.replace(/\.md$/, ""),
        title: data.title || file.replace(/\.md$/, "").replace(/-/g, " "),
        description: data.description || "",
        content: content.trim(),
      };
    });
}

function loadContextFile(filename: string): ContextFile | null {
  const filePath = path.join(CONTENT_DIR, `${filename}.md`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  return {
    filename,
    title: data.title || filename.replace(/-/g, " "),
    description: data.description || "",
    content: content.trim(),
  };
}

// --- Server setup ---

const server = new McpServer({
  name: "adam-stacey-context",
  version: "1.0.0",
  description:
    "Personal context portfolio for Adam Stacey. Provides structured context files covering identity, expertise, communication style, and working preferences for AI agents acting on his behalf.",
});

// --- Resources ---

// Individual context files as a template resource
server.resource(
  "context-file",
  new ResourceTemplate("context://adam-stacey/{filename}", {
    list: async () => {
      const files = loadAllContextFiles();
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
    log("resource:read", `context://adam-stacey/${filename}`);
    const file = loadContextFile(filename);
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

// List all context files with metadata
server.tool(
  "list_context_files",
  "List all available context files with titles and descriptions. Use this first to see what context is available.",
  async () => {
    log("tool:list_context_files");
    const files = loadAllContextFiles();
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

// Search across all context files
server.tool(
  "search_context",
  "Search across all context files for a keyword or phrase. Returns matching files with relevant excerpts.",
  { query: z.string().describe("Search term or phrase") },
  async ({ query }) => {
    log("tool:search_context", `query="${query}"`);
    const files = loadAllContextFiles();
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

// Load the full context portfolio in one go
server.tool(
  "get_full_context",
  "Load the entire context portfolio as a single document. Use this when you need to understand Adam fully before drafting content, making decisions, or acting on his behalf.",
  async () => {
    log("tool:get_full_context");
    const files = loadAllContextFiles();
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

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Capture client identity from the session
  const session = server.server.getClientVersion();
  if (session) {
    clientName = session.name || "unknown";
  }

  log("server:connected", `client=${clientName}`);
  console.error("Adam Stacey Context MCP Server running on stdio");
  console.error(`Reading context from: ${CONTENT_DIR}`);
  console.error(`Logging to: ${LOG_FILE}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
