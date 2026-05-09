---
name: iedi-end
description: "End an IEDI session and close the record. Generate Evidence, Delta, and Provider/Requester Insight from the context window and run iedi close."
---

# IEDI End

Reflect on the current session, record Evidence, Delta, and Provider/Requester Insight into the open IEDI record, then close it.

## Shell Constraint

All file operations must use Bash. Never use PowerShell for file reads/writes — its default UTF-16 LE encoding garbles Japanese text.

## Shared Templates

This skill uses templates defined in `~/.claude/skills/iedi-shared/SKILL.md`.
**Before generating Evidence (Step 3), Delta (Step 4), or Provider Insight (Step 5):**
Read `~/.claude/skills/iedi-shared/SKILL.md` with the Read tool and use the block templates, rules, and validation commands defined there.
If the Read fails, fall back to the inline template descriptions in each step below.

## IEDI_DIR Setup

Before any bash command, set:

```bash
IEDI_DIR="${IEDI_WORKSPACE:?IEDI_WORKSPACE is not set — run /iedi-setup first}/.iedi"
```

## Instructions

### Step 1: Check for open record

```bash
iedi query --json --limit 5
```

Find the record with `"status": "open"` and save its `record_id` and `intent`.

If no open record is found:
> open IEDIレコードがありません。`/iedi-start` または `iedi open --intent "..."` でセッションを開始してください。

Stop.

---

### Step 2: Get one-line session summary

Ask the user:
> このセッションの結果を一言でまとめてください（例: "借上社宅の業務執行決定書を作成した"）

Save the response as `USER_SUMMARY`.

---

### Step 3: Generate and record Evidence

Review the full conversation (from session start or `/iedi-start` onwards). Generate one `### Evidence Item N` block per independent unit of work.

Use the Evidence Item template from `~/.claude/skills/iedi-shared/SKILL.md`.
If the shared file is unavailable, use this template:

```markdown
### Evidence Item 1
- **Did:** [action taken — specific tools, commands, approach]
- **Result:** [outcome — what succeeded, what was confirmed]
- **Files:** [files changed and summary of changes]
- **Outcome:** [one-line verifiable result]
```

**Rules:**
- Rejected/failed approaches go to Delta (Chosen/Rejected), not Evidence. Evidence is observation only.
- Block count = number of independent work units (typically 1–5)
- Each block is a self-contained RAFT training sample candidate
- If context compression has occurred: "コンテキスト圧縮のため一部情報が欠落している可能性があります" (note at top)

After finalizing the Evidence text, save it:

```bash
IEDI_DIR="${IEDI_WORKSPACE:?}/.iedi"
mkdir -p "$IEDI_DIR/sessions"
echo "$IEDI_DIR/sessions/evidence.md"
```

Use the Write tool to save the Evidence text to the output path. Then run the encoding guard from `~/.claude/skills/iedi-shared/SKILL.md` (BOM check). After verification:

```bash
IEDI_DIR="${IEDI_WORKSPACE:?}/.iedi"
iedi add evidence --last \
  --source "session_end_summary" \
  --text "$(cat "$IEDI_DIR/sessions/evidence.md")"
```

If the CLI exits non-zero, display the error and stop.

---

### Step 4: Generate and confirm Delta

Review user decisions and choices made during the session. Generate one `### Decision N` block per decision where the model could not decide alone.

**Delta** = the gap between what the model proposed and what the user chose:
- User chose from multiple options the model presented
- User corrected the model's direction
- User provided context, constraints, or authorization information
- User made a final approval with meaningful choice

Use the Decision block template from `~/.claude/skills/iedi-shared/SKILL.md`.
If the shared file is unavailable, use this template:

```markdown
### Decision 1
- **Chosen:** [decision adopted]
- **Rejected:** [alternative rejected, or "(none — no alternatives considered)"]
- **Reason:** [why Chosen was better than Rejected]
```

**Rules:**
- Only include decisions where user explicitly chose between alternatives
- "OK" confirmations are not decisions (they are approvals)
- Decisions without rejected alternatives → record in Provider Insight interventions instead (Step 5)
- Each `### Decision N` block is one DPO preference pair (RI perspective)

Present candidates as a numbered list:
```
Delta 候補:
1. [Chosen] / [Rejected] / [Reason]
2. [Chosen] / [Rejected] / [Reason]
3. [Chosen] / [Rejected] / [Reason]

削除する番号、追加・修正があれば教えてください。問題なければ「OK」で確定します。
```

Wait for the user's response, then finalize the Delta text.

---

### Step 5: Generate and confirm Provider Insight

Generate Provider Insight using the 4-section structure from `~/.claude/skills/iedi-shared/SKILL.md`.
Base every intervention on actual session events — do not fabricate.

If the shared file is unavailable, use this structure:

**Intervention blocks** (`### Intervention N`):
```markdown
### Intervention 1
- **Description:** [what decision required intervention]
- **Verdict:** [used | rejected]
- **Confidence:** [+0.1 | +0.3 | +0.5 | -0.1]
- **Reason:** [why model could not decide alone]
```

Confidence rubric: +0.1 = minor fix (wording), +0.3 = approach correction, +0.5 = model was fundamentally wrong, -0.1 = user choice may be worse than model proposal.

**4 sections:**
1. `## 介入ポイント` — `### Intervention N` blocks
2. `## 自律実行に必要だったもの` — domain knowledge, authority/policy, external data
3. `## 次回の自動化可能性` — interventions learnable/rule-able for future sessions
4. `## 本質的な人間判断（自動化不可）` — final decisions, ethics, stakeholder coordination

Confidence values are subjective. Recalibrate after 50 records.

Show the generated content and ask:
> Provider Insight を表示しました。追加・修正があれば教えてください。問題なければ「OK」で続けます。

Apply user corrections, then save:

```bash
IEDI_DIR="${IEDI_WORKSPACE:?}/.iedi"
mkdir -p "$IEDI_DIR/sessions"
echo "$IEDI_DIR/sessions/provider-insight.md"
```

Use the Write tool to save to the output path. Run the encoding guard.

---

### Step 5.5: Template validation

Run the validation grep commands from `~/.claude/skills/iedi-shared/SKILL.md`.

If the shared file is unavailable:

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

**If validation fails** (`MISSING:` output appears):
1. Note the specific missing fields/blocks
2. Return to the generation step with explicit instructions: "Include these missing fields: {MISSING output}"
3. Regenerate, maximum 2 retries
4. If 2 retries fail: display "テンプレート検証に失敗しました。手動で修正してください。" and continue with the generated text as-is

---

### Step 6: Requester Insight input

Ask the user:
> このセッションの総評・気づきを自由に記録してください（スキップする場合は「スキップ」と入力）

Save the response as `REQUESTER_INSIGHT`. If the user skips, leave it empty.

---

### Step 7: Close the record

Save the finalized Delta text:

```bash
IEDI_DIR="${IEDI_WORKSPACE:?}/.iedi"
mkdir -p "$IEDI_DIR/sessions"
echo "$IEDI_DIR/sessions/delta.txt"
```

Use the Write tool to save the Delta text to the output path. Run the encoding guard.

Run the close command (Evidence was added in Step 3, Provider Insight saved in Step 5, Delta saved above):

```bash
IEDI_DIR="${IEDI_WORKSPACE:?}/.iedi"
DELTA=$(cat "$IEDI_DIR/sessions/delta.txt")
PROVIDER=$(cat "$IEDI_DIR/sessions/provider-insight.md")
iedi close --last \
  --delta "$DELTA" \
  --insight-provider "$PROVIDER"
```

If `REQUESTER_INSIGHT` is not empty: first save it via Write tool to `$IEDI_DIR/sessions/requester-insight.txt`, run the encoding guard, then append `--insight-requester "$(cat "$IEDI_DIR/sessions/requester-insight.txt")"` to the close command.

**Windows CLI length limit:** cmd.exe limits command lines to ~8191 chars. If `$(cat ...)` expansion of `--delta` or `--insight-provider` fails due to length:
1. Try: `iedi close --last --delta "$(cat "$IEDI_DIR/sessions/delta.txt")"` first (without Provider Insight)
2. Then add Provider Insight via `iedi update` if available
3. Or: return to Step 4 and reduce the Delta block count

If the CLI exits non-zero, display the error and stop (the record remains open — re-running is safe).

---

### Step 8: Completion report

Extract `record_id` and `hash` from the CLI output, then report:

```
IEDIレコード閉鎖完了
  record_id: {record_id}
  intent:    {intent}
  hash:      {hash}

/iedi-digest を実行するとレコードが知識ドキュメントに集約されます。
```

---

## Notes

- If any step fails, the record remains open. Re-run the skill to retry.
- Provider Insight must use the 4-section structure — `/iedi-digest` depends on this format for pattern extraction.
- Delta must be limited to "decisions the model could not make alone." It is not a work log.
- Evidence uses `### Evidence Item N` blocks, Delta uses `### Decision N` blocks, Provider Insight interventions use `### Intervention N` blocks. Each block is a self-contained training data unit (RAFT/DPO/ROZA).
- Step 5.5 grep validation is a lightweight check for LLM template drift. On failure, retry generation up to 2 times.
- Long text must not be passed directly as CLI arguments. Save to `$IEDI_DIR/sessions/` and use `$(cat <file>)`. Watch the Windows command-line length limit (~8191 chars).
- The `iedi` CLI uses `IEDI_WORKSPACE` env var to locate `.iedi/`. Skill and CLI reference the same DB.
- Use Bash for all file operations. Never use PowerShell.
