---
title: Current Projects
description: >-
  What Adam is actively working on right now — day job priorities, personal
  projects, learning commitments, and what's deliberately on the back burner.
---

# Current Projects

## Top 3 Work Priorities (CtM)

These are the things that matter most right now, agreed at our most recent quarterly outcome forum.

### 1. Agent-First Delivery Transformation
The number one priority across the business. AI adoption isn't a side initiative — it's the strategic bet. My job is to land spec-driven, agent-first development across my engineering teams and build a model the rest of the org can adopt.

The long-term direction is moving toward **100% of code written by agents, with engineers at the architecture and verification layer**. Critically, this is not an AI-washing exercise or a headcount play — we're looking to retain and potentially grow the team. It does mean significant structural and role changes for existing engineers, and bringing them on that journey is one of the hardest and most important parts of the work.

### 2. New Product Verticals
Supporting the launch of new comparison verticals. My role is decision-making, escalation, unblocking, and sitting in working groups to make sure delivery stays on track and sponsor expectations are properly managed.

### 3. Partner Capability Expansion
Expanding platform capabilities to give partners more functionality and help retain long-term customer value. Same role as above: decision support, strategy, blocker removal, working group facilitation.

## Personal Projects

### PicoPouch
Agent-driven life admin and digital estate planning platform. Built on GCP/Firebase with six purpose-built agents (Ledger, Courier, Analyst, Controller, Oracle, Tella).

**Current state:** Alpha / private test. I'm using it with my wife — we're the primary testers. The MVP bar is "we can genuinely manage our life admin with it, and either of us can access everything if something happens to the other."

**Next milestones:**
- Expand to friends and family for feedback
- From there, think about marketing, positioning, and whether to take investment
- I have investor contacts who can help when the time comes — not decided yet

### Downton — Personal AI Agent Host
A Late 2018 Mac Mini I've turned into a dedicated personal agent host for the Stacey household, running [OpenClaw](https://openclaw.ai/) as the runtime and n8n as the orchestration layer.

**The agent roster** (all named after Edwardian household figures, because naming is half the fun):

| Agent | Role |
|-------|------|
| **Carson** | Orchestrator — routes tasks, monitors the others, handles anything unowned |
| **Florence** | Home and family logistics |
| **Isabella** | Meals and nutrition planning |
| **Jeeves** | Personal valet tasks |
| **Daisy** | Simple, repetitive tasks |
| **Luca** | Financial tracking |

**Current state:** Infrastructure is built — machine hardened, OpenClaw running as a boot service, Bitwarden vault structured, Google Workspace service account provisioned with domain-wide delegation, Telegram bot paired, web search and embeddings wired in. Full setup is documented in a private GitHub repo.

**Next up:** Finish the skill installs, get n8n running as a boot service, then build **Carson first** — define the personality and boundaries (`SOUL.md`), configure routing logic, and start layering the other agents in one at a time.

**Why it matters:** This is my sandbox for understanding agent orchestration, security, memory, and tool permissions from the ground up. Everything I learn here feeds directly into how I lead the agent-first transformation at CtM — I don't want to be leading something I haven't built myself.

### This Website (adamstacey.co.uk)
Rebuilding from WordPress to a custom Next.js site on GCP Cloud Run. Dual-purpose — human readable *and* agent-readable. Phase 1 complete (cyberpunk theme, all pages, blog pipeline, API routes, first context file). Currently in Phase 2: drafting the context portfolio (this file included).

### Level 7 AI & Data Science Apprenticeship
**Effectively complete** — all coursework, documentation, and reports are done. Final assessments in the next couple of weeks:

- **AM1 / AM2:** Project interviews walking through trade-offs and decisions on the automated partner mapping project
- **AM3:** Written test — how I'd solve a given problem using the methods from the course

Should be fully qualified within a month of this being written.

## Digital Illumination

Digital Illumination is my consultancy vehicle. Right now I'm using it for two things publicly:

- **PicoPouch build-out** — the infrastructure, agents, and ongoing development sit under Digital Illumination
- **Self-investment in agent tooling** — building out internal Claude Opus-based agents that support how I work, how I build, and how I evolve PicoPouch

There's also a longer-term product idea I'm shaping: **a standalone AI enrichment tool** that brings together the N8N workflows and Salesforce Lightning Web Component work I've been building — essentially a packaged capability for AI-driven record enrichment and RAG across CRM platforms. Not a current priority, but something I'd like to spin out into its own product when the time is right.

## On the Back Burner (Deliberately)

### Bike Boss
A bike-flipping side project with my son — fuelled by our shared mountain biking obsession. We invested in bikes to do up and resell, but between CtM, the apprenticeship, PicoPouch, and this site rebuild, I simply haven't had the time. Conscious decision to park it. Something we may pick up further down the line.

## What I'm Deliberately Saying No To

- **More Salesforce consultancy work.** My existing consulting relationships are shifting naturally away from Salesforce and into the AI space, and I'm not taking on new Salesforce-specific engagements. The future of my side work is agentic AI, workflow automation, and RAG-based enrichment — not pure Salesforce admin / developer work.

- MCP write path live 2026-04-17T14:25:40Z
