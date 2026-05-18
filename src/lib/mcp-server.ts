import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getContextFiles, getContextFile, type ContextFile } from "./content";
import { SCOPE_CONTEXT_WRITE } from "./oauth";
import {
  consumeFlags,
  createFlag,
  FLAG_KINDS,
  FLAG_MAX_LEN,
  listFlagsForSubject,
  type FlagKind,
} from "./flags-storage";
import {
  cosineSimilarity,
  embedQuery,
  getCanonicalEmbeddings,
  reciprocalRankFusion,
} from "./embeddings";
import {
  listJournalEmbeddings,
  previewOf,
  stripFrontmatter,
  upsertJournalEmbedding,
} from "./journal-embeddings-storage";
import {
  ARCHIVE_KINDS,
  listArchiveEmbeddings,
  upsertArchiveEmbedding,
  type ArchiveKind,
} from "./archive-embeddings-storage";

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

/**
 * Tools that require `isAdmin` OR the `context:write` scope. Each handler
 * below also enforces this itself (defence in depth); this set is the single
 * source of truth the `/api/mcp` route uses to decide when to answer an
 * under-authorised `tools/call` with an HTTP 401 + `WWW-Authenticate`
 * challenge, so MCP clients (claude.ai) actually start the OAuth flow
 * instead of silently receiving a tool-level error and never authenticating.
 *
 * Keep in sync with the per-tool scope checks. If you add a write-gated
 * tool, add its name here too.
 */
export const AUTH_REQUIRED_TOOLS: ReadonlySet<string> = new Set([
  "append_to_journal",
  "get_journal_entries",
  "semantic_search_journal",
  "drop_to_archive",
  "semantic_search_archive",
  "search_all",
  "curator_review",
  "flag_signal",
  "list_flags",
]);

export interface McpServerOptions {
  auth?: AuthContext;
}

const SERVER_INSTRUCTIONS = `This server hosts Adam Stacey's personal context portfolio. It follows a four-tier storage model. You must understand the tiers before using any write tool.

TIER 0 — ARCHIVE (agent-writable, PRIVATE)
  Raw substrate: voice-memo transcripts, interview answers, meeting notes, decision drafts, anything that should be kept verbatim rather than distilled. Written via the \`drop_to_archive\` tool. Stored in a private repo. Indexed for semantic retrieval via \`semantic_search_archive\`. Use this when you want to preserve the user's actual words (or a verbatim record) rather than a structured summary. The journal tier is for distilled signal; this tier is for the raw substrate that future curation reads from.

TIER 1 — SESSION (not your concern)
  The live conversation with Adam. Ephemeral. Nothing here.

TIER 2 — JOURNAL (agent-writable, append-only, PRIVATE)
  Distilled session signal. Written via the \`append_to_journal\` tool. Stored in a private repo, NOT public. You can be candid here: verbatim quotes, internal tool names, honest pattern observations. Privacy rules around third parties (no real names for CtM colleagues, no Digital Illumination client names, no NDA material) still apply. Use \`get_journal_entries\` to read prior months if you need context.

  Mid-session flags sit just below this tier. Use \`flag_signal\` to mark a moment worth keeping without writing a full entry; the flag survives for 24 hours scoped to your auth subject. At session close, call \`list_flags\` to recall what you flagged, weave the content into a structured journal entry, and pass the flag ids to \`append_to_journal\` so they can be deleted. Flags are NOT a parallel storage tier; they are a staging surface for journal writes.

TIER 3 — CANONICAL CONTEXT (human-edited, do not write)
  Files under content/context/*.md in the public ad-nav repo. The distilled "About Adam" portfolio. Updated only by a human via PR, or by a curator agent that drafts PRs for human approval. You must NOT write to canonical files directly, even if it seems useful. Instead, log observations to the journal and let the curation pass promote them. Use \`curator_review\` to surface the journal and archive material related to a given canonical file when deciding whether it's due for a refresh.

WHEN TO LOG A SESSION
  At a natural close, or when a meaningful point is reached (a decision made, a preference revealed, a problem solved, follow-ups generated). If the session was trivial, do not log. If in doubt, ask Adam or call \`session_logging_guide\`. Never log without offering first, unless Adam has explicitly said "log this".

TOOLS
  Reads (public):
    - list_context_files, search_context, get_full_context: browse the canonical portfolio
    - propose_context_update: analyse a summary against existing files before any write
    - session_logging_guide: rules for when and what to log to the journal
    - get_log_session_script / get_interview_script: the log-session and daily-interview protocols as text. Identical to the same-named MCP prompts; mirrored as tools because some clients (Claude Code) do not surface MCP prompts as slash commands
  Reads (require auth):
    - get_journal_entries: fetch a month of journal entries (private)
    - semantic_search_journal: find journal entries semantically similar to a query (across all months)
    - semantic_search_archive: find raw archive material (voice memos, interview answers, meeting notes) semantically similar to a query
    - search_all: one-call search across canonical + journal + archive, grouped by tier
    - curator_review: list journal and archive material related to a canonical context file (input for human-reviewed canonical refresh)
    - list_flags: recall your own mid-session flags from the last 24 hours
  Writes (require auth):
    - flag_signal: mark a mid-session moment worth keeping (cheap, expires in 24 hours)
    - drop_to_archive: write raw substrate (voice memos, interview answers, meeting notes) to the archive tier verbatim
    - append_to_journal: append a structured session entry to the private journal (optionally consuming flag ids)
  Prompts (user-triggered, for clients that surface MCP prompts):
    - log-session: summarise and log the current session (same text as get_log_session_script)
    - daily-interview: run a short structured interview, capture raw answers to the archive, write a distilled journal entry (same text as get_interview_script)`;

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

/**
 * Single source of truth for the log-session protocol text.
 *
 * Surfaced two ways: as the `log-session` MCP prompt (for clients that expose
 * MCP prompts) and as the `get_log_session_script` tool (for Claude Code,
 * which does not surface MCP prompts as slash commands — the `.claude/commands`
 * wrapper calls the tool instead). Define it once here so the two never drift.
 */
function buildLogSessionScript(): string {
  return `Please summarise this session and log it to Adam's journal.

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

After the tool returns, show Adam the commit link so he can review.`;
}

/**
 * Single source of truth for the daily-interview protocol text. Same
 * dual-surface rationale as buildLogSessionScript: the `daily-interview` MCP
 * prompt and the `get_interview_script` tool both return this, so Claude Code
 * (no MCP-prompt support) and prompt-capable clients stay in lockstep.
 *
 * `now` is injected so the session label is deterministic per call and the
 * function stays pure (no hidden Date() dependency).
 */
function buildDailyInterviewScript(now: Date): string {
  const sessionLabel = `interview:daily-${now.toISOString().slice(0, 10)}`;
  return `Run a structured daily interview with Adam. Adam will dictate answers via Wispr; your job is to ask the right questions, preserve his raw responses in the archive tier, and at the end write one distilled journal entry.

# Protocol

Step 1: GROUND THE QUESTIONS. Before asking anything, call:
  - \`get_journal_entries\` for the current UTC month, and the previous one if it exists
  - \`get_full_context\` to refresh on canonical material

You are looking for: recent themes Adam has been thinking about, projects mentioned in canonical that haven't surfaced in journal entries lately, decisions in flight, anything that warrants a check-in.

Step 2: BUILD A 5-QUESTION SCRIPT. Mix two fixed scaffolding questions with three topical ones. Order from concrete to reflective.

Fixed scaffolding (always ask):
  Q1. What did you ship, decide, or move forward today?
  Q2. What's the next concrete thing on your mind for tomorrow or this week?

Topical (you choose three based on the context above). Examples of good topical questions, NOT to be used verbatim:
  - "I see PicoPouch in your current projects but it hasn't come up in the journal for [N] weeks. What's the current state?"
  - "Your recent entries have a thread about agent-first delivery. Anything new there?"
  - "How are the partnership conversations progressing? Any shifts in how you're framing yourself?"

Pick questions Adam would WANT to answer today, anchored in his actual material. Avoid generic "how are you feeling" prompts.

Step 3: ASK ONE AT A TIME. For each question in turn:
  a. Ask the question. ONE question per turn, not the full script up-front. Wait for Adam's response.
  b. When Adam responds, call \`drop_to_archive\` immediately with:
       - text: his verbatim response (trimmed, no distillation)
       - kind: "interview"
       - source: "${sessionLabel}"
       - agent: your client name if you know it
  c. Brief acknowledgement (one short sentence, NOT a paraphrase or summary). Move to the next question.

Do NOT distil, summarise, or rephrase Adam's responses during the interview itself. The raw words are the point of the archive tier.

Step 4: AT THE END, write one distilled journal entry via \`append_to_journal\`:
  - summary: 2-4 sentences synthesising the session
  - decisions: any decisions Adam made or stated during the interview (array)
  - patterns: preferences or working-style signals revealed (array)
  - followups: things Adam mentioned he'd revisit (array)
  - tags: include "daily-interview" plus anything topical
  - agent: your client name if known

The five archive drops and the single journal entry are linked by the shared \`source\` label and the timestamps falling within one session.

Step 5: SHOW ADAM the commit link for the journal entry. He can find the five archive drops via the source label if he wants them.

# Privacy

Same rules as logging: no real names for Compare the Market colleagues, no client names from Digital Illumination, no operational secrets. If Adam says something that violates these, ask him to confirm before archiving.

# If Adam says skip a question

If Adam wants to skip a question, do not drop anything to the archive for that question and move on. The journal entry should reflect what he chose to answer, not what he skipped.

# Begin

Greet Adam briefly, tell him the session label (${sessionLabel}), and ask the first question.`;
}

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
    `Search the canonical context portfolio for passages relevant to a query. Returns the most relevant paragraphs across all files, ranked by hybrid retrieval (keyword + vector similarity, blended via reciprocal rank fusion).

Vector retrieval is enabled when the canonical embedding index has been built (scripts/build-canonical-embeddings.mjs) and OPENAI_API_KEY is set on the server. If either is missing, the tool degrades to keyword-only and still returns results.`,
    {
      query: z.string().describe("Search term or natural-language query."),
      top_k: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(5)
        .describe("How many paragraphs to return. Default 5, max 20."),
    },
    async ({ query, top_k }) => {
      return searchContext({ query, topK: top_k });
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

  // Prompt scripts mirrored as tools. Claude Code does not surface MCP
  // prompts as slash commands, so the `.claude/commands` wrappers call these
  // tools instead. Same text as the `log-session` / `daily-interview` MCP
  // prompts (shared builders), so the two surfaces never drift. Public, like
  // session_logging_guide — they return instructions, not private data.

  server.tool(
    "get_log_session_script",
    "Return the log-session protocol as text to follow. Equivalent to the `log-session` MCP prompt; exists because Claude Code does not expose MCP prompts as slash commands, so the /log-session command wrapper calls this instead. Follow the returned steps exactly.",
    async () => {
      return {
        content: [{ type: "text" as const, text: buildLogSessionScript() }],
      };
    }
  );

  server.tool(
    "get_interview_script",
    "Return the daily-interview protocol as text to follow start to finish. Equivalent to the `daily-interview` MCP prompt; exists because Claude Code does not expose MCP prompts as slash commands, so the /daily-interview command wrapper calls this instead. Follow the returned protocol exactly, do not summarise or skip steps.",
    async () => {
      return {
        content: [{ type: "text" as const, text: buildDailyInterviewScript(new Date()) }],
      };
    }
  );

  // --- Auth-gated journal reads ---

  server.tool(
    "get_journal_entries",
    `Fetch the journal entries for a given month (or the current UTC month if none given). The journal is private, so this tool requires the same auth as append_to_journal: admin bearer (MCP_WRITE_TOKEN) or OAuth JWT with context:write scope.

Use this to read your own prior journal observations before composing a new entry, or as a curator pass to look for patterns across multiple sessions in a month. Returns the concatenated markdown of every per-entry file in journal/YYYY/MM/, sorted by timestamp.`,
    {
      month: z
        .string()
        .regex(/^\d{4}-\d{2}$/, "Must be YYYY-MM")
        .optional()
        .describe("UTC month to fetch, e.g. '2026-05'. Defaults to the current UTC month."),
    },
    async ({ month }) => {
      return getJournalEntries({ auth, month });
    }
  );

  server.tool(
    "semantic_search_journal",
    `Search the private journal by semantic similarity to a query. Embeds the query via OpenAI text-embedding-3-small, ranks every indexed entry by cosine similarity, fetches the top_k entries from adam-corpus, and returns them with their relevance scores.

WHEN TO USE: when you want to recall journal observations relevant to a topic without already knowing the date range. For a specific month, use get_journal_entries. For canonical context about Adam himself, use search_context.

Requires admin bearer (MCP_WRITE_TOKEN) or OAuth JWT with context:write scope. Also requires OPENAI_API_KEY on the server; returns an error if unset (this tool has no keyword fallback).`,
    {
      query: z.string().min(1).describe("Search term or natural-language query."),
      top_k: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(5)
        .describe("How many entries to return. Default 5, max 20."),
    },
    async ({ query, top_k }) => {
      return semanticSearchJournal({ auth, query, topK: top_k });
    }
  );

  server.tool(
    "semantic_search_archive",
    `Search the archive tier by semantic similarity to a query. Same shape as semantic_search_journal but over raw substrate (voice memos, interview answers, meeting notes, etc.) rather than distilled journal entries.

WHEN TO USE: when you want the user's actual words on a topic rather than a structured summary. For distilled session signal, use semantic_search_journal. For canonical context about Adam himself, use search_context.

Requires admin bearer (MCP_WRITE_TOKEN) or OAuth JWT with context:write scope. Also requires OPENAI_API_KEY on the server; returns an error if unset (this tool has no keyword fallback).`,
    {
      query: z.string().min(1).describe("Search term or natural-language query."),
      top_k: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(5)
        .describe("How many entries to return. Default 5, max 20."),
    },
    async ({ query, top_k }) => {
      return semanticSearchArchive({ auth, query, topK: top_k });
    }
  );

  server.tool(
    "curator_review",
    `List the journal entries and archive drops semantically related to a given canonical context file. Read-only. Use this when considering whether a canonical file is due for a refresh.

Process: looks up the canonical file's precomputed paragraph embeddings, ranks every indexed journal entry and archive drop by best-match cosine similarity to any of those paragraphs, and returns the top top_k candidates with their tier, path, timestamp, similarity score, and preview text. No new OpenAI calls are made; the comparison reuses embeddings already in storage.

Does NOT auto-draft a PR or modify canonical content. The output is intended as input for a human (or an agent on the user's behalf) deciding whether the accumulated material has matured enough to justify a manual canonical update.

Requires admin bearer (MCP_WRITE_TOKEN) or OAuth JWT with context:write scope.`,
    {
      file: z
        .string()
        .min(1)
        .describe(
          "Canonical filename without extension (e.g. 'identity', 'decision-log'). Use list_context_files to see available files."
        ),
      top_k: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(10)
        .describe("How many candidate items to return. Default 10, max 50."),
    },
    async ({ file, top_k }) => {
      return curatorReview({ auth, file, topK: top_k });
    }
  );

  server.tool(
    "search_all",
    `Search across all three indexed tiers (canonical, journal, archive) in a single call. Embeds the query once and ranks each tier independently against it; returns the top top_k_per_tier results from each, grouped by tier.

Tiers are NOT blended into a unified ranking — their vector distributions are different and their content shapes are different (curated portfolio vs distilled session signal vs raw substrate). Grouping by tier is more honest about the comparison limits and lets the agent reason about each tier appropriately.

Use this when you want the full picture of what the user has said or written about a topic without making three separate tool calls (search_context, semantic_search_journal, semantic_search_archive).

Requires admin bearer (MCP_WRITE_TOKEN) or OAuth JWT with context:write scope (since results include private tiers). Also requires OPENAI_API_KEY on the server; returns an error if unset.`,
    {
      query: z.string().min(1).describe("Search term or natural-language query."),
      top_k_per_tier: z
        .number()
        .int()
        .min(1)
        .max(10)
        .default(3)
        .describe("How many results to return per tier. Default 3, max 10."),
    },
    async ({ query, top_k_per_tier }) => {
      return searchAll({ auth, query, topK: top_k_per_tier });
    }
  );

  // --- Mid-session flags ---

  server.tool(
    "flag_signal",
    `Mark a moment in the current session worth keeping, without writing a full journal entry. Cheap, fast, expires after 24 hours. Use this when something interesting happens mid-conversation (a decision forming, a preference revealing itself, a follow-up surfacing) and you don't want to commit to a journal entry yet.

At session close, call list_flags to recall what you flagged, weave the content into a structured journal entry, and pass the flag ids back to append_to_journal so they can be deleted.

Requires admin bearer (MCP_WRITE_TOKEN) or OAuth JWT with context:write scope.`,
    {
      text: z
        .string()
        .min(1)
        .max(FLAG_MAX_LEN)
        .describe(
          `The observation to flag. One short sentence (max ${FLAG_MAX_LEN} chars). Capture the signal, not the verbatim conversation.`
        ),
      kind: z
        .enum(FLAG_KINDS)
        .optional()
        .describe(
          "Optional category to help downstream distillation: 'decision', 'preference', 'observation', or 'followup'. Mirrors the journal entry fields."
        ),
      agent: z
        .string()
        .optional()
        .describe("Client name, e.g. 'Claude Code', 'claude.ai'. Optional."),
    },
    async (args) => {
      return flagSignal({ auth, ...args });
    }
  );

  server.tool(
    "list_flags",
    `List your own mid-session flags from the last 24 hours, oldest first. Flags are scoped to your auth subject; you cannot see another subject's flags.

Use this at session close to recall what you flagged earlier in the conversation, then write a single journal entry that incorporates the relevant content. Pass the flag ids back to append_to_journal so the flags are deleted once the journal entry is durable.

Requires admin bearer (MCP_WRITE_TOKEN) or OAuth JWT with context:write scope.`,
    async () => {
      return listFlagsTool({ auth });
    }
  );

  // --- Write tool (journal tier) ---

  server.tool(
    "append_to_journal",
    `Append a structured session entry to Adam's PRIVATE journal. The journal lives in a private repo, separate from the public ad-nav site. Writes via the GitHub Contents API. Requires admin bearer (MCP_WRITE_TOKEN) or OAuth JWT with context:write scope.

WHEN TO USE: at a natural close of a session when something non-trivial happened (a decision, a revealed preference, a problem explored, follow-ups generated). Offer first, do not log silently unless Adam asked.

WHEN NOT TO USE: trivial sessions, mid-task, or to capture granular activity. The journal is about distillable signal, not a task log. If unsure, call session_logging_guide first.

Because the journal is private, you can be candid: verbatim quotes, internal tool names, honest pattern observations. Third-party privacy (CtM colleagues, DI clients, NDA material) still applies.

This does NOT write to canonical context files. Those are human-edited.

If you flagged content mid-session via flag_signal, recall it with list_flags, distribute it into the right fields below (summary/decisions/patterns/followups), and pass the flag ids in flag_ids so the flags are deleted once the entry commits.`,
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
      flag_ids: z
        .array(z.string())
        .default([])
        .describe(
          "Mid-session flag ids (from flag_signal / list_flags) to delete after the entry commits. Optional; the flag content itself should already be woven into the fields above. Flags that don't belong to your subject or have expired are silently skipped."
        ),
    },
    async (args) => {
      return appendToJournal({ auth, ...args });
    }
  );

  // --- Archive write ---

  server.tool(
    "drop_to_archive",
    `Write a raw text drop to the archive tier in Adam's private corpus. Use this for substrate that should be preserved VERBATIM rather than distilled: voice-memo transcripts, interview answers, meeting notes, decision drafts, anything in his own words.

WHEN TO USE: when the agent should preserve content as-is. Per-question responses during a daily-interview flow. A snippet Adam dictated and asked you to "save". A meeting transcript.

WHEN NOT TO USE: for structured session summaries (use append_to_journal — that's the distilled tier). For canonical "About Adam" content (humans only edit those).

After the GitHub PUT succeeds, the drop is best-effort embedded and upserted into the Firestore archive_embeddings collection so it surfaces in semantic_search_archive. A failed embed is logged but does not fail the tool call.

Requires admin bearer (MCP_WRITE_TOKEN) or OAuth JWT with context:write scope.`,
    {
      text: z
        .string()
        .min(1)
        .describe("The raw text to archive. Preserved verbatim (no distillation, no reformatting)."),
      kind: z
        .enum(ARCHIVE_KINDS)
        .describe(
          "Category of substrate. 'voice-memo' for transcribed dictation, 'interview' for answers during a daily-interview flow, 'meeting' for meeting notes, 'note' for free-form notes, 'other' otherwise."
        ),
      source: z
        .string()
        .optional()
        .describe(
          "Optional label grouping related drops, e.g. 'interview:daily-2026-05-14'. Lets a session of related drops be reconstructed later."
        ),
      agent: z
        .string()
        .optional()
        .describe("Client name, e.g. 'Claude Code', 'claude.ai'. Optional. Defaults to 'unknown'."),
    },
    async (args) => {
      return dropToArchive({ auth, ...args });
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
            content: { type: "text" as const, text: buildLogSessionScript() },
          },
        ],
      };
    }
  );

  server.prompt(
    "daily-interview",
    "Run a short structured interview to capture today's signal. Adam dictates answers via Wispr; you preserve each raw response to the archive and write one distilled journal entry at the end.",
    async () => {
      return {
        description: "Run today's structured interview and capture the result.",
        messages: [
          {
            role: "user" as const,
            content: { type: "text" as const, text: buildDailyInterviewScript(new Date()) },
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

Call \`append_to_journal\`. The server routes to the current month's journal file in Adam's private corpus. You do not pick the path. The journal is private, not public.

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

// --- Auth subject derivation ---

/**
 * Resolve an `AuthContext` to the subject we attribute writes to.
 *
 * - Admin requests (static bearer) get the reserved subject "admin". All
 *   admin-issued flags pool under one identity; there is only one admin.
 * - OAuth requests with the write scope use their JWT `sub` claim (the
 *   GitHub login). Each login gets its own private flag pool.
 * - Anyone else (anonymous, or authenticated without write scope) gets null,
 *   which the caller turns into an unauthorized tool error.
 */
function authSubject(auth: AuthContext): string | null {
  if (auth.isAdmin) return "admin";
  if (auth.scopes.includes(SCOPE_CONTEXT_WRITE) && auth.subject) return auth.subject;
  return null;
}

// --- flag_signal implementation ---

interface FlagSignalArgs {
  auth: AuthContext;
  text: string;
  kind?: FlagKind;
  agent?: string;
}

async function flagSignal(args: FlagSignalArgs) {
  const subject = authSubject(args.auth);
  if (!subject) {
    return toolError(
      `Unauthorized: flag_signal requires the '${SCOPE_CONTEXT_WRITE}' scope, or the admin bearer.`
    );
  }

  const flag = await createFlag({
    subject,
    text: args.text.trim(),
    kind: args.kind,
    agent: args.agent?.trim() || undefined,
  });

  const kindLabel = flag.kind ? ` [${flag.kind}]` : "";
  return {
    content: [
      {
        type: "text" as const,
        text: `Flagged${kindLabel}: ${flag.text}
id: ${flag.id}
expires: ${new Date(flag.expires_at).toISOString()}`,
      },
    ],
  };
}

// --- list_flags implementation ---

interface ListFlagsArgs {
  auth: AuthContext;
}

async function listFlagsTool({ auth }: ListFlagsArgs) {
  const subject = authSubject(auth);
  if (!subject) {
    return toolError(
      `Unauthorized: list_flags requires the '${SCOPE_CONTEXT_WRITE}' scope, or the admin bearer.`
    );
  }

  const flags = await listFlagsForSubject(subject);
  if (flags.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: "No active flags. Anything you flagged more than 24 hours ago has expired.",
        },
      ],
    };
  }

  const lines = flags.map((f) => {
    const ts = new Date(f.created_at).toISOString();
    const kind = f.kind ? ` [${f.kind}]` : "";
    const agent = f.agent ? ` (${f.agent})` : "";
    return `- ${ts}${kind}${agent} — ${f.text}\n  id: ${f.id}`;
  });

  return {
    content: [
      {
        type: "text" as const,
        text: `# Active flags (${flags.length})\n\n${lines.join("\n")}\n\nPass these ids in append_to_journal's flag_ids field after weaving the content into the entry.`,
      },
    ],
  };
}

// --- append_to_journal implementation ---

interface AppendJournalArgs {
  auth: AuthContext;
  summary: string;
  decisions: string[];
  patterns: string[];
  followups: string[];
  tags: string[];
  agent?: string;
  flag_ids: string[];
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function currentMonthSlug(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}`;
}

function isoSeconds(now: Date = new Date()): string {
  // 2026-05-11T18:19:00Z — ISO 8601, seconds resolution, UTC, no fractional seconds.
  return now.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function isoCompact(now: Date = new Date()): string {
  // 2026-05-11T181900Z — filename-safe form of the same instant. Date dashes
  // kept for readability; colons stripped from the time portion.
  const y = now.getUTCFullYear();
  const mo = pad2(now.getUTCMonth() + 1);
  const d = pad2(now.getUTCDate());
  const h = pad2(now.getUTCHours());
  const mi = pad2(now.getUTCMinutes());
  const s = pad2(now.getUTCSeconds());
  return `${y}-${mo}-${d}T${h}${mi}${s}Z`;
}

function slugAgent(agent: string | undefined | null): string {
  const cleaned = (agent ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "unknown";
}

function entryFilePath(now: Date, agent: string): string {
  // journal/YYYY/MM/YYYY-MM-DDTHHMMSSZ-{agent-slug}.md
  return `journal/${now.getUTCFullYear()}/${pad2(now.getUTCMonth() + 1)}/${isoCompact(now)}-${slugAgent(agent)}.md`;
}

function yamlString(s: string): string {
  // YAML flow scalar compatible with JSON strings for our content (ASCII tags
  // and agent names). Newlines defensively flattened.
  return JSON.stringify(s.replace(/\n/g, " ").trim());
}

function yamlTagsArray(tags: string[]): string {
  if (tags.length === 0) return "[]";
  return `[${tags.map(yamlString).join(", ")}]`;
}

function formatJournalEntryFile(
  args: Omit<AppendJournalArgs, "auth">,
  now: Date = new Date()
): string {
  const ts = isoSeconds(now);
  const agent = (args.agent && args.agent.trim()) || "unknown";

  const lines: string[] = [];
  lines.push("---");
  lines.push(`timestamp: ${ts}`);
  lines.push(`agent: ${yamlString(agent)}`);
  lines.push(`tags: ${yamlTagsArray(args.tags)}`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${ts} — ${agent}`);
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

  return lines.join("\n");
}

async function appendToJournal(args: AppendJournalArgs) {
  if (!args.auth.isAdmin && !args.auth.scopes.includes(SCOPE_CONTEXT_WRITE)) {
    return toolError(
      `Unauthorized: append_to_journal requires the '${SCOPE_CONTEXT_WRITE}' scope, or the admin bearer.`
    );
  }

  const repo = process.env.JOURNAL_REPO;
  const githubToken = process.env.GITHUB_TOKEN;
  const branch = process.env.JOURNAL_BRANCH || process.env.GITHUB_BRANCH || "main";

  if (!repo || !githubToken) {
    return toolError(
      "Journal storage is not configured: set JOURNAL_REPO (owner/repo) and GITHUB_TOKEN. The journal lives in a private repo, separate from the public ad-nav site."
    );
  }

  const now = new Date();
  const agent = (args.agent && args.agent.trim()) || "unknown";
  const filePath = entryFilePath(now, agent);
  const apiBase = `https://api.github.com/repos/${repo}/contents/${filePath}`;

  const fileContent = formatJournalEntryFile(args, now);

  const ghHeaders: Record<string, string> = {
    Authorization: `Bearer ${githubToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ad-nav-mcp",
  };

  const putBody = {
    message: `Journal entry ${isoSeconds(now)} via MCP`,
    content: Buffer.from(fileContent, "utf-8").toString("base64"),
    branch,
  };

  const putRes = await fetch(apiBase, {
    method: "PUT",
    headers: { ...ghHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(putBody),
  });

  if (!putRes.ok) {
    return toolError(`GitHub PUT failed (${putRes.status}): ${await putRes.text()}`);
  }

  const putJson = (await putRes.json()) as { commit: { sha: string; html_url: string } };

  // Best-effort embed the new entry and upsert it into the journal embedding
  // index. Done after the GitHub PUT so the entry is already durable. A
  // failed embed or Firestore write is logged but does NOT fail the tool
  // call: the backfill script can fill the gap later, and missing entries
  // just don't surface in semantic_search_journal results.
  let embeddingSummary = "";
  if (process.env.OPENAI_API_KEY) {
    try {
      const body = stripFrontmatter(fileContent);
      const vec = await embedQuery(body);
      if (vec) {
        await upsertJournalEmbedding({
          path: filePath,
          timestamp: isoSeconds(now),
          agent,
          preview: previewOf(body),
          embedding: vec,
        });
        embeddingSummary = "\nEmbedding indexed.";
      } else {
        embeddingSummary = "\nEmbedding skipped: OpenAI returned no vector.";
      }
    } catch (err) {
      console.error("[mcp] journal embedding failed:", err);
      embeddingSummary = "\nEmbedding skipped: index write failed (entry is still durable; backfill script can recover).";
    }
  }

  // Consume any flags the caller said they wove into this entry. Done AFTER
  // the GitHub write so a failed entry leaves the flags intact for retry.
  // A failed consume is logged but does NOT fail the tool call: the journal
  // entry is already durable, and stale flags are non-destructive (they
  // expire in 24h regardless and would just reappear in the next list_flags).
  let consumedSummary = "";
  if (args.flag_ids.length > 0) {
    const subject = authSubject(args.auth);
    if (subject) {
      try {
        const consumed = await consumeFlags({ subject, ids: args.flag_ids });
        const requested = args.flag_ids.length;
        const skipped = requested - consumed.length;
        consumedSummary = skipped > 0
          ? `\nFlags consumed: ${consumed.length}/${requested} (${skipped} skipped — wrong subject or expired).`
          : `\nFlags consumed: ${consumed.length}.`;
      } catch (err) {
        console.error("[mcp] flag consume failed after journal write:", err);
        consumedSummary = `\nFlags requested: ${args.flag_ids.length}. Consume failed (entry is still durable); flags will expire naturally.`;
      }
    }
  }

  return {
    content: [
      {
        type: "text" as const,
        text: `Logged session to ${filePath} on ${branch}.
Commit: ${putJson.commit.sha}
${putJson.commit.html_url}${embeddingSummary}${consumedSummary}`,
      },
    ],
  };
}

// --- get_journal_entries implementation ---

interface GetJournalArgs {
  auth: AuthContext;
  month?: string;
}

interface GitHubContentItem {
  name: string;
  path: string;
  type: "file" | "dir" | "symlink" | "submodule";
  sha: string;
  size: number;
}

async function getJournalEntries({ auth, month }: GetJournalArgs) {
  if (!auth.isAdmin && !auth.scopes.includes(SCOPE_CONTEXT_WRITE)) {
    return toolError(
      `Unauthorized: get_journal_entries requires the '${SCOPE_CONTEXT_WRITE}' scope, or the admin bearer.`
    );
  }

  const repo = process.env.JOURNAL_REPO;
  const githubToken = process.env.GITHUB_TOKEN;
  const branch = process.env.JOURNAL_BRANCH || process.env.GITHUB_BRANCH || "main";

  if (!repo || !githubToken) {
    return toolError(
      "Journal storage is not configured: set JOURNAL_REPO (owner/repo) and GITHUB_TOKEN."
    );
  }

  const monthSlug = month ?? currentMonthSlug(new Date());
  const monthMatch = monthSlug.match(/^(\d{4})-(\d{2})$/);
  if (!monthMatch) {
    return toolError(`Invalid month '${monthSlug}'. Expected YYYY-MM.`);
  }
  const [, year, mm] = monthMatch;
  const dirPath = `journal/${year}/${mm}`;
  const apiDir = `https://api.github.com/repos/${repo}/contents/${dirPath}`;

  const ghHeaders: Record<string, string> = {
    Authorization: `Bearer ${githubToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ad-nav-mcp",
  };

  const listRes = await fetch(`${apiDir}?ref=${encodeURIComponent(branch)}`, {
    headers: ghHeaders,
  });

  if (listRes.status === 404) {
    return {
      content: [
        {
          type: "text" as const,
          text: `No journal entries for ${monthSlug}. Directory ${dirPath} does not exist on ${branch}.`,
        },
      ],
    };
  }
  if (!listRes.ok) {
    return toolError(`GitHub list failed (${listRes.status}): ${await listRes.text()}`);
  }

  const listJson = (await listRes.json()) as GitHubContentItem[];
  const entryFiles = listJson
    .filter((item) => item.type === "file" && item.name.endsWith(".md"))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (entryFiles.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: `No journal entries for ${monthSlug}. Directory ${dirPath} is empty.`,
        },
      ],
    };
  }

  const fetched = await Promise.all(
    entryFiles.map(async (item) => {
      const res = await fetch(
        `https://api.github.com/repos/${repo}/contents/${item.path}?ref=${encodeURIComponent(branch)}`,
        { headers: ghHeaders }
      );
      if (!res.ok) {
        return { name: item.name, content: `<!-- failed to fetch ${item.path}: ${res.status} -->` };
      }
      const fileJson = (await res.json()) as { content: string; encoding: string };
      if (fileJson.encoding !== "base64") {
        return {
          name: item.name,
          content: `<!-- unexpected encoding for ${item.path}: ${fileJson.encoding} -->`,
        };
      }
      return {
        name: item.name,
        content: Buffer.from(fileJson.content, "base64").toString("utf-8"),
      };
    })
  );

  const combined = fetched.map((f) => f.content.trim()).join("\n\n---\n\n");

  return {
    content: [
      {
        type: "text" as const,
        text: combined,
      },
    ],
  };
}

// --- semantic_search_journal implementation ---

interface SemanticSearchJournalArgs {
  auth: AuthContext;
  query: string;
  topK: number;
}

async function semanticSearchJournal({ auth, query, topK }: SemanticSearchJournalArgs) {
  if (!auth.isAdmin && !auth.scopes.includes(SCOPE_CONTEXT_WRITE)) {
    return toolError(
      `Unauthorized: semantic_search_journal requires the '${SCOPE_CONTEXT_WRITE}' scope, or the admin bearer.`
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return toolError(
      "semantic_search_journal needs OPENAI_API_KEY set on the server. The query has to be embedded at request time; this tool has no keyword fallback. (search_context degrades to keyword-only when the key is missing.)"
    );
  }

  const repo = process.env.JOURNAL_REPO;
  const githubToken = process.env.GITHUB_TOKEN;
  const branch = process.env.JOURNAL_BRANCH || process.env.GITHUB_BRANCH || "main";
  if (!repo || !githubToken) {
    return toolError(
      "Journal storage is not configured: set JOURNAL_REPO (owner/repo) and GITHUB_TOKEN."
    );
  }

  const queryVec = await embedQuery(query);
  if (!queryVec) {
    return toolError("Failed to embed query (OpenAI returned no result). Check OPENAI_API_KEY validity.");
  }

  const indexed = await listJournalEmbeddings();
  if (indexed.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: "No journal embeddings indexed yet. Run scripts/backfill-journal-embeddings.mjs to embed existing entries, or call append_to_journal at least once to seed the index.",
        },
      ],
    };
  }

  const scored = indexed
    .map((item) => ({
      item,
      score: cosineSimilarity(queryVec, new Float32Array(item.embedding)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  const ghHeaders: Record<string, string> = {
    Authorization: `Bearer ${githubToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ad-nav-mcp",
  };

  const fetched = await Promise.all(
    scored.map(async ({ item, score }) => {
      const res = await fetch(
        `https://api.github.com/repos/${repo}/contents/${item.path}?ref=${encodeURIComponent(branch)}`,
        { headers: ghHeaders }
      );
      if (!res.ok) {
        return { item, score, content: `<!-- failed to fetch ${item.path}: ${res.status} -->` };
      }
      const fileJson = (await res.json()) as { content: string; encoding: string };
      if (fileJson.encoding !== "base64") {
        return {
          item,
          score,
          content: `<!-- unexpected encoding for ${item.path}: ${fileJson.encoding} -->`,
        };
      }
      return {
        item,
        score,
        content: Buffer.from(fileJson.content, "base64").toString("utf-8"),
      };
    })
  );

  const sections = fetched.map((f, idx) => {
    const scoreStr = f.score.toFixed(3);
    return `### ${idx + 1}. \`${f.item.path}\` (score ${scoreStr})\n\n${f.content.trim()}`;
  });

  return {
    content: [
      {
        type: "text" as const,
        text: `# Semantic journal search: "${query}"\n\n${sections.length} result${sections.length === 1 ? "" : "s"} from ${indexed.length} indexed entr${indexed.length === 1 ? "y" : "ies"}.\n\n${sections.join("\n\n---\n\n")}`,
      },
    ],
  };
}

// --- drop_to_archive implementation ---

interface DropToArchiveArgs {
  auth: AuthContext;
  text: string;
  kind: ArchiveKind;
  source?: string;
  agent?: string;
}

/**
 * Build the archive file path. Uses millisecond resolution rather than the
 * journal's seconds resolution, because archive drops can come in quick
 * bursts (e.g. several `drop_to_archive` calls during one daily-interview
 * session). Milliseconds avoid filename collisions without needing a counter
 * or random suffix.
 */
function archiveFilePath(now: Date, kind: ArchiveKind): string {
  const y = now.getUTCFullYear();
  const mo = pad2(now.getUTCMonth() + 1);
  const d = pad2(now.getUTCDate());
  const h = pad2(now.getUTCHours());
  const mi = pad2(now.getUTCMinutes());
  const s = pad2(now.getUTCSeconds());
  const ms = String(now.getUTCMilliseconds()).padStart(3, "0");
  return `archive/${y}/${mo}/${y}-${mo}-${d}T${h}${mi}${s}${ms}Z-${kind}.md`;
}

function isoMillis(now: Date): string {
  // 2026-05-14T21:36:00.123Z — ISO with milliseconds, UTC.
  return now.toISOString();
}

function formatArchiveFile(args: {
  timestamp: string;
  kind: ArchiveKind;
  source?: string;
  agent: string;
  text: string;
}): string {
  const lines: string[] = [];
  lines.push("---");
  lines.push(`timestamp: ${args.timestamp}`);
  lines.push(`kind: ${args.kind}`);
  if (args.source) lines.push(`source: ${yamlString(args.source)}`);
  lines.push(`agent: ${yamlString(args.agent)}`);
  lines.push("---");
  lines.push("");
  lines.push(args.text.trim());
  lines.push("");
  return lines.join("\n");
}

async function dropToArchive(args: DropToArchiveArgs) {
  if (!args.auth.isAdmin && !args.auth.scopes.includes(SCOPE_CONTEXT_WRITE)) {
    return toolError(
      `Unauthorized: drop_to_archive requires the '${SCOPE_CONTEXT_WRITE}' scope, or the admin bearer.`
    );
  }

  const repo = process.env.JOURNAL_REPO;
  const githubToken = process.env.GITHUB_TOKEN;
  const branch = process.env.JOURNAL_BRANCH || process.env.GITHUB_BRANCH || "main";
  if (!repo || !githubToken) {
    return toolError(
      "Archive storage is not configured: set JOURNAL_REPO (owner/repo of the private corpus) and GITHUB_TOKEN."
    );
  }

  const now = new Date();
  const agent = (args.agent && args.agent.trim()) || "unknown";
  const filePath = archiveFilePath(now, args.kind);
  const apiBase = `https://api.github.com/repos/${repo}/contents/${filePath}`;

  const fileContent = formatArchiveFile({
    timestamp: isoMillis(now),
    kind: args.kind,
    source: args.source?.trim() || undefined,
    agent,
    text: args.text,
  });

  const ghHeaders: Record<string, string> = {
    Authorization: `Bearer ${githubToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ad-nav-mcp",
  };

  const putRes = await fetch(apiBase, {
    method: "PUT",
    headers: { ...ghHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `Archive drop ${isoMillis(now)} (${args.kind}) via MCP`,
      content: Buffer.from(fileContent, "utf-8").toString("base64"),
      branch,
    }),
  });

  if (!putRes.ok) {
    return toolError(`GitHub PUT failed (${putRes.status}): ${await putRes.text()}`);
  }

  const putJson = (await putRes.json()) as { commit: { sha: string; html_url: string } };

  // Best-effort embed + upsert. Same pattern as append_to_journal: a failed
  // embed is logged but does NOT fail the tool call — the drop is already
  // durable in adam-corpus, and the backfill script can recover the index.
  let embeddingNote = "";
  if (process.env.OPENAI_API_KEY) {
    try {
      const vec = await embedQuery(args.text);
      if (vec) {
        await upsertArchiveEmbedding({
          path: filePath,
          timestamp: isoMillis(now),
          kind: args.kind,
          source: args.source?.trim() || undefined,
          agent,
          preview: previewOf(args.text),
          embedding: vec,
        });
        embeddingNote = "\nEmbedding indexed.";
      } else {
        embeddingNote = "\nEmbedding skipped: OpenAI returned no vector.";
      }
    } catch (err) {
      console.error("[mcp] archive embedding failed:", err);
      embeddingNote = "\nEmbedding skipped: index write failed (drop is still durable; backfill can recover).";
    }
  }

  return {
    content: [
      {
        type: "text" as const,
        text: `Archived to ${filePath} on ${branch}.
Commit: ${putJson.commit.sha}
${putJson.commit.html_url}${embeddingNote}`,
      },
    ],
  };
}

// --- semantic_search_archive implementation ---

interface SemanticSearchArchiveArgs {
  auth: AuthContext;
  query: string;
  topK: number;
}

async function semanticSearchArchive({ auth, query, topK }: SemanticSearchArchiveArgs) {
  if (!auth.isAdmin && !auth.scopes.includes(SCOPE_CONTEXT_WRITE)) {
    return toolError(
      `Unauthorized: semantic_search_archive requires the '${SCOPE_CONTEXT_WRITE}' scope, or the admin bearer.`
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return toolError(
      "semantic_search_archive needs OPENAI_API_KEY set on the server. No keyword fallback."
    );
  }

  const repo = process.env.JOURNAL_REPO;
  const githubToken = process.env.GITHUB_TOKEN;
  const branch = process.env.JOURNAL_BRANCH || process.env.GITHUB_BRANCH || "main";
  if (!repo || !githubToken) {
    return toolError(
      "Archive storage is not configured: set JOURNAL_REPO (owner/repo) and GITHUB_TOKEN."
    );
  }

  const queryVec = await embedQuery(query);
  if (!queryVec) {
    return toolError("Failed to embed query (OpenAI returned no result).");
  }

  const indexed = await listArchiveEmbeddings();
  if (indexed.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: "No archive drops indexed yet. Use drop_to_archive (directly or via the daily-interview prompt) to start populating the archive.",
        },
      ],
    };
  }

  const scored = indexed
    .map((item) => ({
      item,
      score: cosineSimilarity(queryVec, new Float32Array(item.embedding)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  const ghHeaders: Record<string, string> = {
    Authorization: `Bearer ${githubToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ad-nav-mcp",
  };

  const fetched = await Promise.all(
    scored.map(async ({ item, score }) => {
      const res = await fetch(
        `https://api.github.com/repos/${repo}/contents/${item.path}?ref=${encodeURIComponent(branch)}`,
        { headers: ghHeaders }
      );
      if (!res.ok) {
        return { item, score, content: `<!-- failed to fetch ${item.path}: ${res.status} -->` };
      }
      const fileJson = (await res.json()) as { content: string; encoding: string };
      if (fileJson.encoding !== "base64") {
        return {
          item,
          score,
          content: `<!-- unexpected encoding for ${item.path}: ${fileJson.encoding} -->`,
        };
      }
      return {
        item,
        score,
        content: Buffer.from(fileJson.content, "base64").toString("utf-8"),
      };
    })
  );

  const sections = fetched.map((f, idx) => {
    const scoreStr = f.score.toFixed(3);
    const sourceTag = f.item.source ? ` source: \`${f.item.source}\`` : "";
    return `### ${idx + 1}. \`${f.item.path}\` (score ${scoreStr}, kind: ${f.item.kind}${sourceTag})\n\n${f.content.trim()}`;
  });

  return {
    content: [
      {
        type: "text" as const,
        text: `# Semantic archive search: "${query}"\n\n${sections.length} result${sections.length === 1 ? "" : "s"} from ${indexed.length} indexed drop${indexed.length === 1 ? "" : "s"}.\n\n${sections.join("\n\n---\n\n")}`,
      },
    ],
  };
}

// --- curator_review implementation ---

interface CuratorReviewArgs {
  auth: AuthContext;
  file: string;
  topK: number;
}

interface CuratorCandidate {
  tier: "journal" | "archive";
  path: string;
  preview: string;
  bestScore: number;
  bestCanonicalIndex: number;
  timestamp: string;
  attribution: string;
}

async function curatorReview({ auth, file, topK }: CuratorReviewArgs) {
  if (!auth.isAdmin && !auth.scopes.includes(SCOPE_CONTEXT_WRITE)) {
    return toolError(
      `Unauthorized: curator_review requires the '${SCOPE_CONTEXT_WRITE}' scope, or the admin bearer.`
    );
  }

  // Confirm the canonical file exists.
  const canonicalFile = getContextFile(file);
  if (!canonicalFile) {
    return toolError(
      `Canonical file '${file}' not found. Use list_context_files to see available files.`
    );
  }

  // Reuse the precomputed paragraph embeddings for this file. No new OpenAI
  // call needed — the canonical index already covers every paragraph.
  const allCanonical = getCanonicalEmbeddings();
  if (!allCanonical) {
    return toolError(
      "Canonical embedding index is missing. Run scripts/build-canonical-embeddings.mjs."
    );
  }
  const canonicalParas = allCanonical.filter((p) => p.file === file);
  if (canonicalParas.length === 0) {
    return toolError(
      `No embeddings indexed for canonical file '${file}'. The index file may be stale; re-run scripts/build-canonical-embeddings.mjs.`
    );
  }

  // Pull every journal and archive embedding. Both lists are small (~10s of
  // items) at this stage, so paying the full listAll is cheap.
  const [journalItems, archiveItems] = await Promise.all([
    listJournalEmbeddings(),
    listArchiveEmbeddings(),
  ]);

  const candidates: CuratorCandidate[] = [];

  // For each journal entry, find which canonical paragraph it matches best.
  // The score is the max cosine across canonical paragraphs; the matched
  // paragraph index is reported so the agent can see WHICH part of canonical
  // the candidate is relevant to.
  for (const item of journalItems) {
    const itemVec = new Float32Array(item.embedding);
    let bestScore = -Infinity;
    let bestIndex = 0;
    for (const para of canonicalParas) {
      const score = cosineSimilarity(itemVec, para.embedding);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = para.paragraph_index;
      }
    }
    candidates.push({
      tier: "journal",
      path: item.path,
      preview: item.preview,
      bestScore,
      bestCanonicalIndex: bestIndex,
      timestamp: item.timestamp,
      attribution: `agent: ${item.agent}`,
    });
  }

  for (const item of archiveItems) {
    const itemVec = new Float32Array(item.embedding);
    let bestScore = -Infinity;
    let bestIndex = 0;
    for (const para of canonicalParas) {
      const score = cosineSimilarity(itemVec, para.embedding);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = para.paragraph_index;
      }
    }
    candidates.push({
      tier: "archive",
      path: item.path,
      preview: item.preview,
      bestScore,
      bestCanonicalIndex: bestIndex,
      timestamp: item.timestamp,
      attribution: item.source
        ? `kind: ${item.kind}, source: ${item.source}`
        : `kind: ${item.kind}`,
    });
  }

  candidates.sort((a, b) => b.bestScore - a.bestScore);
  const top = candidates.slice(0, topK);

  if (top.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: `# Curator review: \`${file}\` (${canonicalFile.title})\n\nNo journal entries or archive drops are indexed yet. There's nothing to compare against. Re-run after the corpus has accumulated some material.`,
        },
      ],
    };
  }

  const sections = top.map((c, idx) => {
    const scoreStr = c.bestScore.toFixed(3);
    return [
      `### ${idx + 1}. \`${c.path}\` (${c.tier})`,
      `score: ${scoreStr}, best-matched canonical paragraph: #${c.bestCanonicalIndex}, ${c.attribution}, timestamp: ${c.timestamp}`,
      "",
      `> ${c.preview}`,
    ].join("\n");
  });

  const summary = `${top.length} candidate${top.length === 1 ? "" : "s"} ranked from ${journalItems.length} journal entr${journalItems.length === 1 ? "y" : "ies"} and ${archiveItems.length} archive drop${archiveItems.length === 1 ? "" : "s"}. Each score is the best cosine similarity between the candidate and any paragraph in \`${file}\`.`;

  const footer = `**This tool does not modify canonical content.** Treat the list as input to a human (or agent-on-Adam's-behalf) deciding whether \`${file}\` is due for a refresh. Use \`get_journal_entries\` or \`semantic_search_archive\` to fetch the full content of any candidate before drafting changes.`;

  return {
    content: [
      {
        type: "text" as const,
        text: `# Curator review: \`${file}\` (${canonicalFile.title})\n\n${summary}\n\n${sections.join("\n\n---\n\n")}\n\n---\n\n${footer}`,
      },
    ],
  };
}

// --- search_all implementation ---

interface SearchAllArgs {
  auth: AuthContext;
  query: string;
  topK: number;
}

/**
 * Fetch a list of journal/archive entries from GitHub Contents API in parallel.
 * Each result carries the original metadata plus the entry's markdown content;
 * a failed fetch becomes an inline HTML comment so the rest of the response
 * still renders. Shared with semantic_search_journal, semantic_search_archive,
 * and search_all (the cross-tier reader).
 */
async function fetchEntriesFromGitHub<T extends { path: string }>(
  items: T[],
  repo: string,
  branch: string,
  githubToken: string
): Promise<Array<{ item: T; content: string }>> {
  const ghHeaders: Record<string, string> = {
    Authorization: `Bearer ${githubToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ad-nav-mcp",
  };
  return Promise.all(
    items.map(async (item) => {
      const res = await fetch(
        `https://api.github.com/repos/${repo}/contents/${item.path}?ref=${encodeURIComponent(branch)}`,
        { headers: ghHeaders }
      );
      if (!res.ok) {
        return { item, content: `<!-- failed to fetch ${item.path}: ${res.status} -->` };
      }
      const fileJson = (await res.json()) as { content: string; encoding: string };
      if (fileJson.encoding !== "base64") {
        return {
          item,
          content: `<!-- unexpected encoding for ${item.path}: ${fileJson.encoding} -->`,
        };
      }
      return { item, content: Buffer.from(fileJson.content, "base64").toString("utf-8") };
    })
  );
}

async function searchAll({ auth, query, topK }: SearchAllArgs) {
  if (!auth.isAdmin && !auth.scopes.includes(SCOPE_CONTEXT_WRITE)) {
    return toolError(
      `Unauthorized: search_all requires the '${SCOPE_CONTEXT_WRITE}' scope, or the admin bearer.`
    );
  }
  if (!process.env.OPENAI_API_KEY) {
    return toolError(
      "search_all needs OPENAI_API_KEY (no keyword fallback at the cross-tier level). Use search_context for keyword-only access to the public tier."
    );
  }

  const repo = process.env.JOURNAL_REPO;
  const githubToken = process.env.GITHUB_TOKEN;
  const branch = process.env.JOURNAL_BRANCH || process.env.GITHUB_BRANCH || "main";
  if (!repo || !githubToken) {
    return toolError(
      "Storage is not configured: set JOURNAL_REPO (owner/repo) and GITHUB_TOKEN."
    );
  }

  const queryVec = await embedQuery(query);
  if (!queryVec) {
    return toolError("Failed to embed query (OpenAI returned no result).");
  }

  // Rank each tier independently. Canonical reads from the precomputed index;
  // journal and archive read from Firestore. Run journal + archive in parallel.
  const canonical = getCanonicalEmbeddings();
  const [journalItems, archiveItems] = await Promise.all([
    listJournalEmbeddings(),
    listArchiveEmbeddings(),
  ]);

  const canonicalRanked = canonical
    ? canonical
        .map((p) => ({ item: p, score: cosineSimilarity(queryVec, p.embedding) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
    : [];

  const journalRanked = journalItems
    .map((j) => ({ item: j, score: cosineSimilarity(queryVec, new Float32Array(j.embedding)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  const archiveRanked = archiveItems
    .map((a) => ({ item: a, score: cosineSimilarity(queryVec, new Float32Array(a.embedding)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  // Journal + archive top results need their full markdown fetched from
  // adam-corpus. Canonical paragraphs are already in memory.
  const [journalFetched, archiveFetched] = await Promise.all([
    fetchEntriesFromGitHub(
      journalRanked.map(({ item }) => item),
      repo,
      branch,
      githubToken
    ),
    fetchEntriesFromGitHub(
      archiveRanked.map(({ item }) => item),
      repo,
      branch,
      githubToken
    ),
  ]);

  const canonicalSection =
    canonicalRanked.length === 0
      ? canonical
        ? "_No canonical paragraphs scored against this query._"
        : "_Canonical embedding index not loaded — run scripts/build-canonical-embeddings.mjs._"
      : canonicalRanked
          .map(
            ({ item, score }, idx) =>
              `### ${idx + 1}. ${item.title} (\`${item.file}\`, paragraph #${item.paragraph_index}, score ${score.toFixed(3)})\n\n${item.text}`
          )
          .join("\n\n---\n\n");

  const journalSection =
    journalRanked.length === 0
      ? journalItems.length === 0
        ? "_No journal embeddings indexed yet._"
        : "_No journal entries matched._"
      : journalRanked
          .map(({ item, score }, idx) => {
            const content =
              journalFetched.find((f) => f.item.path === item.path)?.content ?? "(unavailable)";
            return `### ${idx + 1}. \`${item.path}\` (score ${score.toFixed(3)}, agent: ${item.agent})\n\n${content.trim()}`;
          })
          .join("\n\n---\n\n");

  const archiveSection =
    archiveRanked.length === 0
      ? archiveItems.length === 0
        ? "_No archive drops indexed yet — use drop_to_archive or the daily-interview prompt to populate._"
        : "_No archive drops matched._"
      : archiveRanked
          .map(({ item, score }, idx) => {
            const content =
              archiveFetched.find((f) => f.item.path === item.path)?.content ?? "(unavailable)";
            const sourceTag = item.source ? `, source: \`${item.source}\`` : "";
            return `### ${idx + 1}. \`${item.path}\` (score ${score.toFixed(3)}, kind: ${item.kind}${sourceTag})\n\n${content.trim()}`;
          })
          .join("\n\n---\n\n");

  const corpusSummary = `Index sizes: ${canonical?.length ?? 0} canonical paragraph${(canonical?.length ?? 0) === 1 ? "" : "s"}, ${journalItems.length} journal entr${journalItems.length === 1 ? "y" : "ies"}, ${archiveItems.length} archive drop${archiveItems.length === 1 ? "" : "s"}.`;

  return {
    content: [
      {
        type: "text" as const,
        text: `# Search across all tiers: "${query}"\n\n${corpusSummary} Top ${topK} per tier, ranked independently within each.\n\n## Canonical context\n\n${canonicalSection}\n\n## Journal\n\n${journalSection}\n\n## Archive\n\n${archiveSection}`,
      },
    ],
  };
}

// --- search_context implementation ---

interface SearchContextArgs {
  query: string;
  topK: number;
}

interface ParagraphRecord {
  id: string;
  file: string;
  title: string;
  index: number;
  text: string;
}

/**
 * Flatten the canonical corpus into paragraphs and ID each one as
 * `${filename}#${index}`. The same id space is used for keyword and vector
 * ranking so the two lists can be combined via reciprocal rank fusion.
 */
function buildParagraphRecords(): ParagraphRecord[] {
  const records: ParagraphRecord[] = [];
  for (const file of getContextFiles()) {
    const paras = file.content
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    paras.forEach((text, idx) => {
      records.push({
        id: `${file.filename}#${idx}`,
        file: file.filename,
        title: file.title,
        index: idx,
        text,
      });
    });
  }
  return records;
}

function keywordRank(records: ParagraphRecord[], query: string): string[] {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  if (tokens.length === 0) return [];

  const scored = records
    .map((r) => {
      const lower = r.text.toLowerCase();
      let score = 0;
      for (const tok of tokens) if (lower.includes(tok)) score++;
      return { id: r.id, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.map((s) => s.id);
}

async function searchContext({ query, topK }: SearchContextArgs) {
  const records = buildParagraphRecords();
  if (records.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: "No context files loaded. Check that content/context/ exists.",
        },
      ],
    };
  }

  // Keyword half: always available, no I/O.
  const keywordRanked = keywordRank(records, query);

  // Vector half: only fires when the canonical index is loaded AND the server
  // has an OpenAI key. Either failure silently downgrades to keyword-only.
  const embeddings = getCanonicalEmbeddings();
  let vectorRanked: string[] = [];
  let vectorMode: "ready" | "no-index" | "no-key" | "embed-failed" = "no-index";

  if (embeddings) {
    const queryVec = await embedQuery(query);
    if (queryVec) {
      const scored = embeddings.map((e) => ({
        id: `${e.file}#${e.paragraph_index}`,
        score: cosineSimilarity(queryVec, e.embedding),
      }));
      scored.sort((a, b) => b.score - a.score);
      vectorRanked = scored.map((s) => s.id);
      vectorMode = "ready";
    } else {
      vectorMode = process.env.OPENAI_API_KEY ? "embed-failed" : "no-key";
    }
  }

  // Reciprocal rank fusion. Empty lists are filtered out so the surviving
  // list dictates the ranking on its own.
  const fused = reciprocalRankFusion(
    [keywordRanked, vectorRanked].filter((l) => l.length > 0),
    { topN: topK }
  );

  if (fused.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: `No results found for "${query}".`,
        },
      ],
    };
  }

  const byId = new Map(records.map((r) => [r.id, r]));
  const mode = vectorMode === "ready" ? "hybrid (keyword + vector)" : `keyword only (${vectorMode})`;

  const sections = fused
    .map((id, rank) => {
      const r = byId.get(id);
      if (!r) return "";
      return `### ${rank + 1}. ${r.title} (\`${r.file}\`)\n\n${r.text}`;
    })
    .filter((s) => s.length > 0);

  return {
    content: [
      {
        type: "text" as const,
        text: `# Search: "${query}"\n\nMode: ${mode}. ${sections.length} result${sections.length === 1 ? "" : "s"}.\n\n${sections.join("\n\n---\n\n")}`,
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
