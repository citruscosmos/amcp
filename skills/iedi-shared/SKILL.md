---
name: iedi-shared
description: "Shared templates, rules, and validation logic for IEDI skills (iedi-end, iedi-capture, iedi-start). Not user-invocable."
---

# IEDI Shared

Shared definitions referenced by `/iedi-start`, `/iedi-end`, and `/iedi-capture`.
This skill is not user-invocable — it provides templates and rules consumed by the other IEDI skills.

---

## Shell Constraint

**All file I/O must use Bash.** Never use PowerShell for file read/write operations.
PowerShell's default encoding (UTF-16 LE) causes Japanese text garbling when Bash tools read the file.
The `Write` tool writes UTF-8 — keep the entire pipeline in Bash to preserve encoding.

---

## CLI Availability

Before running any `iedi` command, verify the CLI is available. Run this check once at the start of each skill:

```bash
if command -v iedi >/dev/null 2>&1; then
  echo "CLI: iedi (global)"
else
  # Search for the CLI source — check common locations
  for _DIR in "$HOME/dev/amcp" "$HOME/projects/amcp"; do
    if [ -f "$_DIR/src/cli/iedi.ts" ]; then
      echo "CLI_SOURCE: $_DIR"
      break
    fi
  done
fi
```

**If `command -v iedi` succeeds:** use `iedi` directly for all commands.

**If `iedi` is not found but `CLI_SOURCE` is set:**
```bash
cd "$CLI_SOURCE" && npm link 2>&1
```
Then use `iedi` directly. If `npm link` fails (permissions, etc.), fall back to running the source directly:
```bash
npx tsx "$CLI_SOURCE/src/cli/iedi.ts" <subcommand> <args...>
```

**If neither `iedi` nor the source is found:**
> `iedi` CLI が見つかりません。`/iedi-setup` を実行して CLI をリンクしてください。

Stop.

**CRITICAL:** Never run `npx tsx` against a file found via Grep/Glob search. Only use the pre-verified `CLI_SOURCE` path from the check above. This prevents accidentally running a different project's `iedi.ts`.

## IEDI_DIR Setup

Before any file operation or CLI call, set:

```bash
IEDI_DIR="${IEDI_WORKSPACE:?IEDI_WORKSPACE is not set — run /iedi-setup first}/.iedi"
```

The `:?` form causes Bash to exit with an error message if `IEDI_WORKSPACE` is unset,
preventing silent failures (e.g., writes to `/.iedi`).

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

## Evidence Item Block Template

Used by: `/iedi-end` Step 3, `/iedi-capture` Step 7 / A-Step 5.

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

Used by: `/iedi-end` Step 4, `/iedi-capture` Step 8 / A-Step 6.

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

Used by: `/iedi-end` Step 5, `/iedi-capture` Step 9 / A-Step 7.

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

Used by: `/iedi-end` Step 5, `/iedi-capture` Step 9 / A-Step 7.

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

## work_domain Inference Rules

Used by: `/iedi-start` Step 6, `/iedi-capture` Step 4 / A-Step 3.

| Category pattern | work_domain |
|---|---|
| `legal-*`, `backoffice-*`, `external-*` | `external_transaction` |
| `coding-*`, `design-*` | `internal_task` |
| Primary purpose is decision-making | `decision` |
| Reflection / retrospective | `retrospective` |
| Uncertain | `internal_task` (default) |

work_domain is immutable after record creation. When in doubt, use `internal_task`.

---

## Template Validation (grep)

Used by: `/iedi-end` Step 5.5, `/iedi-capture` Step 9.5 / A-Step 8.

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
