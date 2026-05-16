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

Match the recent build-log series: `content/blog/agents-over-trained-model.md` and `content/blog/giving-mcp-server-a-journal.md`. Conversational, first-person, dry British humour, opinion backed by evidence, honest about failure, "Three Things I Took Away" style close.

Do NOT model new writing on `content/blog/salesforce-price-book-2025.md`. It predates these rules and breaks several of them (em dashes as clause connectors, "robust"/"seamless", a LinkedIn-style motivational ending). It is kept unedited for historical reasons, not as an exemplar.

# Blog Post Hero Images

Every blog post needs its own hero image. This is part of adding the post, not a follow-up.

- **Path and name:** `public/images/blog/{slug}.jpg`, where `{slug}` exactly matches the post's markdown filename. The post frontmatter `image` field points at `/images/blog/{slug}.jpg`.
- **Aesthetic:** abstract, dark, neon (purple `#b829e3` / pink `#ff2d95` / cyan `#00f0ff`), matching the site's cyberpunk theme and the existing posts. No literal or representational stock photography. No text baked into the image. Leave some dark negative space for a title overlay.
- **Source:** Unsplash, free library only (`images.unsplash.com`). Do NOT use `plus.unsplash.com` results, that is the paid Unsplash+ tier. The Unsplash licence permits free commercial use with no attribution required.
- **Procedure for the agent adding the post:** search Unsplash, fetch the chosen photo page's `og:image` CDN URL, download it to the path with `curl` (a ~2000px-wide JPEG at `q=80` is the right size, in line with the existing heroes), then Read the saved file back and visually confirm it fits the aesthetic before opening the PR.
- **Do not** ship a post with a missing image (it 404s the hero banner, listing card, OG card, and JSON-LD), and **do not** reuse another post's image (distinct heroes per post is a deliberate decision).
