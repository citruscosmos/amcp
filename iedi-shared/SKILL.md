---
name: iedi-shared
description: "Canonical flow, templates, rules, and validation logic for IEDI skills. Not user-invocable."
---

# IEDI Shared

**This file is the single source of truth for the IEDI record lifecycle.**
`/iedi-start`, `/iedi-end`, and `/iedi-capture` are thin wrappers that declare
which phases/steps to execute. Read this file in full before modifying any IEDI skill.

This skill is not user-invocable — it is consumed via `Read` by the other IEDI skills.

---

## Shell Constraint

All file I/O must use Bash. Never use PowerShell for file read/write operations.
PowerShell's default encoding (UTF-16 LE) causes Japanese text garbling when Bash tools read the file.
The `Write` tool writes UTF-8 — keep the entire pipeline in Bash to preserve encoding.

---

## Pre-flight: CLI & IEDI_DIR Setup

Before any `iedi` command or file operation, run this once:

```bash
AMCP_HOME="${AMCP_HOME:-$HOME/.claude/skills/amcp}"
IEDI_BIN="$AMCP_HOME/node_modules/.bin/iedi"

if [ ! -x "$IEDI_BIN" ]; then
  echo "CLI: not found — run /iedi-setup to install" >&2
  exit 1
fi

IEDI_DIR="${IEDI_WORKSPACE:?IEDI_WORKSPACE is not set — run /iedi-setup first}/.iedi"
```

The `:?` form exits with an error if `IEDI_WORKSPACE` is unset, preventing silent failures.

---

## Canonical Flow: IEDI Record Lifecycle

### Phase 1: Open

#### Step O1: Check for digest files

```bash
IEDI_DIR="${IEDI_WORKSPACE:?}/.iedi"
ls "$IEDI_DIR/digest/IEDI-"*.md 2>/dev/null
```

**If 0 files (first run or `/iedi-digest` not yet executed):**
> `$IEDI_DIR/digest/` にカテゴリファイルがありません。
> `/iedi-digest` を実行するとカテゴリが使えるようになります。
> 今回は intent を直接入力してください: どんな作業をしますか？

Use the user's response as the intent and jump to Step O5.

##### auto
- **Preconditions:** `--auto` flag is present
- **Behavior:** Run the `ls` command silently. If 0 files, skip to O5 with inferred intent.
- **Fallback:** If `ls` fails (directory doesn't exist), stop and report.

#### Step O2: Build and display category list

Read the first heading line of each `IEDI-*.md` file with the Read tool to use as the description.

File naming: `IEDI-[level1]-[level2].md` (has level2) or `IEDI-[level1].md` (level1 only).
Group by level1 and display hierarchically:

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

##### auto
- **Preconditions:** `--auto` flag is present
- **Behavior:** Skip the hierarchical display. Category is selected in O3 auto (via `--category` flag or inference).
- **Fallback:** N/A (display is presentation-only — auto mode skips it).

#### Step O3: Category selection

Ask the user:
> カテゴリ番号を選んでください（例: `1-1`）。新規の場合は `0` を選択してください。

Wait for the response.

- **Existing category (e.g., `1-1`):** Identify the corresponding `IEDI-[category].md` file
- **`0` (new):** Ask the user to enter a category name in `[level1]-[level2]` format. Skip O4, go to O5.

##### auto
- **Preconditions:** `--auto` flag is present
- **Behavior:** If `--category <name>` flag is provided, use it as the category. Otherwise, default to `internal_task` and proceed to O5.
- **Fallback:** If no `--category` and category cannot be inferred from context, use `internal_task` as default.

#### Step O4: Show intent pattern examples

Read `$IEDI_DIR/digest/IEDI-[category].md` with the Read tool.
Extract the `## Intent パターン例` section and present past intent examples:

```
Intent パターン例（{category}）:
- "..."
- "..."
- "..."

この中から近いものを選ぶ、または自由に記述してください。
```

##### auto
- **Preconditions:** `--auto` flag is present
- **Behavior:** Skip this step entirely. Pattern examples are interactive-only.
- **Fallback:** N/A (always skipped in auto mode).

#### Step O5: Confirm intent

Use the user's response as the intent string.

##### auto
- **Preconditions:** `--auto` flag is present
- **Behavior:** Infer intent from conversation context. Priority: (1) most recent task instruction with action verbs (修正, 作成, 追加, 削除, 変更, 実装, fix, add, create, remove, change, implement) from last 5 user messages, (2) overall session theme as one-line summary, (3) first user message as fallback.
- **Fallback:** If no intent can be inferred with confidence, stop and report — "intent を自動推論できませんでした。対話モードで実行してください。"

#### Step O6: Run iedi open

```bash
$IEDI_BIN open \
  --intent "<INTENT>"
```

Replace `<INTENT>` with the actual intent value.
If the CLI exits non-zero (e.g., open record already exists), display the error and stop.

##### auto
- **Preconditions:** Intent (from O5 auto or `--intent` flag) is available
- **Behavior:** Same CLI command as default. If CLI exits non-zero because an open record exists, stop with: "現在 open のIEDIレコードがあります。`/iedi-end` で閉じてから再実行してください。"
- **Fallback:** Stop and report the CLI error.

#### Step O7: Record and report

Extract `record_id` from the CLI output.

```bash
IEDI_DIR="${IEDI_WORKSPACE:?}/.iedi"
mkdir -p "$IEDI_DIR/sessions"
echo "<record_id>" > "$IEDI_DIR/sessions/current-start.txt"
```

Report:
```
IEDIセッション開始
  record_id: {record_id}
  intent:    {intent}
  category:  {category}
  iedi_dir:  {IEDI_DIR}

セッション終了時は /iedi-end を実行してください。
```

##### auto
- **Preconditions:** `record_id` obtained from O6 output
- **Behavior:** Same as default. Write `record_id` to aux file quietly.
- **Fallback:** If `record_id` extraction fails, stop and report.

---

### Phase 2: Evidence

#### Step E1: Check for open record

```bash
$IEDI_BIN query --json --limit 5
```

Find the record with `"status": "open"` and save its `record_id` and `intent`.

If no open record is found:
> open IEDIレコードがありません。`/iedi-start` または `iedi open --intent "..."` でセッションを開始してください。

Stop.

##### auto
- **Preconditions:** `--auto` flag is present
- **Behavior:** Run `iedi query` silently. If no open record, stop with the same error.
- **Fallback:** If an open record from a different session exists, stop — auto mode cannot resolve conflicts.

#### Step E2: Generate Evidence items

Review the full conversation (from session start or `/iedi-start` onwards).
Generate one `### Evidence Item N` block per independent unit of work.

Use the `## Evidence Item Block Template` section.

**Rules:**
- Rejected/failed approaches go to Delta (Chosen/Rejected), not Evidence. Evidence is observation only.
- Block count = number of independent work units (typically 1–5)
- Each block is a self-contained RAFT training sample candidate
- If context compression has occurred, note at top: "コンテキスト圧縮のため一部情報が欠落している可能性があります"

**source values:**
- `/iedi-end` → `session_end_summary`
- `/iedi-capture` (interactive) → `session_capture`
- `/iedi-capture --auto` → `session_capture_auto`

##### auto
- **Preconditions:** Conversation context is available
- **Behavior:** Generate Evidence blocks directly — skip the confirmation gate. Save immediately.
- **Fallback:** If context is empty or extremely small (under 3 turns, zero file changes, no task instruction), stop with "記録可能な会話コンテキストがありません。"

#### Step E3: Save and add evidence

After finalizing the Evidence text:

```bash
IEDI_DIR="${IEDI_WORKSPACE:?}/.iedi"
mkdir -p "$IEDI_DIR/sessions"
echo "$IEDI_DIR/sessions/evidence.md"
```

Use the Write tool to save to the output path. Run the `## Encoding Guard`.
Then:

```bash
IEDI_DIR="${IEDI_WORKSPACE:?}/.iedi"
$IEDI_BIN add evidence --last \
  --source "<SOURCE>" \
  --text "$(cat "$IEDI_DIR/sessions/evidence.md")"
```

Replace `<SOURCE>` with the appropriate source value from E2.
If the CLI exits non-zero, display the error and stop.

##### auto
- **Preconditions:** Evidence text generated in E2 auto
- **Behavior:** Same as default — save via Write tool, run Encoding Guard, run `iedi add evidence`. Source is `session_capture_auto`.
- **Fallback:** If Write or CLI fails, stop and report the error.

---

### Phase 3: Delta

#### Step D1: Generate Decision blocks

Review user decisions and choices made during the session. Generate one `### Decision N` block
per decision where the model could not decide alone.

**Delta** = the gap between what the model proposed and what the user chose:
- User chose from multiple options the model presented
- User corrected the model's direction
- User provided context, constraints, or authorization information
- User made a final approval with meaningful choice

Use the `## Decision Block Template (Delta)` section.

**Rules:**
- Only include decisions where user explicitly chose between alternatives
- "OK" confirmations are not decisions (they are approvals)
- Decisions without rejected alternatives → record in Provider Insight interventions instead (Phase 4)
- Each `### Decision N` block is one DPO preference pair (RI perspective)

Present candidates as a numbered list:
```
Delta 候補:
1. [Chosen] / [Rejected] / [Reason]
2. [Chosen] / [Rejected] / [Reason]
3. [Chosen] / [Rejected] / [Reason]

削除する番号、追加・修正があれば教えてください。問題なければ「OK」で確定します。
```

Wait for the user's response, then finalize.

##### auto
- **Preconditions:** Conversation context is available
- **Behavior:** Generate Decision blocks directly. Skip the confirmation gate. Apply constraints:
  - Only record decisions where the user explicitly chose between alternatives visible in the conversation
  - Do not fabricate Rejected alternatives not present in the conversation
  - "OK" responses without a real choice are not decisions
  - If no clear decisions exist, produce zero Decision blocks
- **Fallback:** If context is insufficient to identify decisions, produce zero blocks (acceptable).

#### Step D2: Save delta

Save the finalized Delta text:

```bash
IEDI_DIR="${IEDI_WORKSPACE:?}/.iedi"
mkdir -p "$IEDI_DIR/sessions"
echo "$IEDI_DIR/sessions/delta.txt"
```

Use the Write tool to save. Run the `## Encoding Guard`.

##### auto
- **Preconditions:** Decision blocks generated (or zero blocks determined) in D1 auto
- **Behavior:** Same as default — save to `delta.txt`, run Encoding Guard. No confirmation gate.
- **Fallback:** If Write fails, stop and report.

---

### Phase 4: Provider Insight

#### Step P1: Generate Intervention blocks

Generate one `### Intervention N` block per actual intervention point in the session.
Use the `## Intervention Block Template (Provider Insight)` section.
Base every intervention on actual session events — do not fabricate.

##### auto
- **Preconditions:** Conversation context is available
- **Behavior:** Generate Intervention blocks directly. Skip the confirmation gate. Apply constraints:
  - Base only on real session events — do not fabricate
  - If no interventions can be identified from context, produce zero blocks
- **Fallback:** If context is insufficient, produce zero blocks and note "intervention は検出されませんでした" in the Provider Insight.

#### Step P2: Generate 4-section Provider Insight

Use the `## Provider Insight 4-Section Structure` section.

Show the generated content and ask:
> Provider Insight を表示しました。追加・修正があれば教えてください。問題なければ「OK」で続けます。

Apply user corrections.

##### auto
- **Preconditions:** Intervention blocks (if any) generated in P1
- **Behavior:** Generate the 4-section structure directly. Skip the confirmation gate. Apply constraints:
  - Omit sections that don't apply (marked "omit sections that don't apply" in the template)
  - If no interventions were identified, note this in the output
- **Fallback:** If generation fails, produce a minimal structure with the note "auto mode: 自動生成された最小構造です。"

#### Step P3: Save provider insight

```bash
IEDI_DIR="${IEDI_WORKSPACE:?}/.iedi"
mkdir -p "$IEDI_DIR/sessions"
echo "$IEDI_DIR/sessions/provider-insight.md"
```

Use the Write tool to save. Run the `## Encoding Guard`.

##### auto
- **Preconditions:** Provider Insight generated in P2 auto
- **Behavior:** Same as default — save to `provider-insight.md`, run Encoding Guard. No confirmation gate.
- **Fallback:** If Write fails, stop and report.

---

### Phase 5: Close

#### Step C1: Run iedi close

Evidence was added in E3, Provider Insight saved in P3, Delta saved in D2.

If the consuming skill collects Requester Insight (non-empty): save it via Write tool to
`$IEDI_DIR/sessions/requester-insight.txt`, run the Encoding Guard.

```bash
IEDI_DIR="${IEDI_WORKSPACE:?}/.iedi"
DELTA=$(cat "$IEDI_DIR/sessions/delta.txt")
PROVIDER=$(cat "$IEDI_DIR/sessions/provider-insight.md")
$IEDI_BIN close --last \
  --delta "$DELTA" \
  --insight-provider "$PROVIDER"
```

If Requester Insight is non-empty, append `--insight-requester "$(cat "$IEDI_DIR/sessions/requester-insight.txt")"`.

**Windows CLI length limit:** cmd.exe limits command lines to ~8191 chars. If `$(cat ...)` expansion fails due to length:
1. Try: `iedi close --last --delta "$(cat "$IEDI_DIR/sessions/delta.txt")"` first (without Provider Insight)
2. Then add Provider Insight via `iedi update` if available
3. Or: return to Phase 3 and reduce the Delta block count

If the CLI exits non-zero, display the error and stop (record remains open — re-running is safe).

##### auto
- **Preconditions:** All artifacts saved in E3/D2/P3. Requester Insight is always empty in auto mode.
- **Behavior:** Same CLI command as default. Requester Insight is always omitted.
- **Fallback:** If `iedi close` fails, stop — record remains open, re-runnable.

#### Step C2: Report closed record

Extract `record_id` and `hash` from the CLI output, then report:

```
IEDIレコード閉鎖完了
  record_id: {record_id}
  intent:    {intent}
  hash:      {hash}

/iedi-digest を実行するとレコードが知識ドキュメントに集約されます。
```

##### auto
- **Preconditions:** `iedi close` succeeded in C1
- **Behavior:** Same as default — extract `record_id` and `hash`, display completion report. The consuming skill (iedi-capture) may use a different report format.
- **Fallback:** If extraction fails, report what information is available and note "record_id/hash extraction failed."

---

## Evidence Item Block Template

Used by: Phase 2 (E2).

Generate one `### Evidence Item N` block per independent unit of work in the session.
Evidence is observation only — no evaluation, no rejected/failed items.

```markdown
### Evidence Item 1
- **Did:** [action taken — specific tools, commands, approach]
- **Result:** [outcome — what succeeded, what was confirmed]
- **Files:** [files changed and summary of changes]
- **Outcome:** [one-line verifiable result]
```

**Rules:**
- Rejected/failed approaches go to Delta (Chosen/Rejected), not Evidence
- Block count = number of independent work units in the session (typically 1–5)
- Each block is a self-contained RAFT training sample candidate
- If context compression has occurred, note: "Some information may be missing due to context compression"

**source values:**
- `/iedi-end` → `session_end_summary`
- `/iedi-capture` (interactive) → `session_capture`
- `/iedi-capture --auto` → `session_capture_auto`

---

## Decision Block Template (Delta)

Used by: Phase 3 (D1).

Generate one `### Decision N` block per user decision where the model could not decide alone.
Delta = the gap between what the model proposed and what the user chose.

```markdown
### Decision 1
- **Chosen:** [decision adopted]
- **Rejected:** [alternative rejected, or "(none — no alternatives considered)"]
- **Reason:** [why Chosen was better than Rejected]
```

**Rules:**
- Only include decisions where user explicitly chose between alternatives
- "OK" confirmations are not decisions (they are approvals)
- Auto mode constraint: do not fabricate Rejected alternatives not present in the conversation
- If no clear decisions exist, produce zero Decision blocks
- Decisions without rejected alternatives → record in Provider Insight interventions instead
- Each `### Decision N` block is one DPO preference pair (RI perspective)
- Blocks with Rejected = "(none — no alternatives considered)" are recorded but not DPO-suitable

---

## Intervention Block Template (Provider Insight)

Used by: Phase 4 (P1).

Generate one `### Intervention N` block per actual intervention point in the session.
Base all interventions on real session events — do not fabricate.

```markdown
### Intervention 1
- **Description:** [what decision required intervention]
- **Verdict:** [used | rejected]
- **Confidence:** [+0.1 | +0.3 | +0.5 | -0.1]
- **Reason:** [why model could not decide alone]
```

**Confidence rubric (starter — recalibrate after 50 records):**

| Value | Meaning | Example |
|---|---|---|
| +0.1 | Minor correction | Wording adjustment, filename fix |
| +0.3 | Approach correction | Architecture choice, design decision |
| +0.5 | Model was fundamentally wrong | Wrong assumption, major direction change |
| -0.1 | User choice may be worse than model proposal | Rejected model suggestion that was later needed |

---

## Provider Insight 4-Section Structure

Used by: Phase 4 (P2).

```markdown
## 介入ポイント

### Intervention 1
- **Description:** [content]
- **Verdict:** [used | rejected]
- **Confidence:** [value]
- **Reason:** [content]

## 自律実行に必要だったもの
- **ドメイン知識:** [domain knowledge, regulations, conventions needed for decisions]
- **権限・ポリシー:** [who can decide what, within what scope]
- **外部データ・コンテキスト:** [external resources/information that needed to be referenced]
（omit sections that don't apply）

## 次回の自動化可能性
- [interventions learnable/rule-able for future sessions]
- [decisions addressable via templates or pre-definition]

## 本質的な人間判断（自動化不可）
- [final decisions, ethical judgments, stakeholder coordination that cannot be automated]
```

The 4-section structure is maintained for `/iedi-digest` backward compatibility.
Each `### Intervention N` block corresponds to one ROZA evidence edge.

---

## Encoding Guard

After every Write tool call that saves to `$IEDI_DIR/sessions/*`, verify the file is readable UTF-8
before passing it to `$(cat ...)`:

```bash
BOM=$(head -c 3 "$FILE" | od -A n -t x1 | tr -d ' ')
case "$BOM" in
  fffe*|feff*)
    # UTF-16 detected — convert
    if command -v iconv >/dev/null 2>&1; then
      iconv -f UTF-16 -t UTF-8 "$FILE" > "${FILE}.utf8" && mv "${FILE}.utf8" "$FILE"
    else
      echo "ERROR: File is UTF-16 but iconv is not available. Re-run with Bash."
      exit 1
    fi
    ;;
  *)
    # No BOM — assume UTF-8, proceed
    if ! grep -q '' "$FILE" 2>/dev/null; then
      echo "ERROR: File is not readable as UTF-8. Check encoding manually."
      exit 1
    fi
    ;;
esac
```

---

## Template Validation (grep)

Run after saving Evidence, Delta, and Provider Insight files:

```bash
IEDI_DIR="${IEDI_WORKSPACE:?}/.iedi"
EVIDENCE_FILE="$IEDI_DIR/sessions/evidence.md"
DELTA_FILE="$IEDI_DIR/sessions/delta.txt"
PROVIDER_FILE="$IEDI_DIR/sessions/provider-insight.md"

# Evidence: block presence
grep -q '^### Evidence Item [0-9]\+$' "$EVIDENCE_FILE" || echo "MISSING: Evidence Item blocks"

# Delta: block presence + required fields
grep -q '^### Decision [0-9]\+$' "$DELTA_FILE" || echo "MISSING: Decision blocks"
grep -q '^- \*\*Chosen:\*\*' "$DELTA_FILE" || echo "MISSING: Chosen field"
grep -q '^- \*\*Rejected:\*\*' "$DELTA_FILE" || echo "MISSING: Rejected field"
grep -q '^- \*\*Reason:\*\*' "$DELTA_FILE" || echo "MISSING: Reason field"

# Provider Insight: block structure + required fields
grep -q '^### Intervention [0-9]\+$' "$PROVIDER_FILE" || echo "MISSING: Intervention blocks"
grep -q '^- \*\*Verdict:\*\*' "$PROVIDER_FILE" || echo "MISSING: Verdict field"
grep -q '^- \*\*Confidence:\*\*' "$PROVIDER_FILE" || echo "MISSING: Confidence field"
```

**Validation failure handling:**
1. If `MISSING:` output appears, note the specific missing fields/blocks
2. Return to the generation step with explicit instructions: "Include these missing fields: {MISSING output}"
3. Regenerate, maximum 2 retries
4. If 2 retries fail: display the generated text as-is with "Template validation failed. Manual correction needed." and continue

---

## Notes

- All confidence numeric values are subjective. Recalibrate after accumulating 50 records.
- Long text must not be passed directly as CLI arguments. Save to `$IEDI_DIR/sessions/` and use `$(cat <file>)`.
- Windows command-line length limit: ~8191 chars (cmd.exe). If `$(cat ...)` expansion fails, reduce Delta block count.
- `iedi` CLI uses `IEDI_WORKSPACE` env var to locate `.iedi/`. Skills and CLI must reference the same DB.
- If an open record already exists, `iedi open` fails with an error (by design).
