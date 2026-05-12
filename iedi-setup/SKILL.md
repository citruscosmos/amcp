---
name: iedi-setup
description: "Configure IEDI_WORKSPACE to the workspace top directory. Writes env.IEDI_WORKSPACE to .claude/settings.local.json. Run on first setup or when changing workspaces."
---

# IEDI Setup

Configure the `IEDI_WORKSPACE` environment variable to the workspace top directory.
Adds or updates `env.IEDI_WORKSPACE` in `{IEDI_WORKSPACE}/.claude/settings.local.json`.

IEDI skills (`/iedi-start`, `/iedi-end`, `/iedi-capture`) use this env var
to locate the `.iedi/` directory.

## Shell Constraint

All file operations must use Bash. Never use PowerShell for file reads/writes — its default UTF-16 LE encoding garbles Japanese text.

---

## Instructions

### Step 1: Detect and confirm workspace path

Get the current workspace path:

```bash
pwd
```

Confirm with the user:
> ワークスペースパスを **{path}** に設定します。よろしいですか？
> 問題なければ「OK」、変更する場合はパスを入力してください。

Extract the final path (`IEDI_WORKSPACE`) from the user's response.

---

### Step 2: Update {path}/.claude/settings.local.json

Read `{path}/.claude/settings.local.json` with the Read tool.
If the file does not exist, treat it as `{}`.

Add or update the `IEDI_WORKSPACE` key inside the existing `env` object and save with the Write tool.
If the `env` key does not exist, create it. Do not modify any other keys.

---

### Step 3: Verify iedi CLI

Check that the `iedi` CLI is available in the AMCP skills directory:

```bash
AMCP_HOME="${AMCP_HOME:-$HOME/.claude/skills/amcp}"
IEDI_BIN="$AMCP_HOME/node_modules/.bin/iedi"

if [ ! -x "$IEDI_BIN" ]; then
  echo "CLI not found — running npm install in $AMCP_HOME..."
  if ! (cd "$AMCP_HOME" && npm install); then
    echo "ERROR: npm install failed" >&2
    echo "Check: build tools (python3, gcc, make), network, Node.js 20+" >&2
    exit 1
  fi
fi

echo "CLI: $IEDI_BIN"
```

If `npm install` fails, guide the user to check build tools (`python3`, `gcc`, `make`) and Node.js version.

---

### Step 4: Completion report

Report in this format:
```
IEDI_WORKSPACE を設定しました
  path: {IEDI_WORKSPACE}
  file: {IEDI_WORKSPACE}/.claude/settings.local.json

Claude Code を再起動するか、新しいセッションを開始すると有効になります。
```

---

## Notes

- This skill writes to `.claude/settings.local.json` — Claude Code reads this file for environment variables on session start.
- Re-run this skill when changing workspaces. The new value overwrites the previous `IEDI_WORKSPACE`.
- The `iedi` CLI uses `IEDI_WORKSPACE` to locate `.iedi/`. The skill and CLI must reference the same workspace.
