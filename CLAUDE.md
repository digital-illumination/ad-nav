@SPEC.md
@AGENTS.md

# Working on this repo

1. Read `SPEC.md` first. It describes the full system: pages, APIs, content, infrastructure, and planned work.
2. Read `AGENTS.md` for Next.js version caveats and writing rules.
3. When making changes, update `SPEC.md` to reflect the new state before or alongside implementation.
4. All blog posts and public-facing content must follow the writing rules in `AGENTS.md` (no AI tells).
5. Privacy rules in `SPEC.md` are hard constraints. Never violate them.

## Model policy

Route work to the cheapest capable model: **Haiku 4.5** (`claude-haiku-4-5`) for scouts, broad searches, triage and formatting; **Sonnet 5** (`claude-sonnet-5`) for implementation, tests and refactors; **Opus 4.8** (`claude-opus-4-8`) for architecture, release-blocking review, or a build that failed Sonnet twice; **Fable** (`claude-fable-5`) for the hardest planning only. Raise reasoning effort (`high → xhigh → max`) before escalating a tier, and report each model/effort choice in one line. Condensed source of truth this points at: `docs/MODEL-POLICY.md` in the adam-os operating repo (Adam's standing rule, updated 2026-07-09).

## Voice and tone

Draft in Adam's voice so he trims content, not tone: plain and operational, answer first, three points max, warmth understated, no closing flourish. No em dashes: use a comma, full stop, colon, spaced hyphen, or parentheses. Uncontracted in client writing ("I have", "it is"); sign off email with "Many thanks" then "Adam"; "Happy Friday" on Fridays; add "no need to reply until you're back at work" out-of-hours to a direct report. Full rules and audience calibration: `docs/VOICE-AND-TONE.md` in the adam-os operating repo (Adam's standing rule, 2026-07-09).
