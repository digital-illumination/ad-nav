---
title: "What Downton Taught Me About Agents (That a SaaS Wouldn't)"
date: "2026-05-26"
excerpt: "I bought a Mac Mini and turned it into a Downton Abbey of agents. The point wasn't a smarter house. It was that the only way I was going to understand how agents actually work was to run them on my own metal."
tags: ["AI Agents", "OpenClaw", "Personal Projects", "Self-Hosted", "Architecture"]
image: "/images/blog/downton-openclaw-what-agents-actually-are.jpg"
---

## A House Full of Servants

A few weeks ago I bought a Late 2018 Mac Mini, named it `downton.local`, and started turning it into a personal agent host for the Stacey family. The agents share names with Edwardian household staff: Carson the butler, Sotheby the auctioneer, Florence the housekeeper, Isabella the cook, Jeeves the valet, Daisy the kitchen maid, Luca the footman. They live on the Mini, run under a service account called `downton`, and answer through Telegram.

This is not, despite appearances, a joke about a TV show. The metaphor is doing work.

## The Question Behind the Mac Mini

I spend my day-job time on agent-first technology, and I have written before about [building this site with agents](/blog/building-this-site-with-agents) and about [serving my own context through an MCP server](/blog/building-mcp-server-personal-context). I have shipped enough agent-flavoured things to call myself fluent. But fluent in what, exactly? Most of what I knew about agents I knew through SaaS abstractions. The agent answered, and a lot of the interesting bits happened somewhere I could not see.

I wanted to see them.

The cheapest way to see them was to put a host I owned on a shelf I owned, run the agent runtime myself, and watch what actually happened when a message hit the gateway. That is Downton. The Mini is small enough to sit unobtrusively next to the router, and old enough that I do not feel precious about it. macOS Sequoia, Node 22, a single service account, Tailscale for remote SSH, Bitwarden for every secret that touches the box. The substrate is mine.

## Why OpenClaw

I picked OpenClaw as the runtime. The choice was less about "best framework" and more about what I needed to learn.

OpenClaw is a self-hosted agent host. It binds a gateway to loopback (`127.0.0.1:18789`), reads agent identity from on-disk SOUL files, brokers model calls with auth profiles I configure, ships with around fifty skills, and runs as a LaunchAgent under my service account. I can see the config. I can see the logs. I can grep for the token. When a Telegram message arrives, I can trace it from the bot, through the channel handler, through the session-memory hook, through the model call, and back out.

That visibility is the point. It is also the reason a hosted agent platform would have been the wrong choice for this project: the bits I needed to see were the bits a hosted product would, sensibly, hide.

A few specifics turned out to matter more than I expected.

**SOUL files as the agent's identity.** A SOUL file is the persona, the boundaries, the routing logic, and the voice rules, all written as Markdown. The agent is, in effect, "a Sonnet 4.6 with this file loaded as its system prompt and this allowlist of tools." That is a much smaller and more concrete artefact than I had in my head when I thought "AI agent." Adam-writes-a-Markdown-file-and-now-the-agent-is-Carson is a stack you can reason about.

**Tools as an explicit allowlist.** OpenClaw has a default tools profile called `coding` that gives an agent a wide surface (exec, file, web). Carson does not want any of that. Carson is a messaging agent who dispatches. So Carson runs with a `messaging` profile and a narrow allowlist. The shape of an agent's capability is a list I can read, not an opinion baked into the framework.

**Hooks I can read.** The `session-memory` hook embeds every session turn and stores it for retrieval. The hook is a file. I can open it. When I want to know what Carson "remembers" about a peer, I look at `~/.openclaw/agents/carson/sessions/sessions.json` and read it. There is no magic.

None of this is unique to OpenClaw. Other runtimes do the same things. But OpenClaw gave me a host where the abstractions stopped at a layer I could see, and that turned out to be the thing I was paying for.

## The Edwardian Metaphor (Yes, It Earns Its Keep)

Every agent in Downton has a job, a title, and an old-fashioned name. Carson is the butler. Sotheby is the auctioneer. Florence runs the house. Isabella cooks. Jeeves looks after personal valet jobs. Daisy handles small repetitive things. Luca tracks money.

The temptation is to dismiss the whole conceit as theming. It is more useful than that.

The metaphor forces three things I would otherwise have hand-waved.

**One job per agent.** A butler does not also cook. A cook does not also iron shirts. If I find Carson doing Florence's work, that is a bug, not a feature. Naming the agents after roles with sharply defined Edwardian duties makes role drift obvious.

**One face to the user.** In an Edwardian household, you do not chase the cook around for breakfast. You ring the bell, and the butler decides what to do. Carson is the only agent wired to inbound Telegram. Everything else receives work from him. There is one front door.

**Dispatch as a real contract.** A butler tells a specialist what to do, and the instruction has a shape. In Downton, dispatch is an "intent record" with an id, an origin, an agent, an intent name, a payload, a confidence score, and a rationale. It goes over a webhook to n8n. It is auditable. It is the actual mechanism by which work moves through the house.

Without the metaphor, I would have written all of this as "the orchestrator routes tasks to specialists" and called it design. With the metaphor, the design is concrete enough that I noticed when Carson started overstepping inside the first week of running.

## The Three Tiers in the Repo

The Downton repo has three top-level folders: `specs/`, `docs/`, and `agents/`. I have been disciplined about not letting them blur.

`specs/` is what the system should do. Versioned, reviewed, source of truth for intent. The Carson spec is currently at version 0.2.9. The Sotheby spec is at 0.3.6. Every behavioural change to either agent has a numbered version in the change log explaining why.

`docs/` is how to set it up and operate it. Numbered runbooks, `01-machine-setup.md` through `11-sotheby-ebay.md`. If I lose the Mini and have to rebuild on new hardware, the docs are what gets me back online.

`agents/` is the runtime. SOUL files, n8n workflow exports, the actual content the host loads.

The order matters. Change the spec first, then the runbook, then the runtime. I broke this rule exactly once, two weeks in. A session started against a stale local main, did not notice the real work was on a branch in a worktree, and rebuilt half a session on the wrong base before the divergence surfaced. The fix was a session-hygiene rule at the bottom of `AGENT.md` (end every session with a git status, a worktree list, and a check that the Mini matches origin/main). The fix was also: respect the tiers.

## What I Did Not Expect

Most of "building agents" is writing boundaries.

I came in expecting the work to be model selection, prompt engineering, and skill integration. There is some of that. But the part that actually decides whether the system behaves is the boundaries section of each agent's spec. Carson's boundaries list runs to fifteen items and growing. Carson never executes specialist workflows. Carson never claims an action succeeded without a tool result that confirms it. Carson never dispatches a correction down the create path. Carson never reveals the gateway token in a reply.

Each of those is there because something went wrong, or could go wrong, and a numbered constraint is the only thing that stays in the agent's context window through a long session. The model is fine. The contracts are the work.

I will write up the Carson story in the next post. He is the most-running agent so far, and he is also the agent who has taught me the most. Including the day he confidently told me he had done three things he had not.

## Three Things I Took Away

**You can only learn the host by running the host.** Every layer that was hidden behind a SaaS abstraction is a layer I was not learning. Bringing the runtime home is expensive in evenings and cheap in fees, and the evening cost is exactly the thing that paid the learning. If you want to know how agents work, run one on a box you control.

**Pick a runtime that stops abstracting where you want to see.** OpenClaw was not "the best agent runtime" in any abstract sense. It was the runtime whose abstractions stopped at the right layer for me. The SOUL files are readable. The tool surface is a list. The hooks are files. None of that is exotic. It is just visible, and visible is what I needed.

**The metaphor is doing work, not decorating.** Naming the agents after a household forced one job, one face, one contract per role. The same architecture written as "orchestrator plus specialists plus dispatch table" would have let me skip the part where I noticed when Carson started cooking. I would not have noticed. The butler was the part that made the bug visible.

Downton is small, slow, and held together by my evenings. It is also the only project I have ever shipped where I could draw the entire stack on the back of an envelope and have every layer be a thing I actually understood. That, more than anything Carson or Sotheby do for me, is what I wanted from it.

The next post is Carson's. After that, Sotheby. After that, the rest of the house as it gets built.
