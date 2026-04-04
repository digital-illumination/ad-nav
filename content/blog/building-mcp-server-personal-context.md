---
title: "I Built a Personal MCP Server in Twenty Minutes"
date: "2026-04-13"
excerpt: "My site already served context to agents via API. But APIs are push. MCP is pull. Twenty minutes and 289 lines of TypeScript later, any MCP-compatible agent can know who I am without being told where to look."
tags: ["MCP", "AI Agents", "Claude Code", "TypeScript", "Personal Projects"]
image: "/images/blog/mcp-server.jpg"
---

## The Context Portfolio Had a Delivery Problem

Last week I wrote about building this site with agents, and about the context portfolio that sits behind it: ten structured markdown files covering who I am, how I think, what I know, and how I work. Those files are served through API routes at `/api/context`, available to any agent that asks.

The problem is that asking requires knowing where to look.

An agent hitting my API needs the URL, needs HTTP access, and needs someone to tell it the URL exists. That's fine for an external agent doing research. It's terrible for the agent sitting in my terminal right now, working on my code, that should already know who I am.

## Push vs Pull

The API is a push model. Content sits on a server, waiting to be discovered. MCP flips that. The agent's host connects to an MCP server at startup and pulls context on demand. No URLs. No HTTP.

Before MCP, I had three alternatives for giving local agents my context. All of them were bad.

**Copy-paste into every conversation.** Doesn't scale. Goes stale. Burns context window on the same ten files every time.

**Tell the agent the URL each time.** Wastes a turn, requires HTTP access from the agent's environment, and you have to remember to do it. I forgot approximately 100% of the time.

**Dump everything into CLAUDE.md.** Tempting. But CLAUDE.md is for project-specific instructions, not personal identity. Dropping my full context portfolio into every repo would bloat every project with content most tasks don't need.

MCP fixes all three. The agent's host registers the server once. Every session after that has access. The agent decides what to pull based on what it needs.

## What I Built

A single TypeScript file. 289 lines including the usage logging I added seven minutes after the first commit.

The server lives in `mcp/` inside the same repo as the site. Not a separate package, not published to npm. It reads from `content/context/` in the repo root, the same markdown files the API serves. One source of truth, two delivery mechanisms.

Three decisions, each made in about thirty seconds:

**stdio, not HTTP.** This server runs locally. Claude Code launches it as a subprocess and talks to it over stdin/stdout. The host handles the connection. If I ever need remote access, that's what the API routes are for.

**Resources and tools, not one or the other.** MCP has two ways to expose content: resources (the agent reads them) and tools (the agent calls them). I used both. A template resource lets agents read individual files by URI (`context://adam-stacey/identity`), while three tools handle listing, searching, and loading the whole portfolio in one call.

**zod for schemas, gray-matter for frontmatter.** The MCP SDK uses zod for tool parameter validation. gray-matter parses the YAML frontmatter from each markdown file. Both were already in my muscle memory from the site itself.

The server setup is unremarkable, and that's the point. A `McpServer` instance, a `ResourceTemplate` with a list callback, three tool definitions with async handlers, and a `StdioServerTransport` to wire it all together. Most of the code is the tool handlers, which are just "load files, filter, format, return."

## The Gotchas Were More Interesting Than the Code

Four things bit me. None were in the documentation.

**`console.log` breaks everything.** stdio transport means stdout *is* the JSON-RPC channel. Any `console.log` in your server code injects garbage into the protocol stream, and the client silently fails. Every log statement needs to be `console.error`. I spent longer debugging this than writing the server, which says something about the server's complexity and something less flattering about my debugging instincts.

**ESM has no `__dirname`.** The SDK requires ES modules. ES modules don't have `__dirname`. You need the `fileURLToPath(import.meta.url)` workaround to get back something Node gave you for free in CommonJS:

```typescript
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

**zod is a phantom dependency.** The MCP SDK uses zod internally for tool schemas but doesn't declare it as a dependency in its own `package.json`. Your server compiles fine. Then crashes at runtime. The fix is adding zod to your own dependencies, but the error message points you elsewhere first.

**Import paths need `.js` extensions.** The compiled output is JavaScript, and Node's ESM resolver requires the full extension. So your TypeScript imports look like this:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
```

You're writing `.js` in a `.ts` file, pointing at a path that doesn't exist yet when you write the code. TypeScript handles it fine. Your instincts won't.

## Testing Without a Framework

No Jest. No Vitest. MCP runs on JSON-RPC over stdio, so testing is just piping JSON into the process:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_context_files"}}' \
  | node build/index.js
```

Get JSON back, it works. Get an error, read the error. I'm not pretending this is a mature testing strategy, but for a server whose entire job is reading markdown files from a folder, it told me what I needed to know.

## Registering It

MCP is an open protocol. Any compatible client can connect: Claude Code, Claude Desktop, Cursor, Windsurf, Cline, Continue, and others. I use Claude, so those are the examples here.

For Claude Code, a `.mcp.json` file in the project root:

```json
{
  "mcpServers": {
    "adam-stacey-context": {
      "command": "node",
      "args": ["${PROJECT_ROOT}/mcp/build/index.js"]
    }
  }
}
```

Every Claude Code session in this repo now launches the server as a subprocess and gets my full context portfolio. No setup per session. No "remember to load the context." It's just there.

Claude Desktop takes the same config shape in a different file. I added it to `~/Library/Application Support/Claude/claude_desktop_config.json` and restarted. Desktop can now pull my context from any conversation, not just ones working on this repo.

## The Follow-Up: Usage Logging

Seven minutes after committing the server, I wanted to know who was actually calling it. So I added logging.

Every tool call, resource read, and connection writes a line to `~/.adam-stacey-context/usage.log`:

```
2026-04-12T18:26:00.000Z | claude-code | tool:list_context_files
2026-04-12T18:26:01.000Z | claude-code | tool:get_full_context
```

The client identity comes from `server.server.getClientVersion()`, which returns the connecting client's name after the MCP handshake. The catch: client info isn't available when the server starts, only after the handshake completes. So I wrote a lazy resolver that tries once per log call and caches the result when it gets a real answer.

```typescript
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
```

Not elegant. Works fine. The first log entry says "unknown" and every subsequent one says "claude-code" or "claude-desktop." Good enough for usage analytics on a personal project.

## Twenty Minutes

The git timestamps tell the story. First commit with the full MCP server at 18:19. Usage logging at 18:26.

Twenty minutes is not a boast. It's the point. MCP servers are *small*. The protocol does the heavy lifting. Your server just points at content and describes what tools an agent might need. If your MCP server is getting complicated, you're probably solving the wrong problem.

## What It Enables

Any MCP-compatible agent session can now call `get_full_context` and understand who I am before writing a single line. It knows my communication style before drafting an email. It knows my decision-making frameworks before suggesting an approach. It knows my team structure, my current projects, my preferences and constraints.

That's the difference between an agent that writes generic output and one that writes output *for me*. Between a draft that sounds like a chatbot and one that sounds like a British technology leader with opinions about stakeholder visibility and a habit of structuring arguments in threes.

The API serves external agents. The MCP server serves local ones. Same ten markdown files, two interfaces, any client that speaks the protocol. The whole thing is 289 lines of TypeScript reading content from a folder.

If you have structured context about yourself and you work with AI agents regularly, building an MCP server is a short evening's work. Mine took twenty minutes because the content already existed and the decisions were straightforward. The hardest part was the `console.log` bug.

Build the context first. The plumbing is the easy bit.
