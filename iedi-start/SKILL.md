---
name: iedi-start
description: "Start an IEDI session. Select a category from .iedi/digest/, confirm intent, and run iedi open."
---

# IEDI Start

Start an IEDI record. Select a category from past digests, confirm the intent, and run `iedi open`.

## Shared Templates

Before proceeding, read `$AMCP_HOME/iedi-shared/SKILL.md` in full with the Read tool.
This skill executes Phase 1 (Steps O1–O7) of the canonical flow defined there.

Key sections referenced:
- `## Pre-flight: CLI & IEDI_DIR Setup` — binary path, prerequisite check, IEDI_DIR
- `## Canonical Flow` → `### Phase 1: Open` — Steps O1–O7

If the Read fails, stop and report the error — do not proceed without the shared templates.

## Instructions

Execute Phase 1 (Steps O1–O7) from `$AMCP_HOME/iedi-shared/SKILL.md` in order,
following the **default instructions** (not the `##### auto` subsections).

1. **O1:** Check for digest files
2. **O2:** Build and display category list
3. **O3:** Category selection
4. **O4:** Show intent pattern examples (skip if O3 was new category)
5. **O5:** Confirm intent
6. **O6:** Run `iedi open`
7. **O7:** Record and report

### Skill-specific notes

- Starting without a category is fine — free-text intent works without `/iedi-digest` having been run (O1 handles this with fallback to direct intent input)
- This skill only declares intent. Evidence, Delta, and Insight generation is handled by `/iedi-end`
- If an open record already exists, `iedi open` fails with an error (by design). Run `iedi query` to check, close with `/iedi-end`, then retry

## Notes

- Use Bash for all file operations. Never use PowerShell.
- The `iedi` CLI uses `IEDI_WORKSPACE` env var to locate `.iedi/`. Skill and CLI reference the same DB.
