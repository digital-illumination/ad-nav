import type { Metadata } from "next";
import { getContextFiles } from "@/lib/content";
import NeonCard from "@/components/NeonCard";
import GlitchText from "@/components/GlitchText";

export const metadata: Metadata = {
  title: "Context Portfolio",
  description:
    "Machine-readable personal context portfolio for AI agents and MCP integrations. Structured data about Adam Stacey.",
  alternates: { canonical: "/context" },
};

export default function ContextPage() {
  const files = getContextFiles();

  return (
    <div className="page-transition py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-mono text-neon-cyan mb-4 tracking-widest uppercase">
            // context_portfolio.md
          </p>
          <GlitchText
            text="Agent Context"
            as="h1"
            className="text-4xl sm:text-5xl font-mono font-bold neon-text-purple mb-4"
          />
          <p className="text-text-secondary font-mono max-w-2xl mx-auto">
            Personal context portfolio: structured data about who I am, how I
            work, and what I care about. Designed for both humans and AI agents.
          </p>
        </div>

        {/* API Info */}
        <NeonCard className="mb-8" animated>
          <h2 className="text-lg font-mono font-bold text-neon-cyan mb-3">
            // rest_api
          </h2>
          <p className="text-sm text-text-secondary mb-4">
            AI agents and MCP clients can access this context programmatically:
          </p>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex flex-col sm:flex-row items-start gap-2">
              <span className="text-neon-pink shrink-0">GET</span>
              <code className="text-neon-cyan">/api/context</code>
              <span className="text-text-dim">// List all context files</span>
            </div>
            <div className="flex flex-col sm:flex-row items-start gap-2">
              <span className="text-neon-pink shrink-0">GET</span>
              <code className="text-neon-cyan">/api/context/identity</code>
              <span className="text-text-dim">// Get a specific file</span>
            </div>
            <div className="flex flex-col sm:flex-row items-start gap-2">
              <span className="text-neon-pink shrink-0">GET</span>
              <code className="text-neon-cyan">
                /.well-known/ai-context.json
              </code>
              <span className="text-text-dim">// Agent discovery</span>
            </div>
          </div>
        </NeonCard>

        {/* MCP Server */}
        <NeonCard className="mb-8" animated>
          <h2 className="text-lg font-mono font-bold text-neon-cyan mb-3">
            // mcp_server
          </h2>
          <p className="text-sm text-text-secondary mb-4">
            The MCP server exposes my full context portfolio to any
            MCP-compatible client. Any agent can call{" "}
            <code className="text-neon-purple">get_full_context</code> and
            understand who I am before writing a single line.
          </p>

          {/* Tools */}
          <h3 className="text-sm font-mono font-bold text-neon-purple mb-2">
            tools
          </h3>
          <div className="space-y-2 font-mono text-sm mb-5">
            <div className="flex flex-col sm:flex-row items-start gap-2">
              <code className="text-neon-cyan shrink-0">
                list_context_files
              </code>
              <span className="text-text-dim">
                // List all files with titles and descriptions
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-start gap-2">
              <code className="text-neon-cyan shrink-0">search_context</code>
              <span className="text-text-dim">
                // Full-text search across all context files
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-start gap-2">
              <code className="text-neon-cyan shrink-0">get_full_context</code>
              <span className="text-text-dim">
                // Load entire portfolio as one document
              </span>
            </div>
          </div>

          {/* Resources */}
          <h3 className="text-sm font-mono font-bold text-neon-purple mb-2">
            resources
          </h3>
          <div className="font-mono text-sm mb-5">
            <div className="flex flex-col sm:flex-row items-start gap-2">
              <code className="text-neon-cyan">
                {"context://adam-stacey/{filename}"}
              </code>
              <span className="text-text-dim">// Individual context file</span>
            </div>
          </div>

          {/* Setup */}
          <h3 className="text-sm font-mono font-bold text-neon-purple mb-2">
            setup
          </h3>
          <p className="text-xs text-text-dim mb-3">
            Works with any MCP-compatible client: Claude Code, Claude Desktop,
            Cursor, Windsurf, Cline, Continue, and others.
          </p>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-mono text-text-dim mb-1">
                // Claude Code (auto-loaded from .mcp.json in repo root)
              </p>
              <pre className="text-xs font-mono bg-black/40 rounded-lg p-3 overflow-x-auto border border-border-glow">
                <code className="text-text-secondary">
                  {`{
  "mcpServers": {
    "adam-stacey-context": {
      "command": "node",
      "args": ["\${PROJECT_ROOT}/mcp/build/index.js"]
    }
  }
}`}
                </code>
              </pre>
            </div>
            <div>
              <p className="text-xs font-mono text-text-dim mb-1">
                // Claude Desktop (add to claude_desktop_config.json)
              </p>
              <pre className="text-xs font-mono bg-black/40 rounded-lg p-3 overflow-x-auto border border-border-glow">
                <code className="text-text-secondary">
                  {`{
  "mcpServers": {
    "adam-stacey-context": {
      "command": "node",
      "args": ["/path/to/ad-nav/mcp/build/index.js"]
    }
  }
}`}
                </code>
              </pre>
            </div>
            <p className="text-xs text-text-dim font-mono">
              // Build first: cd mcp &amp;&amp; npm install &amp;&amp; npm run
              build
            </p>
          </div>
        </NeonCard>

        {/* Context Files */}
        {files.length === 0 ? (
          <NeonCard className="text-center">
            <p className="text-text-secondary font-mono">
              <span className="text-neon-cyan">&gt;</span> Context portfolio
              files are being drafted...
              <br />
              <span className="text-text-dim text-sm">
                The 10 context files will be available here soon.
              </span>
            </p>
          </NeonCard>
        ) : (
          <div className="space-y-6">
            {files.map((file, index) => (
              <div
                key={file.filename}
                style={{
                  animation: `contact-card-enter 0.5s ease-out ${index * 80}ms both`,
                }}
              >
                <NeonCard>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-mono font-bold text-neon-purple">
                        {file.title}
                      </h3>
                      <p className="text-xs font-mono text-text-dim">
                        {file.filename}.md
                      </p>
                    </div>
                    <a
                      href={`/api/context/${file.filename}`}
                      className="text-xs font-mono text-neon-cyan border border-neon-cyan/30 px-2 py-1 rounded hover:bg-neon-cyan/10 transition-colors"
                    >
                      raw
                    </a>
                  </div>
                  {file.description && (
                    <p className="text-sm text-text-secondary mb-4">
                      {file.description}
                    </p>
                  )}
                  <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap font-mono bg-black/30 rounded-lg p-4 max-h-60 overflow-y-auto">
                    {file.content}
                  </div>
                </NeonCard>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
