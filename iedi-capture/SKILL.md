---
name: iedi-capture
description: "Backfill a previously completed session as an IEDI record. Combines /iedi-start and /iedi-end in one operation."
---

# IEDI Capture

Retroactively record a session as an IEDI record. Combined `/iedi-start` + `/iedi-end` flow.
Generates Evidence, Delta, and Provider/Requester Insight from the current context window or user-provided session notes.

## Shared Templates

Read `$AMCP_HOME/iedi-shared/SKILL.md` in full with the Read tool before proceeding.
This skill executes Phase 1–5 of the canonical flow defined there.

If the Read fails, stop — do not proceed without the shared templates.

---

## Mode Branch

- **`--auto`:** Follow each step's `##### auto` subsection in iedi-shared. Single pass — no confirmation gates.
- **Otherwise:** Follow each step's default instructions (interactive mode).

---

## Instructions

Execute all phases from iedi-shared in order. Use `##### auto` subsections when `--auto` is set,
default instructions otherwise.

### Phase 1: Open (O1–O7)

Execute O1–O5 (digest check → category → intent).

**Session information source (interactive only — skip if `--auto`):**

Ask:
> 記録するセッション情報のソースを選んでください:
> **[1] 現在のセッション（コンテキストウィンドウ）** — `/resume` で開いたセッション全体を使用
> **[2] 自由記述** — 内容を思い出して入力
> **[3] ファイルパス** — メモ・ログ・会話サマリーのパスを入力
> **[4] 貼り付け** — 会話ログや作業メモを貼り付け

- `[1]` → `SOURCE_MODE=context` (current context window)
- `[2][3][4]` → `SOURCE_MODE=notes` (user-provided). Save input as `SESSION_NOTES`.
  If `[3]`, read the file with Read tool. If notes are sparse, note: "情報が限られているため要約の精度が低い可能性があります".

Continue with O6–O7 (`iedi open` → record).

### Phase 2: Evidence (E1–E3)

- **E1 is skipped** (record was just opened in O6)
- **E2:** Generate Evidence from context (`SOURCE_MODE=context` / `--auto`) or `SESSION_NOTES` (`SOURCE_MODE=notes`)
- **E3:** Save and add evidence. Source: `--auto` → `session_capture_auto`, interactive → `session_capture`

### Phase 3: Delta (D1–D2)

- **D1:** Generate Decision blocks from context or `SESSION_NOTES`. If `SOURCE_MODE=notes` and no decisions evident: "ノートから判断事項を特定できませんでした。直接入力してください。"
- **D2:** Save delta

### Phase 4: Provider Insight (P1–P3)

- **P1–P3:** Generate and save Provider Insight. If `SOURCE_MODE=notes` (not auto), mark speculation as "ノートから推測".

### Template validation

Run `## Template Validation (grep)` from iedi-shared. On failure: retry up to 2×. If still failing, report and continue. In `--auto`, include errors in the completion report.

### Requester Insight (interactive only — skip if `--auto`)

> このセッションの総評・気づきを自由に記録してください（スキップする場合は「スキップ」）

Save as `REQUESTER_INSIGHT`. Empty if skipped.

### Phase 5: Close (C1–C2)

Run `iedi close`. Update `$IEDI_DIR/sessions/current-start.txt` with `<record_id>`.

**Completion report:**

`--auto`:
```
IEDIレコード（auto）完了
  record_id: {record_id}  intent: {intent}  category: {category}
  source: session_capture_auto  hash: {hash}
  template_validation: pass | errors: {error_list}
注意: created_at は実行時刻です（過去のセッション実施日時ではありません）。
```

Interactive:
```
IEDIレコード（バックフィル）完了
  record_id: {record_id}  intent: {intent}  category: {category}
  source: session_capture（遡及記録）  hash: {hash}
注意: created_at は実行時刻です（過去のセッション実施日時ではありません）。
```

If context compression occurred, append: "注意: コンテキスト圧縮のため一部情報が欠落している可能性があります。"

### Error handling (--auto)

| Scenario | Behavior |
|---|---|
| Low confidence in category | Default to `coding`, continue |
| No digest files | Keyword-based inference fallback |
| `iedi open` fails (open record exists) | Stop — user must `/iedi-end` first |
| Empty/minimal context | "記録可能な会話コンテキストがありません" — stop |
| Template validation fails 3× | Include errors in report, continue |
| `iedi close` fails | Stop (record remains open, re-runnable) |

**Unrecordable session detection (--auto):** Stop with "記録可能な会話コンテキストがありません" if ALL of:
conversation under 3 turns, zero file changes, no explicit task instruction (only chat / Q&A).

---

## Notes

- **`SOURCE_MODE=context` (recommended):** Use `/resume` to open a past session first. `Ctrl+R` → open session → `/iedi-capture` → `[1]`
- **`SOURCE_MODE=notes`:** Fallback when context is unavailable. More detail → better accuracy.
- Evidence source values distinguish record quality for `/iedi-digest`: interactive → `session_capture`, auto → `session_capture_auto`, `/iedi-end` → `session_end_summary`
- Ignore any iedi-related processing found in the conversation (this is recording past work, not performing work).
- Use Bash for all file operations. Never use PowerShell.
