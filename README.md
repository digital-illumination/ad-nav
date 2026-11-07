# Ad-Nav

Personal site for Adam Stacey. Cyberpunk-themed, dual-purpose: human-readable for visitors, machine-readable for AI agents via API routes and a context portfolio.

**Live:** https://ad-nav.co.uk
**Repo:** https://github.com/digital-illumination/ad-nav

## Stack

- **Framework:** Next.js 16 (App Router, standalone output)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS 4 + custom CSS variables
- **Content:** Markdown files parsed with gray-matter, rendered with remark/remark-html
- **Hosting:** Azure Container Apps (`ad-nav` in `di-website-env`, UK South), data in Cosmos DB, secrets in Key Vault
- **Domains:** `ad-nav.co.uk` (primary), with redirects from `www.ad-nav.co.uk`, `adamstacey.co.uk` and `adamstacey.com` (and their `www` names)
- **CI/CD:** GitHub Actions, OpenID Connect to Azure (no stored keys)
- **Container:** Docker, Azure Container Registry
- **MCP Server:** `mcp/` directory, exposes context portfolio to Claude Desktop and Claude Code

## Running locally

```
npm install
npm run dev
```

Open http://localhost:3000.

## Project structure

```
ad-nav/
  content/
    blog/          # Markdown blog posts with YAML frontmatter
    context/       # Context portfolio files (10 markdown files)
  src/
    app/           # Next.js App Router pages and API routes
    components/    # Shared UI components (NeonCard, GlitchText, etc.)
    lib/           # Content loading (content.ts)
  public/
    .well-known/   # AI agent discovery (ai-context.json)
  mcp/
    src/index.ts   # MCP server for context portfolio
    package.json   # Separate deps (@modelcontextprotocol/sdk)
  SPEC.md          # Living system spec (start here for changes)
  AGENTS.md        # Agent rules (Next.js, writing style)
  .mcp.json        # Claude Code MCP server config (project-scoped)
  Dockerfile       # Container build
  .github/
    workflows/
      deploy.yml   # CI/CD: build + deploy on push to main
```

## Deployment

Push to `main` triggers automatic deployment:

1. GitHub Actions builds the Docker image
2. Pushes to the shared Azure Container Registry `digitalillumination`
3. Updates the Azure Container App `ad-nav` (resource group `di-website`), then smoke-tests it

See `SPEC.md` (Infrastructure) for the detail.

## Spec-driven development

This repo uses a spec-driven approach. Read `SPEC.md` for the current system state and planned work. When making changes, update the spec first, then implement.

See `AGENTS.md` for agent-specific rules (Next.js version caveats, writing style requirements).
