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

### 1. Install the IEDI CLI

```bash
git clone https://github.com/citruscosmos/amcp.git
cd amcp
npm install
npm run build
npm link    # makes `iedi` available globally
```

### 2. Install Claude Code skills

```bash
mkdir -p ~/.claude/skills
cp -r skills/iedi-setup ~/.claude/skills/
cp -r skills/iedi-start ~/.claude/skills/
cp -r skills/iedi-end ~/.claude/skills/
cp -r skills/iedi-capture ~/.claude/skills/
```

### 3. Configure your workspace

In Claude Code, run:

```
/iedi-setup
```

This sets `IEDI_WORKSPACE` so records are stored in `.iedi/` within your project.

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

```bash
iedi query
iedi open --intent "task description"
iedi close --last --delta "decisions" --insight-provider "model" --insight-requester "user"
```

## License

MIT
