# Ad-Nav System Spec

Living specification for adamstacey.co.uk. Update this before implementing changes.

## Purpose

Dual-purpose personal site: human-readable portfolio and blog for visitors, machine-readable context portfolio for AI agents. Built agent-first with Claude Code. Hosted on GCP Cloud Run.

## Current State

### Pages

| Route | Type | Description |
|-------|------|-------------|
| `/` | Static | Hero with typing effect, highlights, CTA |
| `/about` | Static | Professional bio with stats, competencies, timeline, and "what I bring" cards |
| `/cv` | Static | LinkedIn-style CV with career progression bar, achievement stats, company-grouped roles, skills grid |
| `/blog` | Static | Blog listing, sorted by date descending |
| `/blog/[slug]` | SSG | Individual blog post, generated from markdown |
| `/projects` | Static | Project showcase with categorised sections, status badges, impact highlights |
| `/contact` | Static | Contact information with signal-ping animations |
| `/context` | Static | Context portfolio overview with REST API and MCP server setup instructions |

### API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/blog` | GET | All blog posts (metadata + content as JSON) |
| `/api/blog/[slug]` | GET | Single blog post by slug |
| `/api/context` | GET | All context files. Supports `?files=identity,domain-knowledge` filter |
| `/api/context/[file]` | GET | Single context file as raw markdown (`Content-Type: text/markdown`) |
| `/api/mcp` | GET/POST/DELETE | Remote MCP endpoint (Streamable HTTP transport). Same tools and resources as the stdio server |
| `/api/oauth/signin` | GET | Kick off GitHub OAuth flow for identity. Accepts optional `return_to` |
| `/api/oauth/callback/github` | GET | GitHub OAuth callback: verifies state, checks allowlist, creates session |
| `/api/oauth/me` | GET | Current session info, or 401 if not signed in |
| `/api/oauth/signout` | GET/POST | Destroy session |
| `/api/oauth/register` | POST | Dynamic client registration (RFC 7591) |
| `/api/oauth/authorize` | GET/POST | Authorization endpoint with inline consent page |
| `/api/oauth/token` | POST | Token endpoint (authorization_code + refresh_token grants, PKCE required) |
| `/.well-known/oauth-authorization-server` | GET | OAuth 2.0 authorization server metadata (RFC 8414), via rewrite |
| `/.well-known/oauth-protected-resource` | GET | OAuth 2.0 protected resource metadata (RFC 9728), via rewrite |
| `/.well-known/ai-context.json` | GET | Agent discovery file pointing to API routes |
| `/sitemap.xml` | GET | Auto-generated sitemap (static pages + blog posts) |
| `/robots.txt` | GET | Crawler directives (allow all, disallow `/api/`) |
| `/feed.xml` | GET | RSS 2.0 feed of all blog posts |
| `/opengraph-image` | GET | Dynamic OG image (root, generated via `ImageResponse`) |
| `/blog/[slug]/opengraph-image` | GET | Dynamic per-post OG image with post title |

### Content System

- **Blog posts:** `content/blog/*.md` with YAML frontmatter (`title`, `date`, `excerpt`, `tags`, `image`)
- **Context files (canonical):** `content/context/*.md` with YAML frontmatter (`title`, `description`). Human-edited. Never written directly by agents.
- **Journal (working memory):** per-entry markdown files at `journal/YYYY/MM/YYYY-MM-DDTHHMMSSZ-{agent-slug}.md` in the private [`adam-corpus`](https://github.com/digital-illumination/adam-corpus) repo. One file per session entry, written by the `append_to_journal` MCP tool. Each file is self-contained: YAML frontmatter with `timestamp`, `agent`, and `tags`, followed by a structured body (summary, decisions, patterns, follow-ups). Private (used to live in `ad-nav/content/journal/` but was moved out of the public repo because the level of detail agents wrote made it inappropriate for public storage). Read back via `get_journal_entries`, which lists a month's directory and returns the assembled markdown. Not part of any canonical profile. Source material for future curation passes that promote durable signal to canonical via human-reviewed PR. Previously stored as one monolithic file per month (`journal/YYYY-MM.md`); migrated to per-entry on 2026-05-11 to make the atomic unit match the data and to keep cross-entry tooling (indexing, embeddings, curator) cheap.
- **Archive (raw substrate):** also in `adam-corpus`, under `archive/YYYY/MM/YYYY-MM-DDTHHMMSSsssZ-{kind}.md` (millisecond resolution so a burst of drops in one interview session doesn't collide). Conversation transcripts, voice memos, interview answers, meeting notes, decision drafts, anything to be preserved verbatim. Written by the `drop_to_archive` MCP tool. Indexed for semantic retrieval via the Firestore `archive_embeddings` collection and queryable via `semantic_search_archive`. Each file is self-contained: YAML frontmatter with `timestamp`, `kind` (`voice-memo` / `note` / `interview` / `meeting` / `other`), optional `source` for grouping related drops (e.g. `interview:daily-2026-05-14`), and `agent`. Body is the raw text. Distinct from the journal tier, which carries the distilled signal.
- **Loader:** `src/lib/content.ts` reads markdown, parses with gray-matter, calculates reading time
- **Canonical retrieval index:** `content/context/embeddings.json` — one paragraph per record, embedding stored as base64 float32 (~8KB per paragraph). Generated by `scripts/build-canonical-embeddings.mjs` against `text-embedding-3-small`. Committed alongside the markdown so the server reads it at module load with no API call. Re-run the script after editing a context file (idempotent; re-uses any embedding whose paragraph sha256 already matches). Loaded by `src/lib/embeddings.ts`.
- **Renderer:** remark + remark-html, styled via `.prose-cyberpunk` CSS class in globals.css

### Blog Posts (9)

1. `consent-screen-never-showed-up.md` (2026-05-18) -- MCP auth across the three Claude harnesses: why the browser never authenticated (soft 200 instead of 401+WWW-Authenticate), the 307-vs-303 OAuth redirect trap, and prompts not surfacing as slash commands
2. `feeding-the-corpus.md` (2026-05-16) -- The capture-layer build-out: why storage was the easy part, the daily-interview reframe (passive to prompted capture), and the curator deliberately left half-built
3. `agents-over-trained-model.md` (2026-05-11) -- The strategic case for RAG-fed agents over fine-tuning, given a thin and fast-moving corpus
4. `giving-mcp-server-a-journal.md` (2026-04-19) -- Making the MCP server writable via a journal tier, plus OAuth 2.1 so any client can authenticate
5. `building-mcp-server-personal-context.md` (2026-04-13) -- Building a personal MCP server build log
6. `landing-ai-transformation.md` (2026-04-12) -- AI transformation leadership
7. `building-this-site-with-agents.md` (2026-04-05) -- Meta site rebuild story
8. `delivery-without-visibility.md` (2026-03-20) -- Stakeholder visibility failure story
9. `salesforce-price-book-2025.md` (2024-12-28) -- Salesforce CPQ price book update

### Context Portfolio (10 files)

1. `identity.md` -- Who Adam is
2. `role-and-responsibilities.md` -- Weekly workload at CtM
3. `current-projects.md` -- Active work and side projects
4. `team-and-relationships.md` -- Key contacts (role titles only, no real names for CtM)
5. `tools-and-systems.md` -- Tech stack and tooling
6. `communication-style.md` -- Writing voice and agent guardrails
7. `goals-and-priorities.md` -- Career and family priorities
8. `preferences-and-constraints.md` -- Hard rules for agents
9. `domain-knowledge.md` -- Expertise map with honest edges
10. `decision-log.md` -- Decision-making frameworks

### Visual Polish

- **Headshot photo:** `public/images/adam-headshot.jpg` on homepage hero (circular, neon glow) and about page (rounded rectangle, flex layout)
- **Favicon:** Custom SVG compass/navigation arrow in neon purple + cyan (`src/app/icon.svg`)
- **Icons:** lucide-react throughout (homepage highlights, about cards, contact cards, footer social links)
- **Employer bar:** Styled text names on CV page (greyscale default, neon glow on hover): Compare the Market, Digital Illumination, BMW, MINI, 3M, University of Oxford, Capital One
- **Neon dividers:** `public/images/neon-divider.jpg` used as section dividers on About and Projects pages (faded overlay with gradient masks)
- **Career progression bar:** Animated gradient fill from Developer to Head of Tech on CV page
- **Achievement stats:** Animated stat cards with neon glow on CV and About pages
- **Staggered animations:** `contact-card-enter` keyframe with incremental delays across all page cards
- **Blog images:** Abstract neon-themed hero images from Unsplash in `public/images/blog/`, displayed on blog listing cards and as full-width hero banners on individual post pages (with gradient fade). Frontmatter `image` field per post.
- **Layout:** All pages use `max-w-7xl` content containers matching the navbar width
- **Images:** `next/image` component for optimised photo delivery

### SEO & Feeds

- **Metadata:** `metadataBase` set to `https://ad-nav.co.uk`, all pages have canonical URLs, Twitter card (`summary_large_image`), OpenGraph metadata
- **OG images:** Dynamic generation via `ImageResponse` (`next/og`). Root image: dark bg with neon gradient bars and "Ad-Nav" title. Blog posts: per-post image with dynamic title
- **Sitemap:** `src/app/sitemap.ts` generates XML sitemap with static pages + blog posts
- **Robots:** `src/app/robots.ts` allows all crawlers, disallows `/api/`, references sitemap
- **RSS feed:** `src/app/feed.xml/route.ts` generates RSS 2.0 XML from blog posts. Footer includes RSS link
- **JSON-LD:** WebSite + Person schema in root layout, Article schema on blog post pages
- **Constants:** `src/lib/constants.ts` shared `BASE_URL`, `SITE_NAME`, `SITE_DESCRIPTION`

### Responsive & Performance

- **Particle background:** Capped at 30 particles on mobile (< 768px), 80 on desktop. Connection lines disabled on mobile. Single static frame when `prefers-reduced-motion: reduce`
- **Reduced motion:** CSS `@media (prefers-reduced-motion: reduce)` disables glitch, flicker, pulse-glow, hero animations, animated borders, neon HR, progression bar, page transitions, scanline overlay
- **Mobile optimisations:** Scanline overlay hidden below 768px. Cyber-grid background scales to 30px on mobile. Hero radial glow responsive (300px mobile, 450px tablet, 600px desktop). Contact grid uses intermediate `sm:grid-cols-2` breakpoint

### Theme

Cyberpunk aesthetic built with CSS custom properties:

- **Colours:** Near-black background (#0a0a0f), neon purple (#b829e3), neon pink (#ff2d95), neon cyan (#00f0ff)
- **Fonts:** Inter (sans), JetBrains Mono (mono)
- **Effects:** Glitch text, neon glow shadows, scanline overlay, animated gradient borders, glass morphism cards, particle background, typing cursor, page fade-in, contact page signal-ping pulse rings + terminal status bar, staggered card entrance animations, neon HR dividers, career progression reveal animation
- **Components:** `NeonCard`, `GlitchText`, `TypingText`, `ParticleBackground`, `Navbar`, `Footer`

### Infrastructure

- **Platform:** GCP Cloud Run (europe-west2)
- **Auth:** Workload Identity Federation (GitHub OIDC, no stored service account keys)
- **CI/CD:** `.github/workflows/deploy.yml` builds the Docker image and deploys on push to main. Uses Node 24-runtime actions (`actions/checkout@v5`, `google-github-actions/auth@v3`, `google-github-actions/setup-gcloud@v3`), bumped from the Node 20 versions GitHub deprecated in 2026
- **Dockerfile:** Multi-stage Node 20 Alpine build with standalone Next.js output
- **Infra details:** Resource names, IPs, and load balancer config are in a private runbook, not in this repo

### Custom Domains

**Primary domain:** `ad-nav.co.uk`

All alternate domains redirect 301 to the primary:
- `www.ad-nav.co.uk`, `adamstacey.co.uk`, `www.adamstacey.co.uk`, `adamstacey.com`, `www.adamstacey.com`

Global External HTTPS Load Balancer with Google-managed SSL. HTTP redirects to HTTPS. DNS managed via Fasthosts.

### MCP Server

The context portfolio is exposed to any MCP-compatible client (Claude Code, Claude Desktop, Cursor, Windsurf, Cline, Continue, claude.ai, Cowork, etc.) via two transports, both serving the same tools and resources.

**Resources (shared):**
| URI Pattern | Description |
|-------------|-------------|
| `context://adam-stacey/{filename}` | Individual context file (template resource, lists all 10) |

**Tools (shared read):**
| Tool | Description |
|------|-------------|
| `list_context_files` | List all canonical files with titles and descriptions |
| `search_context` | Hybrid retrieval over canonical context paragraphs. Keyword half ranks paragraphs by query-term coverage; vector half embeds the query via OpenAI `text-embedding-3-small` and ranks paragraphs by cosine similarity against the prebuilt index. Results combined via reciprocal rank fusion (k=60). Returns the top `top_k` paragraphs (default 5, max 20) with file attribution. Degrades gracefully: missing embedding index or unset `OPENAI_API_KEY` → keyword-only, with the mode reported in the response. |
| `get_full_context` | Load entire canonical portfolio as one document |

**Curation tools (remote, read):**
| Tool | Description |
|------|-------------|
| `propose_context_update` | Given a session summary or new fact, return ranked canonical candidate files and the relevant paragraphs inside them. Read-only, public. The original keyword-based curation primitive: ranks by overlap (title ×3, description ×2, body ×1), filters stop-words. Useful for "I have a snippet, where in canonical might it go?" |
| `curator_review` | Inverse direction: given a canonical filename, return the top journal entries and archive drops semantically related to it. Read-only. Reuses precomputed canonical paragraph embeddings (no new OpenAI call) and computes cosine against `journal_embeddings` + `archive_embeddings`. Useful for "this canonical file might be stale — what recent material would feed an update?" Requires `isAdmin` or `context:write` (since it reads private journal/archive material). Defaults: `top_k`=10, max 50. |

**Agent guidance (remote, read, public):**
| Tool | Description |
|------|-------------|
| `session_logging_guide` | Return the rules for when and what to log to the journal. Agents call this to refresh the format or decide if a session is worth logging. |
| `get_log_session_script` | Return the log-session protocol text. Byte-identical to the `log-session` MCP prompt (shared builder). Exists because Claude Code does not surface MCP prompts as slash commands, so the `.claude/commands/log-session.md` wrapper calls this tool instead. Public, no private data. |
| `get_interview_script` | Return the daily-interview protocol text (with today's session label). Byte-identical to the `daily-interview` MCP prompt (shared builder). Same Claude Code rationale: the `.claude/commands/daily-interview.md` wrapper calls this. Public. |

**Mid-session flags (remote only, authenticated):**
| Tool | Description |
|------|-------------|
| `flag_signal` | Mark a moment in the current session worth keeping, without committing to a full journal entry. Writes a short note to the Firestore `flags` collection, scoped to the caller's auth subject ("admin" for static bearer, JWT `sub` for OAuth). Fields: `text` (required, ≤500 chars), `kind` (optional enum: `decision`, `preference`, `observation`, `followup`), `agent` (optional). Returns the flag id and expiry. Flags auto-expire 24 hours after creation. Same auth as `append_to_journal`. |
| `list_flags` | List the caller's unexpired flags, oldest first. Scoped to the caller's auth subject; no cross-subject access. Used at session close to recall what was flagged so it can be woven into a journal entry. Returns one line per flag with timestamp, kind, agent, text, and id. Same auth as `append_to_journal`. |

**Journal tools (remote only, authenticated):**
| Tool | Description |
|------|-------------|
| `append_to_journal` | Write a new structured journal entry as its own file at `journal/YYYY/MM/YYYY-MM-DDTHHMMSSZ-{agent-slug}.md` in `adam-corpus`. One PUT to the GitHub Contents API per call; no read-modify-write. Also embeds the entry body via OpenAI `text-embedding-3-small` (best-effort, after the PUT succeeds) and upserts into the Firestore `journal_embeddings` collection so it's searchable via `semantic_search_journal`. Requires `isAdmin` (matches `MCP_WRITE_TOKEN`) or OAuth JWT with `context:write` scope. Fields: `summary` (required, ≥50 chars), `decisions`, `patterns`, `followups`, `tags`, `agent`, `flag_ids` (all optional). `flag_ids` is a cleanup directive: the caller has already woven flag content into the body fields and is asking the server to delete the consumed flag docs after the entry commits. Flags belonging to a different subject or already expired are silently skipped. Does NOT write to canonical files. |
| `get_journal_entries` | List the `journal/YYYY/MM/` directory for the requested month (defaults to current UTC month) in `adam-corpus`, fetch each entry file in parallel, and return them concatenated as one markdown blob. Same auth as `append_to_journal`. Used by a curator pass or by an agent reviewing prior observations before writing a new entry. |
| `semantic_search_journal` | Vector search across all indexed journal entries. Embeds the query via OpenAI `text-embedding-3-small`, fetches every doc in `journal_embeddings`, ranks by cosine similarity, fetches the top `top_k` entries from `adam-corpus`, and returns them with similarity scores. Requires `isAdmin` or `context:write` AND `OPENAI_API_KEY` on the server; no keyword fallback (use `get_journal_entries` for unindexed access). Defaults: `top_k`=5, max 20. |

**Archive tier tools (remote only, authenticated):**
| Tool | Description |
|------|-------------|
| `drop_to_archive` | Write raw text verbatim to the archive tier (`archive/YYYY/MM/YYYY-MM-DDTHHMMSSsssZ-{kind}.md` in `adam-corpus`). Preserves the user's actual words; no distillation, no schema beyond the frontmatter. After the GitHub PUT succeeds, best-effort embeds the body via `text-embedding-3-small` and upserts into the Firestore `archive_embeddings` collection. Fields: `text` (required), `kind` (required enum: `voice-memo` / `note` / `interview` / `meeting` / `other`), `source` (optional grouping label), `agent` (optional). Requires `isAdmin` or `context:write`. |
| `semantic_search_archive` | Vector search across all indexed archive drops. Same shape as `semantic_search_journal` but over raw substrate rather than distilled signal. Requires `isAdmin` or `context:write` AND `OPENAI_API_KEY` on the server; no keyword fallback. Defaults: `top_k`=5, max 20. |
| `search_all` | One-call cross-tier search. Embeds the query once and ranks canonical + journal + archive independently against it; returns top `top_k_per_tier` results per tier, grouped by tier (NOT fused — vector distributions across tiers aren't directly comparable). Saves the agent three roundtrips when it wants the full picture of what the user has said or written about a topic. Requires `isAdmin` or `context:write` AND `OPENAI_API_KEY` on the server. Defaults: `top_k_per_tier`=3, max 10. |

**Prompts (remote, user-triggered).** MCP prompts for clients that surface them (claude.ai, Claude Desktop, etc.). **Claude Code does not expose MCP prompts as slash commands** (verified May 2026: tools surface, prompts do not, regardless of transport). For Claude Code the same protocols are reached via the mirror tools (`get_log_session_script`, `get_interview_script`) and the `.claude/commands/*.md` wrappers below. Prompt and tool share one builder in `src/lib/mcp-server.ts` (`buildLogSessionScript`, `buildDailyInterviewScript`), so the surfaces never drift.

| Prompt | Description |
|--------|-------------|
| `log-session` | Instructs the agent to summarise the current session and call `append_to_journal`. |
| `daily-interview` | Runs a short structured interview (2 fixed scaffolding questions plus 3 topical questions tailored to the user's recent journal and canonical material). The agent asks one question at a time, drops each raw response to the archive tier via `drop_to_archive` with a shared `source` label (`interview:daily-YYYY-MM-DD`), and at the end writes one distilled journal entry via `append_to_journal`. The shared `source` label and timestamps let related drops be reconstructed later. Designed for voice-driven capture via Wispr (or similar dictation tools). |

**Claude Code slash-command wrappers.** Project-scoped commands committed at `.claude/commands/`:
- `/log-session` → calls `get_log_session_script` and follows it.
- `/daily-interview` → calls `get_interview_script` and follows it.

These give Claude Code users a bare `/log-session` / `/daily-interview` despite the lack of MCP-prompt support. The command body is a thin instruction (call the tool, follow the output exactly); the protocol itself is never duplicated into the command file. The tool prefix `mcp__adam-stacey-context-remote__` assumes the server is registered under that name in the user's Claude Code config.

**Server-level instructions.** The remote server sets the MCP `instructions` field on connect, advising every client of the four-tier model (archive / session / journal / canonical) and pointing at `session_logging_guide` for details. No client-side config needed.

#### Local stdio server (`mcp/`)

For desktop clients that launch a child process.

- **Location:** `mcp/` subdirectory with its own `package.json` and `tsconfig.json`
- **Package:** `@adam-stacey/context-mcp` (private, not yet published)
- **Transport:** stdio
- **Content source:** `content/context/*.md` from repo root (override via `CONTEXT_DIR`)
- **Build:** `cd mcp && npm install && npm run build`
- **Configuration:** opt-in. The project no longer ships an `.mcp.json` (which previously auto-loaded the stdio server via `${PROJECT_ROOT}/mcp/build/index.js`). The remote HTTP endpoint at `/api/mcp` is now the default everyday path. To use the stdio server locally (e.g. for offline reads), add it manually:
  - Claude Code: `claude mcp add --scope user adam-stacey-context-stdio /absolute/path/to/mcp/build/index.js`
  - Claude Desktop: edit `~/Library/Application Support/Claude/claude_desktop_config.json`

#### Remote HTTP endpoint (`/api/mcp`)

For remote clients that add MCP servers as custom connectors (claude.ai, Cowork, Claude Desktop ≥ v0.9).

- **URL:** `https://ad-nav.co.uk/api/mcp`
- **Transport:** Streamable HTTP (stateless, JSON responses). Spec: [modelcontextprotocol.io](https://modelcontextprotocol.io/specification/draft/basic/transports#streamable-http)
- **Methods:** `POST` (JSON-RPC requests), `GET` (SSE, unused in stateless mode), `DELETE` (no-op)
- **Implementation:** `src/app/api/mcp/route.ts` using `WebStandardStreamableHTTPServerTransport` from `@modelcontextprotocol/sdk`
- **Server factory:** `src/lib/mcp-server.ts` — shared tool/resource definitions, uses `getContextFiles()` from `src/lib/content.ts`
- **Statelessness:** Each request creates a fresh `McpServer` + transport. No session storage, no sticky routing, safe to scale to zero.
- **Runtime:** Node.js (not Edge — the SDK uses Node APIs internally)

##### Auth model (two orthogonal gates)

**Transport gate (optional lockdown).** If `MCP_BEARER_TOKEN` is set, every request must present that bearer. In that mode, reads are locked down too. Leave this env var unset for the common case: public reads, authenticated writes.

**Resource gate (per-tool).** When the transport gate is off, each request is resolved into an `AuthContext` in `src/app/api/mcp/route.ts` and handed to the server factory. Resolution order:

1. No `Authorization` header → anonymous, empty scopes. Read tools still work.
2. Bearer matches `MCP_WRITE_TOKEN` → admin, all scopes, bypasses scope checks. Used by Claude Code via its static config.
3. Bearer is a valid JWT (HS256, issuer + audience matching) → subject and scopes from the token.
4. Any other bearer → 401 with `WWW-Authenticate: Bearer realm="mcp", error="invalid_token", error_description="..."` per RFC 6750.

`append_to_journal`, `get_journal_entries`, `semantic_search_journal`, `drop_to_archive`, `semantic_search_archive`, `search_all`, `curator_review`, `flag_signal`, and `list_flags` all require `isAdmin` OR the `context:write` scope. The other tools are public.

##### OAuth 2.1 authorization server

The site acts as its own authorization server, with GitHub as the upstream identity provider. Compliant MCP clients (Claude Desktop, claude.ai, Cowork, etc.) discover and use it automatically via RFC 8414 / 9728 metadata.

**Discovery:**
- `/.well-known/oauth-authorization-server` (RFC 8414) — advertises authorize, token, registration endpoints; `S256` PKCE; supported scopes
- `/.well-known/oauth-protected-resource` (RFC 9728) — points MCP clients at the authorization server

Both are served via Next.js rewrites to `/api/oauth/metadata/...`.

**Registration, authorize, token:**
- `/api/oauth/register` — dynamic client registration (RFC 7591). Public clients with PKCE are the default; no client secret needed. Enforces https redirect_uris except for localhost loopback.
- `/api/oauth/authorize` — GET renders a consent page in the site aesthetic. POST processes Approve/Deny. PKCE required (`S256`). Redirects to `/api/oauth/signin?return_to=...` if the user has no session. When the client does not request a specific `scope`, the server grants **all supported scopes** (`context:read context:write`), not read-only. Rationale: `OAUTH_ALLOWLIST` is the real gate; any caller that reaches consent is already an allowlisted identity, so defaulting to read-only just breaks write-capable clients (e.g. claude.ai) that don't explicitly ask for `context:write`. The consent page still displays the granted scopes.
- `/api/oauth/token` — `authorization_code` and `refresh_token` grants. Refresh tokens rotate on each use (replayed refresh tokens get `invalid_grant`). The `refresh_token` grant **broadens scopes to all supported scopes** on rotation, not just carrying the old ones forward. Same rationale as the authorize default: `OAUTH_ALLOWLIST` is the real gate, and clients refresh rather than re-authorise, so without this a grant issued read-only (before the default-scope change) would rotate read-only forever and the client could never reach the write tools. Existing read-only clients self-heal on their next refresh (≤1h, when the access token expires).

**Identity and session:**
- `/api/oauth/signin` — kicks off GitHub OAuth with a state cookie for CSRF
- `/api/oauth/callback/github` — verifies state, exchanges the code, checks the GitHub login against `OAUTH_ALLOWLIST`, creates a Firestore-backed browser session
- `/api/oauth/me` — returns the current session (for verification)
- `/api/oauth/signout` — destroys session

**Scopes:**
- `context:read` — currently all canonical read tools are public, so this is reserved for future gating. Granted by default alongside `context:write` when a client doesn't request specific scopes
- `context:write` — required for `append_to_journal`, `get_journal_entries`, `semantic_search_journal`, `drop_to_archive`, `semantic_search_archive`, `search_all`, `curator_review`, `flag_signal`, and `list_flags`

**Tokens:**
- Access tokens are signed JWTs (HS256, `iss=https://ad-nav.co.uk`, `aud=https://ad-nav.co.uk/api/mcp`, 1 hour TTL). Stateless, no Firestore round-trip on MCP requests.
- Refresh tokens are opaque 48-byte hex strings, 30-day TTL, rotated on use.

**Firestore collections:**
- `sessions` — browser sessions (cookie-keyed)
- `oauth_clients` — dynamically registered clients
- `oauth_codes` — short-lived authorization codes (5-minute TTL, single-use, transactional consume)
- `oauth_refresh_tokens` — refresh tokens with rotation semantics
- `flags` — mid-session flags, keyed by auth subject, 24-hour expiry. Single-field index on `subject` is automatic; expiry filtering happens in code so no composite index is needed. Module: `src/lib/flags-storage.ts`.
- `journal_embeddings` — one doc per indexed journal entry. Doc id is sha256 of the entry's file path. Embedding is a native Firestore number array (1536 doubles, ~24KB per doc). Written best-effort by `append_to_journal` after a successful GitHub PUT; backfilled for existing entries by `scripts/backfill-journal-embeddings.mjs`. No vector index — `semantic_search_journal` fetches all docs and ranks in process. Module: `src/lib/journal-embeddings-storage.ts`.
- `archive_embeddings` — one doc per archive drop. Same shape and storage strategy as `journal_embeddings` (sha256-of-path doc id, native number array, in-process cosine). Adds `kind` and optional `source` fields mirroring the markdown frontmatter. Written best-effort by `drop_to_archive`; backfilled by `scripts/backfill-archive-embeddings.mjs`. Module: `src/lib/archive-embeddings-storage.ts`.

##### Env vars

**Always needed (reads public, writes via static admin):**
- `MCP_WRITE_TOKEN` — static admin bearer. Used by Claude Code. Optional, but without it `append_to_journal` is only accessible via OAuth.
- `GITHUB_TOKEN` — PAT or GitHub App installation token. Must have `contents:write` on the journal repo (i.e. `adam-corpus`).
- `JOURNAL_REPO` — `owner/repo` for the private journal target, e.g. `digital-illumination/adam-corpus`. Required for `append_to_journal` and `get_journal_entries` to function.
- `JOURNAL_BRANCH` (optional, default `main`) — branch to commit to inside the journal repo.
- `GITHUB_REPO`, `GITHUB_BRANCH` — kept around for backward compatibility, but no longer used by the journal tools.

**OAuth-specific:**
- `OAUTH_JWT_SECRET` — HMAC secret for signing access tokens.
- `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET` — for the upstream GitHub identity flow.
- `OAUTH_ALLOWLIST` — comma-separated GitHub logins permitted to authenticate. Empty or unset = nobody. Fail-closed.

**Embeddings:**
- `OPENAI_API_KEY` — used by the server in five places, all reusing the same `text-embedding-3-small` model: (1) embedding the query for `search_context` (graceful degradation to keyword-only when missing), (2) embedding the body of every new entry written via `append_to_journal` (graceful degradation to no indexing when missing — the entry is still durable), (3) embedding the query for `semantic_search_journal` (no fallback — the tool errors if missing), (4) embedding every new drop written via `drop_to_archive` (graceful degradation to no indexing), (5) embedding the query for `semantic_search_archive` (no fallback). Canonical paragraph embeddings are pre-computed by `scripts/build-canonical-embeddings.mjs` and shipped with the deploy. Journal and archive embeddings live in Firestore; existing entries get backfilled by `scripts/backfill-journal-embeddings.mjs` and `scripts/backfill-archive-embeddings.mjs` respectively. New entries are indexed automatically on write.

**Lockdown mode:**
- `MCP_BEARER_TOKEN` (optional) — when set, transport-level auth is enabled, and reads stop being public. Not used in normal operation.

## Planned Work

### Custom Domains (done)
- All six domains live with SSL, redirects configured
- Cancel WPEngine hosting

### MCP Server (done)
- Local stdio server in `mcp/` with read tools + resources
- Remote HTTP endpoint at `/api/mcp` (Streamable HTTP, stateless): usable as a custom connector in claude.ai, Cowork, Claude Desktop
- Four-tier storage model: archive (private raw substrate) → live session (ephemeral) → journal (agent-writable, append-only) → canonical context (human-edited). Mid-session flags sit as a staging surface just below the journal tier.
- `append_to_journal` write tool: writes one structured entry per call as its own file at `journal/YYYY/MM/YYYY-MM-DDTHHMMSSZ-{agent-slug}.md` in `adam-corpus` via a single Contents API PUT. Optional `flag_ids` field deletes consumed mid-session flags after the entry commits.
- `get_journal_entries` read tool (auth-gated): lists the month directory in `adam-corpus`, fetches entries in parallel, returns concatenated markdown.
- `semantic_search_journal` read tool (auth-gated): embeds the query, ranks all indexed entries by cosine similarity against the `journal_embeddings` Firestore collection, fetches the top results from `adam-corpus`, and returns them with scores. `append_to_journal` indexes each new entry on write (best-effort). Existing entries are backfilled via `scripts/backfill-journal-embeddings.mjs`.
- `drop_to_archive` and `semantic_search_archive` (auth-gated): make the archive tier writable and searchable. `drop_to_archive` writes raw substrate (voice memos, interview answers, meeting notes) verbatim to `archive/YYYY/MM/...md` in `adam-corpus` and best-effort indexes via the `archive_embeddings` Firestore collection. `semantic_search_archive` is the corresponding vector reader. Backfill via `scripts/backfill-archive-embeddings.mjs`.
- `daily-interview` prompt: runs a 5-question interview (2 scaffolding + 3 topical, tailored to recent journal and canonical context). Each raw response goes to the archive tier with a shared `source` label; one distilled journal entry summarises the session at the end. Designed for voice-driven capture via Wispr.
- `flag_signal` and `list_flags` (auth-gated): mid-session flagging. Flags live in the Firestore `flags` collection, scoped to the caller's auth subject, auto-expire after 24 hours. Consumed by `append_to_journal` via `flag_ids`.
- `session_logging_guide` tool: serves the current rules for when and how to log
- `log-session` prompt: user-triggered slash-command template for manual session logging
- `get_log_session_script` / `get_interview_script` tools + `.claude/commands/{log-session,daily-interview}.md` wrappers: mirror the two prompts as tools because Claude Code does not surface MCP prompts as slash commands (verified May 2026). Prompt and tool share one builder per script so they never drift.
- Server-level MCP `instructions` field: every client is told the tier model on connect
- `propose_context_update` curation tool: ranks candidate files and surfaces relevant paragraphs. Read-only, designed for a future curator pass.

### OAuth 2.1 for remote MCP (done)

Claude Desktop and other modern MCP clients expect OAuth 2.1 for remote authenticated connectors. The full spec is now implemented alongside the static `MCP_WRITE_TOKEN` path, so both Claude Code (static bearer) and Claude Desktop (OAuth connector) authenticate cleanly.

Built in three reviewable commits, each covering one layer:

- **Identity foundation** — GitHub OAuth as upstream identity provider, env-var allowlist (fail-closed), Firestore-backed browser sessions. Routes: `/api/oauth/signin`, `/api/oauth/callback/github`, `/api/oauth/me`, `/api/oauth/signout`. Modules: `src/lib/firestore.ts`, `src/lib/session.ts`, `src/lib/github-oauth.ts`, `src/lib/allowlist.ts`.
- **OAuth 2.1 authorization server** — discovery metadata (RFC 8414, RFC 9728) via Next.js rewrites; dynamic client registration (RFC 7591); authorize endpoint with inline cyberpunk-themed consent page; token endpoint with PKCE (`S256` required) and refresh rotation. Modules: `src/lib/oauth.ts`, `src/lib/oauth-storage.ts`. Firestore collections: `oauth_clients`, `oauth_codes` (transactional consume), `oauth_refresh_tokens` (rotation on use).
- **Resource server gating** — `/api/mcp` resolves the presented bearer into an `AuthContext` (admin via static token, JWT holder via OAuth, or anonymous). Invalid bearers get 401 with RFC 6750 `WWW-Authenticate`. `append_to_journal` requires `isAdmin` OR the `context:write` scope. Read tools remain public.

Verified end-to-end via manual curl (anonymous reads, static-bearer writes, full OAuth authorize + token + write, refresh rotation, replay rejection) and from Claude Desktop's custom connector UI.

### Context Curation
**Done:**
- `curator_review` tool: given a canonical filename, surfaces the top journal entries and archive drops semantically related to it. Reuses the precomputed canonical paragraph embeddings, so no new OpenAI call per review. Read-only; produces a structured report for a human (or an agent on Adam's behalf) to decide whether the canonical file is due for a refresh. Designed to work even at low corpus volume — no auto-PR, no auto-write to canonical, just retrieval.
- Companion `propose_context_update` tool (existing): the inverse direction (snippet → canonical candidates) for when an agent has a new observation and wants to know where it might live.

**Planned (deferred until the corpus has built up):**
- Scheduled curator agent: walks every canonical file via `curator_review`, identifies which ones have the most accumulated divergence, drafts a PR against the highest-priority candidate. Human approval always in the loop. Deferred until the daily-interview pipeline has produced a few weeks of journal + archive material.
- Section-level edit tool (`replace_section_in_context`): surgical edits within canonical files without replacing whole bodies. Needs a stable anchor mechanism (headings or line ranges). Only relevant once the auto-PR flow exists.
- Client-side hook on Claude Code (`Stop` hook) to auto-trigger `log-session` at the end of a session. Claude Code-specific; other clients rely on server instructions or manual prompting.

### Blog Pipeline
Remaining post ideas from interview prep material:
- "How I coordinated 300 engineers for a zero-downtime release"
- "Two engineers, two approaches"
- "The hardest right decision"
- "The time I confused advocacy with leadership"
- "Hire for behaviours, develop for skills"

### Polish (done)
- SEO metadata, Open Graph images, sitemap, robots.txt, JSON-LD, canonical URLs
- RSS feed at `/feed.xml` with footer link
- Responsive fixes: hero glow, contact grid, mobile scanline/grid
- Performance: ParticleBackground optimised, `prefers-reduced-motion` support

### HR Compliance Review (done)
- Removed £250M profit figure, specific team sizes (40+), engagement score claims
- Generalised org structure: "multiple teams" instead of exact counts, removed direct report breakdown
- Removed AutoTrader comparison, Devon tool name, Stripe vendor name, offshore detail
- Softened product launch timelines and specific internal initiatives
- Condensed career ambition section in goals context file (removed interview reflection, simplified decision filter)
- Generalised CtM engineering stack detail

## Privacy Rules

These are hard constraints for any agent working on this repo:

- **No real names for CtM colleagues.** Use role titles only.
- **No client names from Digital Illumination.** Never publish Altair, Intel, or VentureEd Solutions.
- **No Meta references.** Never mention Meta by name in public content.
- **No operational secrets.** No IPs, SSH details, Bitwarden configs, service accounts, ports, or tokens.
- **Family names are OK:** Gemma (wife), Isaac (son), Eleanor (daughter).
- **CtM figures only if publicly sourced.**
