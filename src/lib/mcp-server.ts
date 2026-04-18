import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getContextFiles, getContextFile, type ContextFile } from "./content";
import { SCOPE_CONTEXT_WRITE } from "./oauth";

/**
 * Identity resolved from the incoming request's bearer. Populated by the
 * route handler, consumed by write-gated tools.
 *
 * - `isAdmin: true` means the request presented the static `MCP_WRITE_TOKEN`.
 *   Admins bypass scope checks.
 * - JWT-authenticated callers get their scopes populated from the token.
 * - Anonymous callers (no bearer) get empty scopes; read-only tools still work.
 */
export interface AuthContext {
  subject: string | null;
  scopes: string[];
  isAdmin: boolean;
}

export const ANONYMOUS_AUTH: AuthContext = {
  subject: null,
  scopes: [],
  isAdmin: false,
};

export interface McpServerOptions {
  auth?: AuthContext;
}

const SERVER_INSTRUCTIONS = `This server hosts Adam Stacey's personal context portfolio. It follows a three-tier storage model. You must understand the tiers before using any write tool.

TIER 1 — SESSION (not your concern)
  The live conversation with Adam. Ephemeral. Nothing here.

TIER 2 — JOURNAL (agent-writable, append-only)
  Files under content/journal/*.md. A rolling log of session observations written via the \`append_to_journal\` tool. Cheap signal capture. One entry per meaningful session. You may write here.

TIER 3 — CANONICAL CONTEXT (human-edited, do not write)
  Files under content/context/*.md. The distilled "About Adam" portfolio. Updated only by a human via PR, or by a curator agent that drafts PRs for human approval. You must NOT write to canonical files directly, even if it seems useful. Instead, log observations to the journal and let the curation pass promote them.

WHEN TO LOG A SESSION
  At a natural close, or when a meaningful point is reached (a decision made, a preference revealed, a problem solved, follow-ups generated). If the session was trivial, do not log. If in doubt, ask Adam or call \`session_logging_guide\`. Never log without offering first, unless Adam has explicitly said "log this".

TOOLS
  Reads (public):
    - list_context_files, search_context, get_full_context: browse the canonical portfolio
    - propose_context_update: analyse a summary against existing files before any write
    - session_logging_guide: rules for when and what to log to the journal
  Writes (require MCP_WRITE_TOKEN):
    - append_to_journal: append a structured session entry to content/journal/YYYY-MM.md
  Prompts (user-triggered):
    - log-session: slash-command template that instructs you to summarise and log the current session

Privacy rules in the canonical context files (no real names for CtM colleagues, no Digital Illumination client names, etc.) apply equally to journal entries. The journal is public once committed.`;

/**
 * Build a configured `McpServer` instance exposing Adam's context portfolio.
 *
 * Returns a fresh server each call. Callers own the lifecycle (connect transport,
 * close when done). Same read tools and resources as the stdio server in `mcp/`,
 * but backed by the Next.js `content.ts` loaders so it works inside an App Router
 * route. Adds a write path (`append_to_journal`) targeting the journal tier, a
 * curation helper (`propose_context_update`), and agent guidance primitives.
 *
 * Auth is resolved upstream (route handler) into an `AuthContext`. Read tools
 * ignore it. `append_to_journal` requires either `isAdmin` (static bearer) or
 * the `context:write` scope (OAuth-issued JWT).
 */
export function createContextMcpServer(options: McpServerOptions = {}): McpServer {
  const auth = options.auth ?? ANONYMOUS_AUTH;

  const server = new McpServer(
    {
      name: "adam-stacey-context",
      version: "1.1.0",
    },
    {
      instructions: SERVER_INSTRUCTIONS,
    }
  );

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

  // --- Read tools ---

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
    "propose_context_update",
    "Analyse a session summary or new fact against the canonical context portfolio. Returns ranked candidate files plus the passages within them that overlap with the topic. Read-only. Intended for a curator agent deciding whether an observation has matured enough to warrant a PR against canonical files. For session-level logging, use append_to_journal instead.",
    {
      summary: z
        .string()
        .describe(
          "Free-text session summary, new fact, or claim to consider for canonical promotion."
        ),
      top_k: z
        .number()
        .int()
        .min(1)
        .max(10)
        .default(3)
        .describe("How many candidate files to return with detailed snippets. Default 3."),
      snippet_budget: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(6)
        .describe("Max relevant paragraphs per candidate file. Default 6."),
    },
    async ({ summary, top_k, snippet_budget }) => {
      return proposeContextUpdate({ summary, topK: top_k, snippetBudget: snippet_budget });
    }
  );

  // --- Agent guidance ---

  server.tool(
    "session_logging_guide",
    "Return the rules for when and how to log a session to Adam's journal. Call this if you are unsure whether a session is worth logging, or to refresh the format before calling append_to_journal.",
    async () => {
      return {
        content: [
          {
            type: "text" as const,
            text: SESSION_LOGGING_GUIDE,
          },
        ],
      };
    }
  );

  // --- Write tool (journal tier) ---

  server.tool(
    "append_to_journal",
    `Append a structured session entry to Adam's journal (content/journal/YYYY-MM.md). Writes via the GitHub Contents API. Requires a bearer token matching MCP_WRITE_TOKEN.

WHEN TO USE: at a natural close of a session when something non-trivial happened (a decision, a revealed preference, a problem explored, follow-ups generated). Offer first, do not log silently unless Adam asked.

WHEN NOT TO USE: trivial sessions, mid-task, or to capture granular activity. The journal is about distillable signal, not a task log. If unsure, call session_logging_guide first.

This does NOT write to canonical context files. Those are human-edited.`,
    {
      summary: z
        .string()
        .min(50)
        .describe(
          "2-4 sentence overview of what the session was about and its most important outcome. Written in third person about Adam if possible, or in first person as Adam if natural."
        ),
      decisions: z
        .array(z.string())
        .default([])
        .describe("Non-obvious choices made or opinions formed during the session. Optional."),
      patterns: z
        .array(z.string())
        .default([])
        .describe(
          "Preferences, working-style signals, or values revealed. Candidate material for later promotion to canonical context. Optional."
        ),
      followups: z
        .array(z.string())
        .default([])
        .describe("Things left unfinished or to revisit in a future session. Optional."),
      tags: z
        .array(z.string())
        .default([])
        .describe("Free-form tags for cross-reference (e.g. 'mcp', 'cloud-run'). Optional."),
      agent: z
        .string()
        .optional()
        .describe(
          "Client name, e.g. 'Claude Code', 'claude.ai', 'Cowork'. Optional. Defaults to 'unknown'."
        ),
    },
    async (args) => {
      return appendToJournal({ auth, ...args });
    }
  );

  // --- Prompts (user-triggered) ---

  server.prompt(
    "log-session",
    "Summarise the current session and log it to Adam's journal. Use at the end of a meaningful session to capture what happened.",
    async () => {
      return {
        description: "Log the current session to Adam's journal.",
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Please summarise this session and log it to Adam's journal.

Step 1: call \`session_logging_guide\` if you need the current rules for what belongs in a journal entry.

Step 2: check whether the session is worth logging. If the session was trivial (a quick question, a small edit with no broader signal), stop and tell Adam "nothing worth logging". Otherwise continue.

Step 3: call \`append_to_journal\` with these fields:
  - summary: 2-4 sentences, what the session was about and the key outcome
  - decisions: non-obvious choices or opinions formed (array, can be empty)
  - patterns: preferences or working-style signals revealed, as candidates for canonical promotion (array, can be empty)
  - followups: things left unfinished (array, can be empty)
  - tags: free-form tags for cross-reference (array, can be empty)
  - agent: the name of the client you are running in, if you know it

Respect the privacy rules: no real names for Compare the Market colleagues, no client names from Digital Illumination, no operational secrets.

After the tool returns, show Adam the commit link so he can review.`,
            },
          },
        ],
      };
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

// --- Session logging guide content ---

const SESSION_LOGGING_GUIDE = `# Session Logging Guide

## When to log

Log this session to the journal if ANY of these are true:
- A non-trivial decision was made, especially with reasoning worth remembering
- A preference or working-style signal was revealed (architecture taste, risk tolerance, voice)
- A new problem was explored or a technical direction was set
- Follow-up work was generated that Adam will want to revisit
- Something surprised Adam or changed his mind

## When NOT to log

- Trivial sessions (quick questions, small edits, one-line answers)
- Nothing non-obvious happened
- Adam explicitly said "don't log this"
- You are not at a natural close yet (wait for the session to wrap up)

## Where to log

Call \`append_to_journal\`. The server routes to content/journal/YYYY-MM.md for the current month. You do not pick the path.

## Fields

- **summary** (required, ≥50 chars): 2-4 sentence overview. What was the session about? What was the key outcome?
- **decisions** (optional array): choices or opinions that weren't obvious going in
- **patterns** (optional array): preferences or traits revealed. These are candidates for later promotion to canonical context files, so write them at the right altitude. "Adam prefers X over Y in situation Z" is better than "Adam chose X today".
- **followups** (optional array): things to revisit
- **tags** (optional array): terms for cross-reference

## Voice

Third person about Adam ("Adam decided...", "Adam prefers...") OR first person as Adam if that reads more naturally. Do not write in agent-voice ("I helped Adam do..."). The journal is about Adam, not about you.

## Privacy

The privacy rules in SPEC.md apply: no real names for Compare the Market colleagues, no Digital Illumination client names, no operational secrets.

## When in doubt

Ask Adam: "Worth logging this session?" Then act on his answer. Never log silently unless he explicitly delegated the decision.`;

// --- append_to_journal implementation ---

interface AppendJournalArgs {
  auth: AuthContext;
  summary: string;
  decisions: string[];
  patterns: string[];
  followups: string[];
  tags: string[];
  agent?: string;
}

function currentMonthSlug(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function currentMonthTitle(now: Date = new Date()): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[now.getUTCMonth()]} ${now.getUTCFullYear()}`;
}

function isoMinutes(now: Date = new Date()): string {
  // 2026-04-18T09:45Z (no seconds or ms, UTC)
  return now.toISOString().replace(/:\d{2}\.\d{3}Z$/, "Z");
}

function formatJournalEntry(args: Omit<AppendJournalArgs, "authHeader">, now: Date = new Date()): string {
  const ts = isoMinutes(now);
  const agent = (args.agent && args.agent.trim()) || "unknown";

  const lines: string[] = [];
  lines.push(`## ${ts} — ${agent}`);
  lines.push("");
  lines.push(`**Summary:** ${args.summary.trim()}`);
  lines.push("");

  if (args.decisions.length > 0) {
    lines.push("**Decisions:**");
    for (const d of args.decisions) lines.push(`- ${d.trim()}`);
    lines.push("");
  }
  if (args.patterns.length > 0) {
    lines.push("**Patterns:**");
    for (const p of args.patterns) lines.push(`- ${p.trim()}`);
    lines.push("");
  }
  if (args.followups.length > 0) {
    lines.push("**Follow-ups:**");
    for (const f of args.followups) lines.push(`- ${f.trim()}`);
    lines.push("");
  }
  if (args.tags.length > 0) {
    lines.push(`**Tags:** ${args.tags.map((t) => t.trim()).join(", ")}`);
    lines.push("");
  }
  lines.push("---");
  lines.push("");

  return lines.join("\n");
}

function newMonthlyFile(monthTitle: string): string {
  return `---
title: Journal — ${monthTitle}
description: Raw session observations for later review. Append-only, agent-writable. Promoted to canonical context via human-reviewed PRs.
---

# Journal — ${monthTitle}

`;
}

async function appendToJournal(args: AppendJournalArgs) {
  if (!args.auth.isAdmin && !args.auth.scopes.includes(SCOPE_CONTEXT_WRITE)) {
    return toolError(
      `Unauthorized: append_to_journal requires the '${SCOPE_CONTEXT_WRITE}' scope, or the admin bearer.`
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

  const now = new Date();
  const monthSlug = currentMonthSlug(now);
  const monthTitle = currentMonthTitle(now);
  const filePath = `content/journal/${monthSlug}.md`;
  const apiBase = `https://api.github.com/repos/${repo}/contents/${filePath}`;

  const ghHeaders: Record<string, string> = {
    Authorization: `Bearer ${githubToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ad-nav-mcp",
  };

  // GET current file (if any)
  const getRes = await fetch(`${apiBase}?ref=${encodeURIComponent(branch)}`, {
    headers: ghHeaders,
  });

  let existingContent = "";
  let sha: string | undefined;

  if (getRes.status === 200) {
    const fileJson = (await getRes.json()) as { content: string; sha: string; encoding: string };
    if (fileJson.encoding !== "base64") {
      return toolError(`Unexpected GitHub encoding: ${fileJson.encoding}`);
    }
    existingContent = Buffer.from(fileJson.content, "base64").toString("utf-8");
    sha = fileJson.sha;
  } else if (getRes.status === 404) {
    existingContent = newMonthlyFile(monthTitle);
  } else {
    return toolError(`GitHub GET failed (${getRes.status}): ${await getRes.text()}`);
  }

  const entry = formatJournalEntry(args, now);
  const newRaw = existingContent.endsWith("\n")
    ? `${existingContent}${entry}`
    : `${existingContent}\n${entry}`;

  const putBody: Record<string, unknown> = {
    message: `Journal entry ${isoMinutes(now)} via MCP`,
    content: Buffer.from(newRaw, "utf-8").toString("base64"),
    branch,
  };
  if (sha) putBody.sha = sha;

  const putRes = await fetch(apiBase, {
    method: "PUT",
    headers: { ...ghHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(putBody),
  });

  if (!putRes.ok) {
    return toolError(`GitHub PUT failed (${putRes.status}): ${await putRes.text()}`);
  }

  const putJson = (await putRes.json()) as { commit: { sha: string; html_url: string } };

  return {
    content: [
      {
        type: "text" as const,
        text: `Logged session to ${filePath} on ${branch}.
Commit: ${putJson.commit.sha}
${putJson.commit.html_url}`,
      },
    ],
  };
}

// --- propose_context_update implementation ---

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be", "been",
  "being", "to", "of", "in", "on", "at", "for", "by", "with", "as", "from", "that",
  "this", "it", "its", "i", "you", "he", "she", "we", "they", "them", "their",
  "his", "her", "my", "our", "me", "us", "have", "has", "had", "do", "does", "did",
  "will", "would", "should", "could", "can", "may", "might", "must", "not", "no",
  "so", "if", "then", "than", "too", "very", "just", "also", "only", "about",
  "into", "out", "up", "down", "over", "under", "more", "less", "one", "two",
  "some", "any", "all", "each", "every", "most", "least", "there", "here",
  "where", "when", "what", "which", "who", "how", "why",
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
  );
}

function scoreFile(queryTerms: Set<string>, file: ContextFile): number {
  const titleTerms = tokenize(file.title);
  const descTerms = tokenize(file.description);
  const contentTerms = tokenize(file.content);
  let score = 0;
  for (const term of queryTerms) {
    if (titleTerms.has(term)) score += 3;
    if (descTerms.has(term)) score += 2;
    if (contentTerms.has(term)) score += 1;
  }
  return score;
}

function topParagraphs(content: string, queryTerms: Set<string>, budget: number): string[] {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const scored = paragraphs
    .map((p) => {
      const pTerms = tokenize(p);
      let hits = 0;
      for (const term of queryTerms) {
        if (pTerms.has(term)) hits++;
      }
      return { p, hits };
    })
    .filter((x) => x.hits > 0);

  scored.sort((a, b) => b.hits - a.hits);
  return scored.slice(0, budget).map((x) => x.p);
}

interface ProposeArgs {
  summary: string;
  topK: number;
  snippetBudget: number;
}

async function proposeContextUpdate({ summary, topK, snippetBudget }: ProposeArgs) {
  const files = getContextFiles();
  if (files.length === 0) {
    return {
      content: [{ type: "text" as const, text: "No context files loaded." }],
    };
  }

  const queryTerms = tokenize(summary);
  if (queryTerms.size === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Summary produced no usable search terms (too short, or entirely stop-words). Provide more detail.",
        },
      ],
    };
  }

  const scored = files
    .map((f) => ({ file: f, score: scoreFile(queryTerms, f) }))
    .sort((a, b) => b.score - a.score);

  const candidates = scored.filter((s) => s.score > 0).slice(0, topK);
  const candidateNames = new Set(candidates.map((c) => c.file.filename));
  const rest = files.filter((f) => !candidateNames.has(f.filename));

  const sections = candidates.map((c, i) => {
    const snippets = topParagraphs(c.file.content, queryTerms, snippetBudget);
    const snippetBlock =
      snippets.length > 0
        ? snippets.map((s) => `> ${s.replace(/\n/g, "\n> ")}`).join("\n\n")
        : "_(matched only on title or description, no body paragraphs overlapped)_";
    return `### ${i + 1}. \`${c.file.filename}\` (score ${c.score})

**Title:** ${c.file.title}
**Description:** ${c.file.description}

**Relevant existing content:**

${snippetBlock}`;
  });

  const restListing =
    rest.length > 0
      ? rest.map((f) => `- \`${f.filename}\`: ${f.description}`).join("\n")
      : "_(all files were candidates)_";

  const termPreview = Array.from(queryTerms).slice(0, 20).join(", ");
  const termOverflow = queryTerms.size > 20 ? ` (+${queryTerms.size - 20} more)` : "";

  const summaryPreview =
    summary.length > 200 ? `${summary.slice(0, 200)}...` : summary;

  const candidatesBlock =
    candidates.length > 0
      ? sections.join("\n\n")
      : "_No files scored above zero. The summary does not overlap with any existing content. If worth keeping, it belongs in a new file, which is a human decision, not an agent one._";

  const text = [
    `# Context update proposal`,
    ``,
    `**Summary considered:** ${summaryPreview}`,
    ``,
    `**Search terms extracted:** ${termPreview}${termOverflow}`,
    ``,
    `## Candidate files (ranked by keyword overlap)`,
    ``,
    candidatesBlock,
    ``,
    `## Other files (for reference)`,
    ``,
    restListing,
    ``,
    `---`,
    ``,
    `## Next steps`,
    ``,
    `This tool is for a CURATOR pass, not session-level logging. If you are ending a session, call \`append_to_journal\` instead. If you are reviewing journal material for promotion to canonical context:`,
    ``,
    `- If a pattern is durable and well-supported, raise a PR against the most-relevant canonical file above.`,
    `- If the signal only appeared once, leave it in the journal and wait.`,
    `- Never write to canonical files directly from this tool's output.`,
  ].join("\n");

  return {
    content: [{ type: "text" as const, text }],
  };
}
