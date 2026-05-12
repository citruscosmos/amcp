---
name: iedi-capture
description: "Backfill a previously completed session as an IEDI record. Combines /iedi-start and /iedi-end in one operation."
---

# IEDI Capture

Retroactively record a session that is not present in the current context window as an IEDI record.
Combined `/iedi-start` + `/iedi-end` flow. Generates Evidence, Delta, and Provider/Requester Insight from user-provided session notes or the current context window.

## Shell Constraint

All file operations must use Bash. Never use PowerShell for file reads/writes — its default UTF-16 LE encoding garbles Japanese text.

## Shared Templates

This skill uses templates defined in `$AMCP_HOME/iedi-shared/SKILL.md`.
Before generating Evidence, Delta, or Provider Insight, read the following sections
from `$AMCP_HOME/iedi-shared/SKILL.md` with the Read tool:

- `## Evidence Item Block Template` — block format, rules, source values
- `## Decision Block Template (Delta)` — block format, rules for Chosen/Rejected
- `## Intervention Block Template (Provider Insight)` — block format, confidence rubric
- `## Provider Insight 4-Section Structure` — 4-section output structure
- `## Encoding Guard` — BOM check after every Write to sessions/
- `## Template Validation (grep)` — grep commands to validate generated blocks
- `## work_domain Inference Rules` — category → work_domain mapping

If the Read fails, stop and report the error — do not proceed without the shared templates.

---

## CLI & IEDI_DIR Setup

Before any bash command, set AMCP_HOME, IEDi_BIN, and IEDI_DIR:

```bash
AMCP_HOME="${AMCP_HOME:-$HOME/.claude/skills/amcp}"
IEDi_BIN="$AMCP_HOME/node_modules/.bin/iedi"
IEDI_DIR="${IEDI_WORKSPACE:?IEDI_WORKSPACE is not set — run /iedi-setup first}/.iedi"
```

---

## Mode Branch

**If `--auto` is present in the user message:** follow the Auto Mode section below.
**Otherwise:** follow the interactive flow (Step 1–12).

---

## Auto Mode (--auto)

When `--auto` is specified, skip all confirmation steps. Category inference, intent extraction, Evidence/Delta/Provider Insight generation, and record close execute in a single pass.

### A-Step 1: Infer category

1. List available digest files:
```bash
ls "${IEDI_WORKSPACE:?}/.iedi/digest/IEDI-"*.md 2>/dev/null
```

2. Extract category names: strip `IEDI-` prefix and `.md` suffix (e.g., `IEDI-coding-iedi.md` → `coding-iedi`, `IEDI-legal-decision.md` → `legal-decision`).

3. Select the closest category from the conversation context:
   - File paths mentioning coding/design → `coding`
   - Legal/contract/approval documents → `legal`
   - Admin/accounting → `backoffice`
   - Task type: implementation/coding → `coding`, document creation/contract → `legal`
   - User's explicit mentions

If no digest files exist, choose from: `coding`, `legal`, `backoffice`, `design`, `external`.
Default: `coding` (when confidence is low).

### A-Step 2: Extract intent

Priority order:
1. **Most recent task instruction** — among the last 5 user messages, the newest one containing task verbs (修正, 作成, 追加, 削除, 変更, 実装, fix, add, create, remove, change, implement). Example: "XXを修正して", "YYの機能を追加して"
2. **Overall session theme** — if no specific task instruction found, a one-line summary of the main work
3. **First user message** — fallback

### A-Step 3: Determine work_domain

Infer from category (see `## work_domain Inference Rules` in `$AMCP_HOME/iedi-shared/SKILL.md`):
- `legal-*`, `backoffice-*`, `external-*` → `external_transaction`
- `coding-*`, `design-*` → `internal_task`
- Decision-focused → `decision`
- Uncertain → `internal_task` (default)

### A-Step 4: Run iedi open

```bash
$IEDi_BIN open \
  --intent "<AUTO_INTENT>" \
  --work-domain <AUTO_DOMAIN>
```

If CLI exits non-zero (existing open record):
> 現在 open のIEDIレコードがあります。`/iedi-end` で閉じてから再実行してください。

Stop. Extract `record_id` from the CLI output on success.

### A-Step 5: Generate and record Evidence

Review the full conversation. Generate Evidence Item blocks using the `## Evidence Item Block Template` section from `$AMCP_HOME/iedi-shared/SKILL.md`. Skip the confirmation gate — save immediately.

```bash
IEDI_DIR="${IEDI_WORKSPACE:?}/.iedi"
mkdir -p "$IEDI_DIR/sessions"
echo "$IEDI_DIR/sessions/evidence.md"
```

Use the Write tool to save to the output path. Run the `## Encoding Guard` from `$AMCP_HOME/iedi-shared/SKILL.md`. Then:

```bash
IEDI_DIR="${IEDI_WORKSPACE:?}/.iedi"
$IEDi_BIN add evidence --last \
  --source "session_capture_auto" \
  --text "$(cat "$IEDI_DIR/sessions/evidence.md")"
```

`session_capture_auto` is a fixed literal indicating auto-mode backfill.

### A-Step 6: Generate and record Delta

Generate Decision blocks using the `## Decision Block Template (Delta)` section from `$AMCP_HOME/iedi-shared/SKILL.md`.

**Auto mode constraints:**
- Only record decisions where the user explicitly chose between alternatives visible in the conversation
- Do not fabricate Rejected alternatives not present in the conversation
- "OK" responses without a real choice are not decisions (they are approvals)
- If no clear decisions exist, produce zero Decision blocks

Skip the confirmation gate. Save:

```bash
IEDI_DIR="${IEDI_WORKSPACE:?}/.iedi"
mkdir -p "$IEDI_DIR/sessions"
echo "$IEDI_DIR/sessions/delta.txt"
```

Use the Write tool to save. Run the encoding guard.

### A-Step 7: Generate and record Provider Insight

Generate Provider Insight using the `## Intervention Block Template (Provider Insight)` and `## Provider Insight 4-Section Structure` sections from `$AMCP_HOME/iedi-shared/SKILL.md`.
Base all interventions on actual session events — do not fabricate.

Skip the confirmation gate. Save:

```bash
IEDI_DIR="${IEDI_WORKSPACE:?}/.iedi"
mkdir -p "$IEDI_DIR/sessions"
echo "$IEDI_DIR/sessions/provider-insight.md"
```

Use the Write tool to save. Run the encoding guard.

### A-Step 8: Template validation

Run the `## Template Validation (grep)` commands from `$AMCP_HOME/iedi-shared/SKILL.md`.

**On failure:**
- 1st failure: Include the `MISSING:` output in the regeneration prompt: "The following fields are missing: {MISSING output}. Regenerate including these fields."
- 2nd failure: Same — retry with explicit feedback
- 3rd failure (2 retries exhausted): Include the validation errors in the completion report and continue. Notify: "テンプレート検証に失敗しました。手動で修正してください。"

### A-Step 9: Requester Insight

Leave as empty string (cannot be auto-generated).

### A-Step 10: Close the record

```bash
IEDI_DIR="${IEDI_WORKSPACE:?}/.iedi"
DELTA=$(cat "$IEDI_DIR/sessions/delta.txt")
PROVIDER=$(cat "$IEDI_DIR/sessions/provider-insight.md")
$IEDi_BIN close --last \
  --delta "$DELTA" \
  --insight-provider "$PROVIDER"
```

If CLI exits non-zero, display the error and stop (record remains open).

**Windows CLI length limit:** If `$(cat ...)` expansion fails due to length (~8191 chars), reduce Delta block count (return to A-Step 6).

### A-Step 11: Completion report

```
IEDIレコード（auto）完了
  record_id: {record_id}
  intent:    {intent}
  category:  {category}
  source:    session_capture_auto
  hash:      {hash}
  template_validation: pass | errors: {error_list}

注意: created_at は実行時刻です（過去のセッション実施日時ではありません）。
```

If context compression has occurred, append:
> 注意: コンテキスト圧縮のため一部情報が欠落している可能性があります。

### Error handling and fallback

| Scenario | Behavior |
|---|---|
| Low confidence in category inference | Default to `coding`, continue |
| No digest files exist | Fall back to keyword-based inference |
| `iedi open` fails (existing open record) | Display error, stop (user must `/iedi-end` first) |
| Empty or extremely small context | "記録可能な会話コンテキストがありません" — stop |
| Template validation fails 3 times | Include errors in report, continue (record is closed, manual fix needed) |
| `iedi close` fails | Display error, stop (record remains open, re-runnable) |

### Unrecordable session detection

Stop with "記録可能な会話コンテキストがありません" if ALL of:
- Conversation is under 3 turns
- Zero file changes
- No explicit task instruction from user (only chat / Q&A)

---

## Interactive Flow

### Step 1: Check for open record

```bash
$IEDi_BIN query --json --limit 3
```

If an `"status": "open"` record exists:
> 現在 open のIEDIレコードがあります（{record_id} / {intent}）。
> このレコードを先に `/iedi-end` で閉じてから再実行してください。

Stop.

---

### Step 2: Category selection (/iedi-start flow)

```bash
ls "${IEDI_WORKSPACE:?}/.iedi/digest/IEDI-"*.md 2>/dev/null
```

**If 0 files:** Ask the user for intent directly and skip to Step 4.

**If files exist:** Read the first heading line of each file with the Read tool. Group by level1 and display hierarchically:

```
利用可能なカテゴリ:
[1] legal
    [1-1] legal-decision   (業務執行決定書)
    [1-2] legal-contract   (契約・覚書)
[2] coding
    [2-1] coding-iedi      (IEDI 実装)
[0] 新規カテゴリ
```

Ask:
> カテゴリ番号を選んでください。新規の場合は `0` を選択してください。

---

### Step 3: Show intent pattern examples (existing category)

Read `${IEDI_WORKSPACE}/.iedi/digest/IEDI-[category].md` with the Read tool.
Extract the `## Intent パターン例` section and present it.

> この中から近いものを選ぶ、または自由に記述してください。

---

### Step 4: Confirm intent and work_domain

Confirm the intent string from the user's response.

Infer work_domain from category and intent (see `## work_domain Inference Rules` in `$AMCP_HOME/iedi-shared/SKILL.md` — no need to ask the user):
- `legal-*`, `external-*`, `backoffice-*` → `external_transaction`
- `coding-*`, `design-*` → `internal_task`
- Decision-focused → `decision`
- Uncertain → `internal_task`

---

### Step 5: Session information source selection

Ask the user:
> 記録するセッション情報のソースを選んでください:
>
> **[1] 現在のセッション（コンテキストウィンドウ）**
>     `/resume` で開いたセッション全体をそのまま使用します。
>     Evidence・Delta・Insight を会話内容から直接生成します。
>
> **[2] 自由記述**
>     何をしたか、どんな決断があったかを思い出して入力してください。
>
> **[3] ファイルパス**
>     メモ・ログ・会話サマリーのファイルパスを入力してください。
>
> **[4] 貼り付け**
>     会話ログや作業メモをそのまま貼り付けてください。

Save the choice as `SOURCE_MODE`:
- `[1]` → `SOURCE_MODE=context`
- `[2][3][4]` → `SOURCE_MODE=notes`

**`SOURCE_MODE=context`:** The current conversation (context window) is the information source. Steps 7+ use the same generation logic as `/iedi-end`.

**`SOURCE_MODE=notes`:**
- `[2]` Free text: save user's input as `SESSION_NOTES`
- `[3]` File path: Read the file with the Read tool
- `[4]` Paste: save pasted text as `SESSION_NOTES`

---

### Step 6: Run iedi open

```bash
$IEDi_BIN open \
  --intent "<INTENT>" \
  --work-domain <WORK_DOMAIN>
```

If CLI exits non-zero, display the error and stop. Extract `record_id` from the output.

---

### Step 7: Generate and record Evidence

**`SOURCE_MODE=context`:** Review the full conversation. Generate Evidence Item blocks using the `## Evidence Item Block Template` section from `$AMCP_HOME/iedi-shared/SKILL.md`.

**`SOURCE_MODE=notes`:** Generate Evidence Item blocks from `SESSION_NOTES`. If notes are sparse: "情報が限られているため要約の精度が低い可能性があります" (note this).

After finalizing, save:

```bash
IEDI_DIR="${IEDI_WORKSPACE:?}/.iedi"
mkdir -p "$IEDI_DIR/sessions"
echo "$IEDI_DIR/sessions/evidence.md"
```

Use the Write tool to save. Run the encoding guard (BOM check). Then:

```bash
IEDI_DIR="${IEDI_WORKSPACE:?}/.iedi"
$IEDi_BIN add evidence --last \
  --source "session_capture" \
  --text "$(cat "$IEDI_DIR/sessions/evidence.md")"
```

`session_capture` is a fixed literal for backfill (same regardless of `SOURCE_MODE`).
If CLI exits non-zero, display the error and stop.

---

### Step 8: Generate and confirm Delta

**`SOURCE_MODE=context`:** Review the conversation. Generate Decision blocks using the `## Decision Block Template (Delta)` section from `$AMCP_HOME/iedi-shared/SKILL.md`.

**`SOURCE_MODE=notes`:** Generate from `SESSION_NOTES`. If no decision points are evident: "ノートから判断事項を特定できませんでした。直接入力してください。"

**Delta** = decisions the model could not make alone:
- User chose from multiple options
- User corrected the model's direction
- User provided context/constraints/authorization
- User made a final approval with meaningful choice

Present candidates:
```
Delta 候補:
1. [Chosen] / [Rejected] / [Reason]
2. [Chosen] / [Rejected] / [Reason]
3. [Chosen] / [Rejected] / [Reason]

削除する番号、追加・修正があれば教えてください。問題なければ「OK」で確定します。
```

Wait for the user's response.

---

### Step 9: Generate and confirm Provider Insight

**`SOURCE_MODE=context`:** Generate Provider Insight from the conversation using the `## Intervention Block Template (Provider Insight)` and `## Provider Insight 4-Section Structure` sections from `$AMCP_HOME/iedi-shared/SKILL.md`.

**`SOURCE_MODE=notes`:** Generate from `SESSION_NOTES`. Mark speculation as "ノートから推測".

Base all interventions on actual session events — do not fabricate.

Show the generated content and ask:
> Provider Insight を表示しました。追加・修正があれば教えてください。問題なければ「OK」で続けます。

Apply corrections. Save:

```bash
IEDI_DIR="${IEDI_WORKSPACE:?}/.iedi"
mkdir -p "$IEDI_DIR/sessions"
echo "$IEDI_DIR/sessions/provider-insight.md"
```

Use the Write tool to save. Run the encoding guard.

---

### Step 9.5: Template validation

Run the `## Template Validation (grep)` commands from `$AMCP_HOME/iedi-shared/SKILL.md`.

**If validation fails:**
1. Note specific missing fields/blocks
2. Return to the generation step with explicit instructions
3. Maximum 2 retries
4. If 2 retries fail: "テンプレート検証に失敗しました。手動で修正してください。" — continue with generated text as-is

---

### Step 10: Requester Insight input

Ask the user:
> このセッションの総評・気づきを自由に記録してください（スキップする場合は「スキップ」）

Save as `REQUESTER_INSIGHT`. Empty string if skipped.

---

### Step 11: Close the record

Save the finalized Delta text:

```bash
IEDI_DIR="${IEDI_WORKSPACE:?}/.iedi"
mkdir -p "$IEDI_DIR/sessions"
echo "$IEDI_DIR/sessions/delta.txt"
```

Use the Write tool to save. Run the encoding guard.

Run close (Evidence added in Step 7, Provider Insight saved in Step 9, Delta saved above):

```bash
IEDI_DIR="${IEDI_WORKSPACE:?}/.iedi"
DELTA=$(cat "$IEDI_DIR/sessions/delta.txt")
PROVIDER=$(cat "$IEDI_DIR/sessions/provider-insight.md")
$IEDi_BIN close --last \
  --delta "$DELTA" \
  --insight-provider "$PROVIDER"
```

If `REQUESTER_INSIGHT` is not empty: first save via Write tool to `$IEDI_DIR/sessions/requester-insight.txt`, run the encoding guard, then append `--insight-requester "$(cat "$IEDI_DIR/sessions/requester-insight.txt")"`.

**Windows CLI length limit:** If `$(cat ...)` expansion fails (~8191 chars), reduce Delta block count (return to Step 8).

If CLI exits non-zero, display the error and stop (record remains open).

---

### Step 12: Completion report

Update auxiliary file:
```bash
IEDI_DIR="${IEDI_WORKSPACE:?}/.iedi"
mkdir -p "$IEDI_DIR/sessions"
echo "<record_id>" > "$IEDI_DIR/sessions/current-start.txt"
```

Report:
```
IEDIレコード（バックフィル）完了
  record_id: {record_id}
  intent:    {intent}
  category:  {category}
  source:    session_capture（遡及記録）
  hash:      {hash}

注意: created_at は実行時刻です（過去のセッション実施日時ではありません）。
```

---

## Notes

- **`SOURCE_MODE=context` (recommended):** Use `/resume` to open a past session before running this skill. The full conversation in the context window yields the highest Evidence/Delta/Insight accuracy. Typical flow: `Ctrl+R` session search → open session → `/iedi-capture` → `[1]`
- **`SOURCE_MODE=notes`:** Fallback when context is unavailable. More detailed notes → better Insight accuracy. Conversation logs / work memos work best.
- Evidence source values: interactive → `session_capture`, auto → `session_capture_auto` (`/iedi-end` uses `session_end_summary`). `/iedi-digest` uses these to distinguish record quality and capture mode.
- Evidence uses `### Evidence Item N` blocks, Delta uses `### Decision N` blocks, Provider Insight interventions use `### Intervention N` blocks. Each block is a self-contained training data unit (RAFT/DPO/ROZA).
- Step 9.5 grep validation is a lightweight check for LLM template drift. On failure, retry generation up to 2 times.
- Long text must not be passed directly as CLI arguments. Save to `$IEDI_DIR/sessions/` and use `$(cat <file>)`. Watch the Windows command-line length limit (~8191 chars).
- The `iedi` CLI uses `IEDI_WORKSPACE` env var to locate `.iedi/`. Skill and CLI reference the same DB.
- Use Bash for all file operations. Never use PowerShell.
- Ignore any iedi-related processing found in the conversation (this is a recording act about past work, not work to perform).
