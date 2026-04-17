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
- **Context files:** `content/context/*.md` with YAML frontmatter (`title`, `description`)
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

**Tools (shared):**
| Tool | Description |
|------|-------------|
| `list_context_files` | List all files with titles and descriptions |
| `search_context` | Full-text search across all context files |
| `get_full_context` | Load entire portfolio as one document |

**Write tool (remote only):**
| Tool | Description |
|------|-------------|
| `append_to_context` | Append to (or replace the body of) an existing context file. Commits to GitHub via the Contents API. Preserves YAML frontmatter. `mode`: `append` (default) or `replace`. Requires bearer matching `MCP_WRITE_TOKEN`. Not exposed on the stdio server. |

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
- Local stdio server in `mcp/`
- Remote HTTP endpoint at `/api/mcp` (Streamable HTTP, stateless, optional bearer auth) — usable as a custom connector in claude.ai, Cowork, and Claude Desktop
- `append_to_context` write tool on the remote endpoint: commits changes directly to `content/context/*.md` via the GitHub Contents API, gated on `MCP_WRITE_TOKEN`

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
