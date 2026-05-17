---
description: Run today's structured interview and capture it to the corpus (Wispr-friendly)
---

Call the `mcp__adam-stacey-context-remote__get_interview_script` tool now.

It returns a protocol. Follow that protocol exactly, start to finish, one question at a time. Do not summarise it, do not skip steps, do not improvise the workflow. The tool's output is the source of truth for this command.

(Claude Code does not surface MCP prompts as slash commands, so this wrapper calls the equivalent tool. The protocol is defined once on the `adam-stacey-context` MCP server and shared by the `daily-interview` MCP prompt and the `get_interview_script` tool, so they never drift. If the MCP server is registered under a different name in your config, adjust the tool prefix accordingly.)
