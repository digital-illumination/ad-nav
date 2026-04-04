---
title: "I Built This Site With Agents"
date: "2026-04-05"
excerpt: "My family calls me 'Ad-Nav' because I always navigate my way out of anything. This site, a cyberpunk-themed, agent-readable portfolio built with AI agents, is the latest navigation exercise."
tags: ["AI Agents", "Claude Code", "Next.js", "Personal Projects"]
image: "/images/blog/building-with-agents.jpg"
---

## The Problem With WordPress

I'd been running a WordPress site for years. It did the job. Barely. Every update was a gamble, every plugin a potential security hole, and the whole thing felt like maintaining a listed building when I wanted a spaceship.

But the real problem wasn't WordPress itself. My site was built for one audience: humans. And I increasingly live in a world where the most important reader might be an AI agent. One evaluating whether I'm worth talking to, or preparing a briefing before a meeting, or trying to understand how I think before working with me.

My personal site needed to work for people *and* for machines. WordPress wasn't going to cut it.

## The Stack

**Next.js, React 19, Tailwind CSS, deployed on GCP Cloud Run.** Markdown files for content, parsed with gray-matter and rendered at build time. API routes that serve the same content as structured data for any agent or MCP client that asks for it.

The cyberpunk theme was a deliberate choice. I've always loved the aesthetic: neon on dark, monospace fonts, glitch effects, the whole lot. When you're building a site about AI agents and digital transformation, leaning into that visual language just *feels* right. And it gave me an excuse to name CSS variables things like "neon-purple" and "neon-cyan," which brought me more joy than it probably should have.

## The Secret: I Didn't Build It Alone

Here's the honest bit: the vast majority of this site was written by Claude Code.

Not "assisted by." Not "with suggestions from." *Written by.* I described what I wanted, the pages, the components, the theme, the API routes, and the agent built it. I reviewed, directed, course-corrected, and made architectural decisions. But the implementation was the agent's job.

This is exactly the model I'm advocating for at work: **engineers at the architecture and verification layer, agents handling the implementation.** Building this site was a proof point for myself that the model works. Not just for enterprise engineering teams. For one person with a laptop and an evening free.

The build took a fraction of the time it would have taken me to hand-code. And because I was freed from the implementation detail, I spent that time on what actually matters: the content, the architecture, and the decisions about what this site should *be*.

## The Context Portfolio

This is the part I'm most proud of, and probably the part that needs the most explaining.

Hidden behind the human-readable pages is a **context portfolio**, a set of structured markdown files that describe who I am, how I think, what I know, and how I work. They're served via API routes, available to any AI agent that wants to understand me before engaging.

Think of it as a CLAUDE.md file for your entire professional identity.

The files cover identity, communication style, domain knowledge, decision-making frameworks, current projects, goals, team shape, tools and systems, and working preferences. Each one is written to be useful to an AI agent, not a marketing exercise, but an honest, detailed context file that helps an agent work with me well.

Why bother? Because in an agent-first world, **the quality of what an agent does for you depends directly on the quality of context it has about you.** A generic LinkedIn profile gives an agent almost nothing to work with. A detailed context portfolio gives it everything it needs. Whether that's drafting an email in my voice, preparing for a meeting with my stakeholders, or understanding the trade-offs behind a decision I need to make.

The site is dual-purpose: human-readable for people, machine-readable for agents. Same content, both interfaces.

## What Agents Are Good At (Honest Version)

After building this site end to end with AI agents, here's where I landed.

**What worked brilliantly:**

- **Scaffolding.** Setting up the project, the file structure, the routing, the API endpoints. All the boilerplate that takes a human twenty minutes of copy-paste happened in seconds.
- **Component development.** I described "a card with a neon border, glass morphism background, and a subtle glow on hover" and got exactly that. First try.
- **Styling.** I said "cyberpunk, neon on dark, scanline overlay, glitch text animations" and it turned that into actual CSS. Honestly, this was impressive.
- **Repetitive patterns.** Ten context API routes that all follow the same shape. Write one, describe the pattern, done.

**What needed a human at the wheel:**

- **Architecture.** Which pages to build, what the navigation should be, how content is structured. The agent never once said "actually, you don't need that page." That's your job.
- **Voice and tone.** The agent writes well, but it doesn't write like *me* without significant direction. Every blog post and context file needed heavy steering to sound like a person, not a press release.
- **Knowing when to stop.** Agents will happily keep adding features, refactoring components, and "improving" things forever if you let them. Saying "that's enough, ship it" is a human skill.
- **The hard decisions.** Should this site have a context portfolio at all? Is that weird? Is it useful? Is it both? Those are judgment calls that no agent should be making for you.

**Agents handle implementation, humans handle intent.** That's the split, and it works.

## Why This Matters Beyond a Personal Site

Anyone with a professional identity is going to need to think about how they present themselves to AI agents. Not in five years. Now.

When a recruiter's AI agent scans your profile, what does it find? When an agent is preparing a briefing about you before a meeting, what can it actually use?

A PDF CV and a LinkedIn profile are table stakes. A machine-readable context portfolio is the next layer, and building one is something you can start today.

This site is my proof point. It's live, it works, and it was built almost entirely by the very technology it's about.

My family calls me "Ad-Nav" because I always find a way to navigate out of anything. This time, I let my agent do the navigating.
