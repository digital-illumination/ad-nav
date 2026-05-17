---
description: Summarise this session and log it to Adam's journal
---

Call the `mcp__adam-stacey-context-remote__get_log_session_script` tool now and follow the steps it returns exactly.

(Claude Code does not surface MCP prompts as slash commands, so this wrapper calls the equivalent tool. The protocol is defined once on the `adam-stacey-context` MCP server and shared by the `log-session` MCP prompt and the `get_log_session_script` tool, so they never drift. If the MCP server is registered under a different name in your config, adjust the tool prefix accordingly.)
