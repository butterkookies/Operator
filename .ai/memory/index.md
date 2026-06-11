# AI Memory System Guide

**CRITICAL INSTRUCTION FOR ALL AI AGENTS:**
This directory (`.ai/memory/`) is the persistent save state and brain of the project. You MUST use it to maintain context across sessions.

## Initialization (Start of Session)
1. **Always read `state.md` first:** This tells you the current phase, active task, and immediate next steps.
2. **Review `architecture.md` and `decisions.md`:** This gives you the core context of what the app is and why it's built the way it is. Do not deviate from these established patterns.

## Execution (During Session)
1. If you are working on a large epic, track progress in a dedicated markdown file inside the `tasks/` directory.

## Termination (End of Session)
Before ending your turn or asking the user for confirmation that a session is complete:
1. **Update `state.md`:** Update the "Active Task" and "Immediate Next Steps" to reflect where the next session should pick up.
2. **Append to `changelog.md`:** Log the features, bug fixes, or structural changes you just completed.
3. **Log decisions:** If you made a major architectural choice, append it to `decisions.md`.
