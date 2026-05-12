# AMCP — AI-Mediated Component Protocol

## Overview

AMCP (AI-Mediated Component Protocol) is a profile specification built on top of Anthropic's Model Context Protocol (MCP). MCP connects AI models to tools and data sources; AMCP extends this to connect models with people and organizations through standardized transaction records and trust verification.

At its core, AMCP introduces the IEDI framework (Intent / Evidence / Delta / Insight) — a tamper-resistant record format that captures the full context of AI-mediated interactions. These records accumulate into verifiable trust credentials.

See [docs/amcp-whitepaper.md](docs/amcp-whitepaper.md) for the full specification.

## Current Status

The project is in early development. We are implementing the IEDI work-record storage layer (`iedi` CLI), which serves as the foundational logging infrastructure for AMCP-compliant interactions.

## Quick Start

### Prerequisites

- Node.js 20+
- Claude Code

### 1. Clone and run setup

```bash
git clone https://github.com/citruscosmos/amcp.git
cd amcp
npm install
./setup
```

The setup script:
- Checks build tools (`python3`, `gcc`, `make`) for `better-sqlite3`
- Cleans up old `~/.claude/skills/iedi-*` directories
- Creates `~/.claude/skills/amcp/` with the unified skill layout
- Installs the `iedi` CLI via `npm install` (compiles native addon, links binary)
- Exports `AMCP_HOME` in your shell profile
- Copies all skill files into place

### 2. Restart Claude Code

Restart Claude Code so it discovers the new skill paths. All IEDI skills (`/iedi-setup`, `/iedi-start`, `/iedi-end`, `/iedi-capture`) become available.

### 3. Configure your workspace

In Claude Code, run:

```
/iedi-setup
```

This sets `IEDI_WORKSPACE` so records are stored in `.iedi/` within your project. The `/iedi-setup` skill will also verify that the `iedi` CLI is installed correctly.

### 4. Usage flow

```
/iedi-start   → Select category, confirm intent, open session
                  (iedi open --intent "...")
... do your work ...
/iedi-end     → End session. Evidence, Delta, Insight generated
                  from context; record is closed.
                  (iedi close --last ...)
```

To retroactively record a past session:

```
/iedi-capture  → Backfill a completed session as an IEDI record
```

### Manual CLI usage

The `iedi` binary is at `$AMCP_HOME/node_modules/.bin/iedi` (default: `~/.claude/skills/amcp/node_modules/.bin/iedi`).

```bash
# If AMCP_HOME is exported in your shell profile:
"$AMCP_HOME/node_modules/.bin/iedi" query
"$AMCP_HOME/node_modules/.bin/iedi" open --intent "task description"
"$AMCP_HOME/node_modules/.bin/iedi" close --last --delta "decisions" \
  --insight-provider "model" --insight-requester "user"
```

## License

MIT
