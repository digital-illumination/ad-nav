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
| `/.well-known/ai-context.json` | GET | Agent discovery file pointing to API routes |
| `/sitemap.xml` | GET | Auto-generated sitemap (static pages + blog posts) |
| `/robots.txt` | GET | Crawler directives (allow all, disallow `/api/`) |
| `/feed.xml` | GET | RSS 2.0 feed of all blog posts |
| `/opengraph-image` | GET | Dynamic OG image (root, generated via `ImageResponse`) |
| `/blog/[slug]/opengraph-image` | GET | Dynamic per-post OG image with post title |

### Content System

- **Blog posts:** `content/blog/*.md` with YAML frontmatter (`title`, `date`, `excerpt`, `tags`, `image`)
- **Context files (canonical):** `content/context/*.md` with YAML frontmatter (`title`, `description`). Human-edited. Never written directly by agents.
- **Journal (working memory):** `content/journal/YYYY-MM.md`, one file per calendar month. Agent-writable append-only log of session observations via the `append_to_journal` MCP tool. Not part of any canonical profile. Used as source material for future curation passes.
- **Loader:** `src/lib/content.ts` reads markdown, parses with gray-matter, calculates reading time
- **Renderer:** remark + remark-html, styled via `.prose-cyberpunk` CSS class in globals.css

### Blog Posts (5)

1. `building-mcp-server-personal-context.md` (2026-04-13) -- Building a personal MCP server build log
2. `landing-ai-transformation.md` (2026-04-12) -- AI transformation leadership
3. `building-this-site-with-agents.md` (2026-04-05) -- Meta site rebuild story
4. `delivery-without-visibility.md` (2026-03-20) -- Stakeholder visibility failure story
5. `salesforce-price-book-2025.md` (2024-12-28) -- Salesforce CPQ price book update

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
- **CI/CD:** `.github/workflows/deploy.yml` -- push to main builds Docker image and deploys
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
| `search_context` | Full-text search across all canonical context files |
| `get_full_context` | Load entire canonical portfolio as one document |

**Curation tool (remote only, read):**
| Tool | Description |
|------|-------------|
| `propose_context_update` | Given a session summary or new fact, return ranked canonical candidate files and the relevant paragraphs inside them. Read-only. Intended for a future curator agent deciding whether journal signal has matured enough to warrant a PR against canonical files. Ranks by keyword overlap (title ×3, description ×2, body ×1), filters stop-words. |

**Agent guidance (remote only, read):**
| Tool | Description |
|------|-------------|
| `session_logging_guide` | Return the rules for when and what to log to the journal. Agents call this to refresh the format or decide if a session is worth logging. |

**Journal write tool (remote only, authenticated):**
| Tool | Description |
|------|-------------|
| `append_to_journal` | Append a structured session entry to `content/journal/YYYY-MM.md` for the current UTC month. Creates the month file if it doesn't exist. Commits via the GitHub Contents API. Requires bearer matching `MCP_WRITE_TOKEN`. Fields: `summary` (required, ≥50 chars), `decisions`, `patterns`, `followups`, `tags`, `agent` (all optional). Does NOT write to canonical files. |

**Prompts (remote only, user-triggered):**
| Prompt | Description |
|--------|-------------|
| `log-session` | Slash-command template that instructs the agent to summarise the current session and call `append_to_journal`. Surfaces as `/log-session` in clients like Claude Desktop. |

**Server-level instructions.** The remote server sets the MCP `instructions` field on connect, advising every client of the three-tier model (session / journal / canonical) and pointing at `session_logging_guide` for details. No client-side config needed.

#### Local stdio server (`mcp/`)

For desktop clients that launch a child process.

- **Location:** `mcp/` subdirectory with its own `package.json` and `tsconfig.json`
- **Package:** `@adam-stacey/context-mcp` (private, not yet published)
- **Transport:** stdio
- **Content source:** `content/context/*.md` from repo root (override via `CONTEXT_DIR`)
- **Build:** `cd mcp && npm install && npm run build`
- **Configuration:**
  - Claude Code: `.mcp.json` in project root (project-scoped, auto-loaded)
  - Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json`

#### Remote HTTP endpoint (`/api/mcp`)

For remote clients that add MCP servers as custom connectors (claude.ai, Cowork, Claude Desktop ≥ v0.9).

- **URL:** `https://ad-nav.co.uk/api/mcp`
- **Transport:** Streamable HTTP (stateless, JSON responses). Spec: [modelcontextprotocol.io](https://modelcontextprotocol.io/specification/draft/basic/transports#streamable-http)
- **Methods:** `POST` (JSON-RPC requests), `GET` (SSE, unused in stateless mode), `DELETE` (no-op)
- **Implementation:** `src/app/api/mcp/route.ts` using `WebStandardStreamableHTTPServerTransport` from `@modelcontextprotocol/sdk`
- **Server factory:** `src/lib/mcp-server.ts` — shared tool/resource definitions, uses `getContextFiles()` from `src/lib/content.ts`
- **Auth:**
  - `MCP_BEARER_TOKEN` (optional): if set, every request must carry `Authorization: Bearer <token>`. Unset = reads public.
  - `MCP_WRITE_TOKEN` (optional): gates the `append_to_context` tool only. The tool compares the presented bearer against this value. Unset = write tool is disabled. If both tokens are set and differ, the write token must be used (it has to pass the transport check first).
- **GitHub write config (only for `append_to_context`):**
  - `GITHUB_TOKEN`: PAT or GitHub App installation token with `contents:write` on the target repo.
  - `GITHUB_REPO`: `owner/repo`, e.g. `digital-illumination/ad-nav`.
  - `GITHUB_BRANCH` (optional): defaults to `main`.
- **Statelessness:** Each request creates a fresh `McpServer` + transport. No session storage, no sticky routing — safe to scale to zero.
- **Runtime:** Node.js (not Edge — the SDK uses Node APIs internally)

## Planned Work

### Custom Domains (done)
- All six domains live with SSL, redirects configured
- Cancel WPEngine hosting

### MCP Server (done)
- Local stdio server in `mcp/` with read tools + resources
- Remote HTTP endpoint at `/api/mcp` (Streamable HTTP, stateless, optional bearer auth): usable as a custom connector in claude.ai, Cowork, Claude Desktop
- Three-tier storage model: live session (ephemeral) → journal (agent-writable append-only log) → canonical context (human-edited)
- `append_to_journal` write tool on the remote endpoint: appends structured session entries to `content/journal/YYYY-MM.md` via the GitHub Contents API, gated on `MCP_WRITE_TOKEN`. Creates monthly files on first write.
- `session_logging_guide` tool: serves the current rules for when and how to log
- `log-session` prompt: user-triggered slash-command template for manual session logging
- Server-level MCP `instructions` field: every client is told the tier model on connect
- `propose_context_update` curation tool: ranks candidate files and surfaces relevant paragraphs. Read-only, designed for a future curator pass.

### OAuth 2.1 for remote MCP (in progress)

Background: Claude Desktop and other MCP clients expect OAuth 2.1 for remote authenticated connectors. The static `MCP_WRITE_TOKEN` covers Claude Code today, but does not satisfy Claude Desktop's connector UI. Adding OAuth alongside (not replacing) the static token lets any compliant client authenticate.

Delivery is split into four chunks. This section tracks progress.

**Chunk 1 — Identity foundation (done).** GitHub OAuth as upstream identity provider. Env-var allowlist. Firestore-backed browser sessions.
- `src/lib/firestore.ts` — singleton client, ADC on Cloud Run
- `src/lib/session.ts` — Firestore-backed sessions keyed on an httpOnly cookie
- `src/lib/github-oauth.ts` — upstream OAuth helpers (authorize URL, code exchange, user fetch)
- `src/lib/allowlist.ts` — `OAUTH_ALLOWLIST` env var, comma-separated GitHub logins, fail-closed
- `/api/oauth/signin` — kicks off GitHub flow, stores state cookie for CSRF
- `/api/oauth/callback/github` — verifies state, exchanges code, checks allowlist, creates session
- `/api/oauth/me` — returns current session (for verification)
- `/api/oauth/signout` — destroys session
- Firestore collections: `sessions`

**Chunk 2 — OAuth 2.1 server endpoints (planned).**
- `/.well-known/oauth-authorization-server` + `/.well-known/oauth-protected-resource` metadata
- `/api/oauth/register` dynamic client registration
- `/api/oauth/authorize` consent page + authorization code issuance with PKCE
- `/api/oauth/token` exchange codes for JWT access tokens + opaque refresh tokens
- Firestore collections: `oauth_clients`, `oauth_codes`, `oauth_refresh_tokens`

**Chunk 3 — Resource server gating (planned).**
- `/api/mcp` accepts JWT access tokens OR the static `MCP_WRITE_TOKEN`
- `createContextMcpServer` receives resolved identity and scopes
- `append_to_journal` requires `context:write` scope (or the admin bearer)
- Reads stay public

**Chunk 4 — End-to-end verification + SPEC rewrite (planned).**

### Context Curation (planned)
- Scheduled curator agent: reads accumulated journal entries, calls `propose_context_update`, drafts changes to a branch, opens a PR against canonical files. Human approval always in the loop. Deferred until the journal has a month or two of material.
- Section-level edit tool (`replace_section_in_context`): surgical edits within canonical files without replacing whole bodies. Needs a stable anchor mechanism (headings or line ranges). Only relevant once the curator flow exists.
- Client-side hook on Claude Code (`Stop` hook) to auto-trigger `log-session` at the end of a session. Claude Code-specific; other clients rely on server instructions or manual prompting.

### Blog Pipeline
Remaining post ideas from interview prep material:
- "How I coordinated 300 engineers for a zero-downtime release"
- "Why I chose agents over a trained model"
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
