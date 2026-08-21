# Autonomy Rules — CreatorOS Workspace

## Execution Style
- Do not ask for permission before running terminal commands.
- Do not create an implementation plan or wait for approval before executing tasks,
  unless the task involves: deleting files permanently, changing authentication/security 
  logic, or modifying the database schema in a destructive way.
- Make reasonable assumptions rather than asking clarifying questions.
  Briefly state your assumption inline, then proceed immediately.
- Prefer action and iteration over lengthy planning documents.
- If something could be done two ways, pick the better one and do it.

## Git Workflow
- After completing a task, auto-stage and commit all changes with a clear, 
  descriptive commit message following conventional commits format 
  (e.g. `feat:`, `fix:`, `chore:`, `refactor:`).
- Always run `git pull origin main` before starting any editing task.
- Always ask before pushing to `origin/main`. Never push without explicit instruction.

## Communication Style
- Be concise. Skip preamble and lengthy recaps.
- Report what you did, not what you're about to do.
- Surface blockers and decisions immediately rather than building up to them.
- Do not re-summarize artifact contents after creating them.
