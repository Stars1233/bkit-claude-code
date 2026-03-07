# Privacy Policy — bkit (Vibecoding Kit)

**Last updated:** March 8, 2026
**Version:** 1.6.1
**License:** Apache 2.0

## Overview

bkit is an open-source Claude Code plugin that runs entirely on your local machine. It does not collect, transmit, or store any personal data. This document explains what bkit does and does not do with your information.

## How bkit Works

bkit operates as a local plugin within Claude Code. All processing happens on your machine:

- **Skills** provide structured workflows (PDCA, code review, development pipeline)
- **Agents** coordinate AI-assisted tasks (gap analysis, report generation)
- **Hooks** respond to Claude Code lifecycle events (session start, tool use)

No part of bkit communicates with external servers.

## Data Stored Locally

| Data | Location | Purpose |
|------|----------|---------|
| PDCA status | `.bkit/state/memory.json` | Track current feature progress |
| Agent memory | `.claude/agent-memory/` | Persist agent context across sessions |
| Plan/Design/Report docs | `docs/` | PDCA workflow documents |
| Configuration | `bkit.config.json` | Plugin settings |
| Runtime state | `.bkit/runtime/` | Session-level temporary state |

All data remains in your project directory. You can inspect, modify, or delete any of these files at any time.

## What bkit Does NOT Do

- Does not collect personal information (name, email, IP address, device ID)
- Does not send telemetry, analytics, or usage data to any server
- Does not make network requests of any kind
- Does not read, store, or transmit API keys (existence-checked only, never read)
- Does not include third-party tracking libraries or dependencies
- Does not use cookies, local storage, or browser-based tracking

## Claude Code and Anthropic

bkit runs inside Claude Code, which is operated by Anthropic. Your interactions with Claude (prompts, responses, tool calls) are governed by [Anthropic's Privacy Policy](https://www.anthropic.com/privacy) and [Terms of Service](https://www.anthropic.com/terms). bkit has no access to or control over how Anthropic processes this data.

## GDPR and CCPA

Since bkit collects zero personal data, there is nothing to request, export, or delete under GDPR, CCPA, or similar regulations. If you have concerns about data processed by Claude Code itself, contact Anthropic directly.

## Verifying These Claims

bkit is fully open source under the Apache 2.0 license. You can verify every claim in this document:

1. **Search the codebase** for network calls: `grep -r "fetch\|axios\|http\|request" lib/`
2. **Inspect hook scripts** in `hooks/` and `scripts/` — all operate on local files
3. **Review agent definitions** in `agents/` — no external endpoints
4. **Check dependencies** — bkit has zero third-party runtime dependencies

Repository: [github.com/popup-studio-ai/bkit-claude-code](https://github.com/popup-studio-ai/bkit-claude-code)

## Changes to This Policy

If this policy changes, the update will be reflected in this file with a new date and version number. Since bkit collects no data, changes are unlikely.

## Contact

For questions about this privacy policy or the bkit plugin:

- **GitHub Issues:** [github.com/popup-studio-ai/bkit-claude-code/issues](https://github.com/popup-studio-ai/bkit-claude-code/issues)
- **Organization:** Popup Studio AI
