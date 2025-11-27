## Feature: Show Current Feature Branch Name & Status in TUI Footer

### Overview
Display the current git feature branch name and its status (e.g., ahead/behind, uncommitted changes) at the bottom of the TUI, alongside the version and project directory.

### Goals
- Improve developer awareness of git context.
- Reduce context switching to check branch status.

### Requirements
- Detect current git branch name.
- Determine branch status:
	- Uncommitted changes (dirty/clean)
	- Ahead/behind remote
	- Merge conflicts (if present)
- Display branch name and status in TUI footer.
- Update dynamically as branch/status changes.

### UI Placement
- Footer area, near version and project directory.
- Format: `[branch-name] [status]`

### Status Indicators
- `*` for uncommitted changes
- `↑N` for commits ahead
- `↓N` for commits behind
- `!` for merge conflicts

### Example
```
v1.2.3  /project/path  main* ↑2 ↓1
```

### Implementation Notes
- Use git CLI or library to fetch branch info.
- Update on file changes, branch switch, or TUI refresh.
- Avoid performance impact; debounce updates if needed.

### Edge Cases
- Detached HEAD: show `HEAD` or commit hash.
- No git repo: hide branch/status section.
