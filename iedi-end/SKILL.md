---
name: iedi-end
description: "End an IEDI session and close the record. Generate Evidence, Delta, and Provider/Requester Insight from the context window and run iedi close."
---

# IEDI End

Reflect on the current session, record Evidence, Delta, and Provider/Requester Insight into the open IEDI record, then close it.

## Shared Templates

Before proceeding, read `$AMCP_HOME/iedi-shared/SKILL.md` in full with the Read tool.
This skill executes Phase 2–5 of the canonical flow defined there.

Key sections referenced:
- `## Pre-flight: CLI & IEDI_DIR Setup` — binary path, prerequisite check, IEDI_DIR
- `## Canonical Flow` → `### Phase 2: Evidence` — Steps E1–E3
- `## Canonical Flow` → `### Phase 3: Delta` — Steps D1–D2
- `## Canonical Flow` → `### Phase 4: Provider Insight` — Steps P1–P3
- `## Canonical Flow` → `### Phase 5: Close` — Steps C1–C2
- `## Evidence Item Block Template`
- `## Decision Block Template (Delta)`
- `## Intervention Block Template (Provider Insight)`
- `## Provider Insight 4-Section Structure`
- `## Encoding Guard`
- `## Template Validation (grep)`

If the Read fails, stop and report the error — do not proceed without the shared templates.

## Instructions

Execute Phase 2–5 from `$AMCP_HOME/iedi-shared/SKILL.md` in order,
following the **default instructions** (not the `##### auto` subsections).

1. **E1:** Check for open record
2. **E2:** Generate Evidence items → confirm
3. **E3:** Save and add evidence

   After E3, ask the user for a one-line session summary:
   > このセッションの結果を一言でまとめてください（例: "借上社宅の業務執行決定書を作成した"）
   
   Save the response as `USER_SUMMARY`.

4. **D1:** Generate Decision blocks → present candidates → confirm with user
5. **D2:** Save delta

6. **P1:** Generate Intervention blocks
7. **P2:** Generate 4-section Provider Insight → confirm with user
8. **P3:** Save provider insight

9. Run `## Template Validation (grep)` from iedi-shared.
   On failure: retry generation up to 2 times. If still failing, display "テンプレート検証に失敗しました。手動で修正してください。" and continue.

10. Ask for Requester Insight:
    > このセッションの総評・気づきを自由に記録してください（スキップする場合は「スキップ」と入力）
    
    Save the response as `REQUESTER_INSIGHT`. If skipped, leave empty.

11. **C1:** Run `iedi close` (with Requester Insight if non-empty)
12. **C2:** Report closed record

### Skill-specific notes

- The one-line session summary (collected after E3) is for the completion report
- Provider Insight must use the 4-section structure — `/iedi-digest` depends on this format
- Delta must be limited to "decisions the model could not make alone." It is not a work log
- If any step fails, the record remains open. Re-run the skill to retry

## Notes

- Evidence uses `### Evidence Item N` blocks, Delta uses `### Decision N` blocks, Provider Insight uses `### Intervention N` blocks. Each block is a self-contained training data unit (RAFT/DPO/ROZA).
- The Template Validation grep is a lightweight check for LLM template drift.
- Long text must not be passed directly as CLI arguments. Save to `$IEDI_DIR/sessions/` and use `$(cat <file>)`. Watch the Windows command-line length limit (~8191 chars).
- The `iedi` CLI uses `IEDI_WORKSPACE` env var to locate `.iedi/`. Skill and CLI reference the same DB.
- Use Bash for all file operations. Never use PowerShell.
