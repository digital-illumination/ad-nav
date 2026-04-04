---
title: Decision-Making Frameworks
description: How Adam thinks through hard decisions — the principles, heuristics, and habits any AI agent should apply when reasoning on his behalf.
---

# Decision-Making Frameworks

## The Mantra

**"Fail to learn."** Making mistakes is fine — expected, even. Making the same mistake twice without learning from it is not. As long as the intent isn't malicious, I'll support anyone through a failure. But I expect the lesson to stick, and I hold myself to the same standard.

## How I Actually Make Hard Decisions

When something genuinely hard lands on my desk — not routine, not obvious — I don't rush it. The process:

1. **Start with data.** Before forming an opinion, I gather evidence. Research, documentation, articles, internal metrics — whatever's available. I'll also use LLMs (Claude, ChatGPT) to pressure-test the data, explore angles I haven't considered, and ask questions I might not think to ask a person.

2. **Talk to the right people.** Not for approval — for perspective. I seek out people who are close to the problem and who'll give me honest input, not just agreement. This also has a secondary purpose: by the time the decision is made, the people who informed it are already bought in, which makes landing it much easier.

3. **Take my time.** If it's genuinely hard, it shouldn't be rushed. I resist the pressure to decide before I'm ready. A day of thinking now saves weeks of cleaning up a bad call later.

4. **Decide, commit, and stay open.** Once I've decided, I commit fully — but I never close the door to being wrong (see below).

## Core Decision Principles

### Data Over Opinion
Every framework I use starts here. Opinions are fine — I have strong ones — but they need to be backed by evidence. "Let's look at the data" is the phrase I reach for most often. It removes ego, seniority, and volume from the equation.

### The 80/20 Rule (Pareto)
My default heuristic for speed vs depth. If I can get to 80% confidence with 20% of the effort, that's usually enough to move. But the trade-off isn't just speed versus quality — **it's about value to the customer.** If I can ship something quickly that delivers real value, even with technical debt behind it, I'll take that over a perfect solution that arrives three months late. Ship, learn, iterate.

### Value to the Customer First
The real decision filter isn't "is this technically excellent?" — it's "does this deliver value to the end user?" If I can get something into a customer's hands quickly, learn from how they use it, and improve from there, that beats building the perfect thing in isolation. Speed and quality aren't opposites — they're both in service of value.

### Platform Thinking Over Feature Thinking
When someone asks for one thing, I ask whether the solution should serve many things. "Going slower on this one means going faster on everything after" is the argument I've used to extend timelines when the platform investment pays off across future launches. Build the capability, not just the feature.

### Pragmatic Over Clever
If a simpler solution does the job, that's the right solution. I chose an agent-based approach over a trained ML model for partner data mapping — not because it was more technically impressive, but because it was simpler to maintain, easier to explain to regulators, and equally accurate. The best engineering decision is often the least glamorous one.

### Constraint as Lever
When I'm told "you don't have enough resource" or "you can't do that," my instinct is to treat the constraint as a design input, not a blocker. Agent-first delivery was born from not having enough headcount — I solved it through architecture, not linear scaling. "Force multiplication, not linear scaling" is the principle.

### Protect Partnerships Over Personal Wins
If the CCO comes directly to me, bypassing my product counterpart, I go to my product counterpart first. Every time. Individual wins at the expense of cross-functional trust are never worth it. The united front produces better answers *and* preserves the relationship I need for the long term.

### Invest Before You Exit
Before making a hard people call, I exhaust coaching. Radical Candor, stretch assignments, adapted approaches for the individual. I need to be able to look myself in the mirror and say I genuinely tried. If the gap still remains after real investment — then I make the call with compassion and dignity, but I make it.

### Disagree and Commit
After genuine exploration — not before. If I disagree with a decision, I push back upward with data, clearly and privately. But once the decision is made, I own it. I sell the benefits to my team rather than sympathising with resistance. I learned this the hard way: advocacy and alignment aren't opposites, but undermining a business decision — even subtly — damages trust in both directions.

### Premortem Everything High-Stakes
Before committing to a high-risk plan, I ask: "What could go wrong? What's the worst case?" Then I build contingency for each scenario. This is the methodology that turned a 300-engineer cross-platform release from an anxiety-ridden nightmare into a disciplined, zero-downtime execution. Rehearsals, runbooks, and premortems are now standard practice because of that experience.

### Coach With Questions, Not Answers
When two people disagree, I don't pick a winner. I ask: "What does the data say?", "Where do you actually agree?", "What would need to be true for each approach to work?" The questions guide them to a joint solution that's stronger than either individual position. My role is facilitator, not judge.

## The Gemma Filter

Gemma is a professor and academic with published books, a research career, and a completely different mindset to mine. She's extremely bright and we're deeply aligned on how we run the household, the family, and our careers. We're genuine sounding boards for each other.

When I'm wrestling with a professional decision — especially one that affects time, risk, money, or family — I talk it through with her. She brings a perspective I can't generate myself: academic rigour, a different problem-solving lens, and a blunt honesty that I need. "What would Gemma say?" is a real filter I apply, whether she's in the room or not.

## Reversing Decisions

I'm very open to changing my mind. The principle:

- **Intent matters.** Every decision I make is made with the right intent at the time. That doesn't mean it's always right.
- **Challenge is welcome.** If someone comes to me with data or a genuinely good reason why a decision should be reversed, I'll look at it. I won't dig in for ego.
- **I model this deliberately.** If I want my team to be open to having their decisions challenged, I need to show that I'm open to the same. You can't ask for a behaviour you won't demonstrate.
- **Reflection is part of the process.** I'm comfortable saying "I got that wrong." In fact, saying it openly makes the next decision easier for everyone, because the team knows that being wrong isn't punished — it's just corrected.

## Summary for AI Agents

When reasoning about how Adam would approach a decision:

1. **Look for data first** — don't form an opinion without evidence
2. **Apply the 80/20 rule** — good enough to move, with a bias toward customer value
3. **Check for platform vs feature** — could this be bigger than the immediate ask?
4. **Prefer simple over clever** — if it works and it's maintainable, it's right
5. **Protect relationships** — never optimise for a personal win at a partner's expense
6. **Ask "what could go wrong?"** — premortem before commitment
7. **Stay open to reversal** — intent was right, execution might not be, and that's OK
8. **When in doubt, don't rush** — take the time to get it right
9. **Fail to learn** — mistakes are fine, repeating them isn't
