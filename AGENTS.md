<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Writing Rules: Remove AI-Generated Content Tells

All written content on this site (blog posts, context files, copy) must read as human-written. Strip AI tells before committing.

## Words and Phrases to Avoid

- **Filler intensifiers:** "genuinely", "fundamentally", "ultimately", "notably", "arguably", "crucially"
- **AI-favourite verbs:** "delve", "navigate" (unless Ad-Nav context), "leverage" (as filler), "foster", "underscore"
- **AI-favourite adjectives:** "robust", "seamless/seamlessly", "pivotal", "holistic", "multifaceted", "nuanced"
- **AI-favourite nouns:** "landscape", "tapestry", "realm"
- **Filler openers:** "it's worth noting", "in essence", "at its core", "a testament to", "in today's [X]"
- **Overly formal transitions:** "moreover", "furthermore"

## Punctuation

- Do not use em dashes (—) or double hyphens (--) as clause connectors. Restructure the sentence instead: use a full stop, a comma, a colon, or break into two sentences.
- Do not use semicolons in casual writing.
- Do not over-use bold for emphasis.

## Structural Patterns to Avoid

- **Triple anaphora:** "I know X. I know Y. I know Z." or "Every X, every Y, every Z." Vary the structure.
- **Formulaic pivots:** "Not X. Y." or "It's not X — it's Y." used repeatedly.
- **Perfectly balanced lists:** all items the same length and structure. Vary item length and phrasing.
- **Question then immediate answer:** "What does this mean? It means..." Rephrase.
- **Pithy section-ending one-liners** that restate the heading. Cut them or make them earn their place.
- **"Here's the thing:" / "Here's what I learned:"** as transitions.
- **Starting consecutive paragraphs with the same word.**

## Tone

- Failure stories should not resolve too neatly. Leave some roughness.
- Not every challenge needs a silver lining.
- Endings should not read like LinkedIn motivational posts.
- Self-deprecation should be real, not humble-bragging.

## Voice Reference

Read `content/blog/salesforce-price-book-2025.md` for the baseline voice: conversational, first-person, dry British humour, opinion backed by evidence, "three points" structure. Match that.
