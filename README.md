# AMCP — AI-Mediated Component Protocol

## Overview

AMCP (AI-Mediated Component Protocol) is a profile specification built on top of Anthropic's Model Context Protocol (MCP). MCP connects AI models to tools and data sources; AMCP extends this to connect models with people and organizations through standardized transaction records and trust verification.

At its core, AMCP introduces the IEDI framework (Intent / Evidence / Delta / Insight) — a tamper-resistant record format that captures the full context of AI-mediated interactions. These records accumulate into verifiable trust credentials.

See [docs/amcp-whitepaper.md](docs/amcp-whitepaper.md) for the full specification.

## Current Status

The project is in early development. We are implementing the IEDI work-record storage layer (`iedi` CLI), which serves as the foundational logging infrastructure for AMCP-compliant interactions.

## Install

Prerequisites: **Node.js 20+**, **Claude Code**, and build tools (`python3`, `gcc`, `make` — for the `better-sqlite3` native addon).

Paste this into Claude Code:

```
git clone https://github.com/citruscosmos/amcp.git ~/.claude/skills/amcp && cd ~/.claude/skills/amcp && ./setup
```

This clones the repo directly into your Claude Code skills directory, installs dependencies, compiles TypeScript, and links the `iedi` CLI. Restart Claude Code after it finishes.

Then run `/iedi-setup` in Claude Code to configure your workspace.

### Add skill routing to CLAUDE.md

Append this to your project's `CLAUDE.md` so Claude Code knows when to invoke IEDI skills:

```markdown
## IEDI

Available slash commands:
- `/iedi-setup` — configure IEDI_WORKSPACE, verify CLI
- `/iedi-start` — start an IEDI session
- `/iedi-end` — end an IEDI session, generate Evidence/Delta/Insight
- `/iedi-capture` — backfill a past session as an IEDI record
- `/iedi-digest` — aggregate closed records into a knowledge document

When starting any non-trivial task, invoke `/iedi-start` first.
When the task is complete, invoke `/iedi-end`.
```

## Usage

```
/iedi-start   → Select category, confirm intent, open session
... do your work ...
/iedi-end     → End session. Evidence, Delta, Insight generated
                  from context; record is closed.
```

To retroactively record a past session:

```
/iedi-capture  → Backfill a completed session as an IEDI record
```

### Manual CLI usage

The `iedi` binary is at `~/.claude/skills/amcp/node_modules/.bin/iedi`.

```bash
iedi query
iedi open --intent "task description"
iedi close --record-id "<RECORD_ID>" --delta "decisions" --insight-provider "model" --insight-requester "user"
```

## License

MIT
