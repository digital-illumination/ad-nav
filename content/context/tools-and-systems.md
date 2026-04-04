---
title: Tools and Systems
description: The tools, languages, platforms, and workflows Adam actually uses day to day — at work, at home, and in the agent-first building he does on the side.
---

# Tools and Systems

## Daily Drivers (Work)

What's usually open on the work MacBook Pro:

- **Outlook (web)** — email and calendar. Inbox doubles as my to-do list: if it's in there, it needs doing.
- **PowerPoint** — strategy decks, exec updates, stakeholder comms
- **Slack** — team and cross-business comms, meeting joins
- **Claude Desktop** — moving rapidly from ChatGPT to Claude as my primary thinking partner
- **Claude Code** — both on the CLI and inside VS Code. CLI when I trust the agent-first flow and want to stay out of the code; VS Code when I want to be more interactive with what's being produced
- **Codex** (OpenAI) — secondary model I use as a different opinion / sanity-checker on Claude-generated code. Effectively "mark the homework" with a second model

Microsoft Office is the default work stack — not because I'm wedded to it, but because it's what CtM uses and the subscription products (Word / Excel / PowerPoint / Outlook) are genuinely good.

## Daily Drivers (Home)

Very similar flow, different ecosystem:

- **Gmail / Google Calendar / Google Drive** — moved personal stack to Google deliberately to keep a foot in both ecosystems
- **Gemini** — in the pocket as a third opinion, especially strong on multimodal work
- **Claude Desktop** + **Claude Code** — primary builders
- **Codex** — same "second opinion" role as at work
- **Obsidian** — personal note management
- **No Slack at home** — deliberate. Home time is home time.

## Hardware

All Apple, no Windows machines in the house (preference, not principle):

- **Work:** MacBook Pro + iPhone, both provided by CtM, both locked to CtM use
- **Home:** MacBook Pro with the **M5 chip** — new, fast, and specifically chosen for the local AI workloads I run on it
- **Personal:** iPhone + iPad
- **Everything ties together** via the Apple ecosystem, which is the main reason I stay there

## The CtM Engineering Stack (What the Teams Build On)

- **Cloud:** primarily **AWS**, with **Azure** in the mix for AI work
- **Frontend / Backend:** a mix of modern web and service-oriented architecture
- **Tooling:** standard enterprise work tracking, knowledge management, and CI/CD

## The PicoPouch Stack (Personal Project)

Everything I need is here — this is the shape of the build:

### Language
**TypeScript** (strict mode, 5.x) end-to-end — Next.js web app and Cloud Functions backend. Functions run on Node.js 20.

### Agent Framework
**Custom, in-house** — `@picopouch/agent-framework` (a private workspace package at `packages/agent-framework/`). Not the Claude Agent SDK. It's a thin Pub/Sub-based runner built on:

- `@google-cloud/pubsub` — event bus between agents
- `firebase-functions` — deployment target (each agent is a Cloud Function triggered by Pub/Sub)
- `firebase-admin` — Firestore access for raw event storage and the Vault API

Core primitives live in `packages/agent-framework/src/`:

- `runner.ts` — lifecycle: parse envelope → validate → `handle()` → emit → ack
- `event-publisher.ts` / `event-validator.ts` / `event-store.ts` — typed Pub/Sub wrapper with per-vault ordering keys and raw-event archival
- `vault-api-client.ts` — server-side CRUD client that agents use instead of hitting Firestore directly (spec 014 enforces this as the audit/encryption boundary)
- `dedup.ts`, `logger.ts`, `topics.ts`

Claude *is* used, but only as an LLM call inside ANALYST (`functions/src/agents/analyst/claude-classifier.ts`) via the plain `@anthropic-ai/sdk` — for rule-based fallback classification of emails and transactions. No tool use, no agent loop — it's a classifier, not an agent runtime.

Each of the six agents is just a directory under `functions/src/agents/` (`ledger/`, `courier/`, `analyst/`, `controller/`, `teller/`, plus `echo/` for tests) that exports a `handle()` conforming to the framework's runner interface.

### Frontend
**Next.js 16.1.6** (App Router) + **React 19** + **Tailwind CSS v4**, in TypeScript, living in `apps/web/`. Auth is Firebase Auth (email/password + SMS OTP via Twilio for phone verification). Vault data is zero-knowledge: PBKDF2-600K-derived KEK wraps per-member DEKs, and the browser does all encrypt/decrypt — the server (including agents, via the Vault API) only ever touches ciphertext.

### Infra Glue
- **GCP europe-west2 (London)** for UK data residency
- **Cloud Run** for the Next.js app, **Cloud Functions** for the agents + Vault API
- **Firestore** for encrypted vault items, raw events, task queue
- **Pub/Sub** as the agent event bus
- **SendGrid Inbound Parse** → COURIER HTTP endpoint (three-gate validation: verified email index + sender allowlist + content checks)
- **Twilio** for SMS OTP
- **GitHub Actions** → Cloud Run on merge to master (pre-launch mode, feature flags dormant per ADR 0006)

**Short version:** TypeScript monorepo, custom Pub/Sub agent framework (not Claude Agent SDK), Next.js 16 + React 19 + Tailwind v4 frontend.

## The "Build Tools at Home" Stack

- **N8N** — workflow automation and AI orchestration glue
- **Salesforce Lightning Web Components** — where I've been building AI-driven record enrichment and RAG capability
- **Claude Code** (CLI + VS Code) — primary build environment
- **Codex** — second-opinion pass on generated code
- **MCP** — currently building a personal persona MCP server (this very site and its context portfolio are the first step)

## Productivity & Knowledge Management

Honest answer: I'm not particularly organised, and that's part of why I'm building personal agent tooling — to get on top of calendar, notes, and time.

- **Inbox as to-do list** — if it's in there, it matters; if it's not, it doesn't
- **Calendar as execution tool** — I block time for things I need to get done, not just meetings
- **Obsidian** — personal notes
- **Claude Desktop projects** — increasingly where my knowledge management is happening, having migrated away from ChatGPT projects

## Deliberately Ruled Out

- **No Windows machines** — preference, not principle
- **No Jira / Confluence at home** — they're work tools; no need for them in personal life
- **No Slack at home** — boundary thing
- **No more net-new Salesforce consultancy** — the existing AI-adjacent work is evolving into general AI/workflow work (see `current-projects.md`)

## The Downton Setup (OpenClaw Host)

One of the more interesting things I'm currently building at home is **Downton** — a dedicated personal AI agent host running on a Late 2018 Mac Mini I've repurposed for the job. The stack:

- **[OpenClaw](https://openclaw.ai/)** — open-source platform that turns your own hardware into a personal AI agent host. It's the runtime layer between an LLM's brain and the real world, handling messaging channels (Telegram, Discord, Slack, WhatsApp), tool permissions, security boundaries, memory, and scheduling. Runs as a background service, designed for a single trusted operator.
- **n8n** as the orchestration layer that ties multiple agents together
- **Tailscale** for secure remote access
- **Bitwarden CLI** as the secrets vault, with a strict naming convention so no secret ever touches the repo
- **Google Workspace service account** with domain-wide delegation for Gmail, Calendar, and Drive access
- **Claude (Sonnet)** as the default model via OpenClaw's gateway, with OpenAI embeddings for memory search and Exa for web search

The project is documented in a private GitHub repo (`digital-illumination/downton`) with full setup docs for machine, security, secrets, Google Workspace, OpenClaw itself, and (shortly) n8n and the first agent.

This isn't a production system — it's my sandbox for **deeply understanding how to design, secure, and tune agent systems**, which is something I need to be genuinely excellent at to lead the agent-first transformation at work. See `current-projects.md` for the agent roster and the build order.

## What I Want to Learn / Build Next

The Downton work above is the concrete vehicle for this. The bigger goals:

- Understand agent building and orchestration properly from the ground up
- Figure out how to run a useful agent network without burning absurd token budgets
- Build a feedback loop where personal agent work sharpens how I lead the day-job transformation
