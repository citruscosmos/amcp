---
name: iedi-start
description: "Start an IEDI session. Select a category from .iedi/digest/, confirm intent, and run iedi open."
---

# IEDI Start

Start an IEDI record. Select a category from past digests, confirm the intent, and run `iedi open`.

## Shell Constraint

All file operations must use Bash. Never use PowerShell for file reads/writes — its default UTF-16 LE encoding garbles Japanese text.

## CLI & IEDI_DIR Setup

Before any bash command, set AMCP_HOME, IEDi_BIN, and IEDI_DIR:

```bash
AMCP_HOME="${AMCP_HOME:-$HOME/.claude/skills/amcp}"
IEDi_BIN="$AMCP_HOME/node_modules/.bin/iedi"
IEDI_DIR="${IEDI_WORKSPACE:?IEDI_WORKSPACE is not set — run /iedi-setup first}/.iedi"
```

## Instructions

### Step 1: Check for digest files

Run:
```bash
IEDI_DIR="${IEDI_WORKSPACE:?}/.iedi"
ls "$IEDI_DIR/digest/IEDI-"*.md 2>/dev/null
```

**If 0 files (first run or `/iedi-digest` not yet executed):**
> `$IEDI_DIR/digest/` にカテゴリファイルがありません。
> `/iedi-digest` を実行するとカテゴリが使えるようになります。
> 今回は intent を直接入力してください: どんな作業をしますか？

Use the user's response as the intent and jump to Step 5.

---

### Step 2: Build and display category list

Read the first heading line of each `IEDI-*.md` file with the Read tool to use as the description.

File naming convention:
- `IEDI-[level1]-[level2].md` → has level2 (e.g., `IEDI-legal-decision.md`)
- `IEDI-[level1].md` → level1 only (e.g., `IEDI-legal.md`)

Group by level1 and display hierarchically. Example:
```
利用可能なカテゴリ:
[1] legal
    [1-1] legal-decision   (業務執行決定書)
    [1-2] legal-contract   (契約・覚書)
[2] coding
    [2-1] coding-iedi      (IEDI 実装)
    [2-2] coding-amcp      (AMCP プロトコル)
[3] backoffice
    [3-1] backoffice-admin (管理業務)
[0] 新規カテゴリ
```

---

### Step 3: Category selection

Ask the user:
> カテゴリ番号を選んでください（例: `1-1`）。新規の場合は `0` を選択してください。

Wait for the response.

- **Existing category (e.g., `1-1`)** → Identify the corresponding `IEDI-[category].md` file (e.g., `IEDI-legal-decision.md`)
- **`0` (new)** → Ask the user to enter a category name in `[level1]-[level2]` format (e.g., `legal-contract`). Skip Step 4 and go to Step 5.

---

### Step 4: Show intent pattern examples

Using the `IEDI_DIR` from Step 1, read `$IEDI_DIR/digest/IEDI-[category].md` with the Read tool.

Extract the `## Intent パターン例` section and present past intent examples:
```
Intent パターン例（{category}）:
- "..."
- "..."
- "..."

この中から近いものを選ぶ、または自由に記述してください。
```

---

### Step 5: Confirm intent

Use the user's response as the intent string.

---

### Step 6: Infer work_domain

Infer work_domain from the category and intent (no need to ask the user):

| Category pattern | work_domain |
|---|---|
| `legal-*`, `backoffice-*`, `external-*` | `external_transaction` |
| `coding-*`, `design-*` | `internal_task` |
| Primary purpose is decision-making | `decision` |
| Reflection / retrospective | `retrospective` |
| Uncertain | `internal_task` (default) |

work_domain is immutable after record creation. When in doubt, use `internal_task`.

---

### Step 7: Run iedi open

```bash
$IEDi_BIN open \
  --intent "<INTENT>" \
  --work-domain <WORK_DOMAIN>
```

Replace `<INTENT>` and `<WORK_DOMAIN>` with actual values.
If the CLI exits non-zero (e.g., an open record already exists), display the error and stop.

---

### Step 8: Record and report

Extract `record_id` from the CLI output.

Record to an auxiliary file (for debugging):
```bash
IEDI_DIR="${IEDI_WORKSPACE:?}/.iedi"
mkdir -p "$IEDI_DIR/sessions"
echo "<record_id>" > "$IEDI_DIR/sessions/current-start.txt"
```

Report in this format:
```
IEDIセッション開始
  record_id: {record_id}
  intent:    {intent}
  category:  {category}
  domain:    {work_domain}
  iedi_dir:  {IEDI_DIR}

セッション終了時は /iedi-end を実行してください。
```

---

## Notes

- This skill only declares intent. Evidence, Delta, and Insight generation is handled by `/iedi-end`.
- If an open record already exists, `iedi open` fails with an error (by design). Run `iedi query` to check open records, close with `/iedi-end`, then retry.
- Starting without a category is fine — free-text intent works without `/iedi-digest` having been run.
- work_domain cannot be changed later. When uncertain, default to `internal_task`.
- The `iedi` CLI uses `IEDI_WORKSPACE` env var to locate `.iedi/`. The skill and CLI reference the same DB.
- Use Bash for all file operations. Never use PowerShell.
