# Roadmap

This document tracks planned improvements, features, and technical debt for the opencode-custom fork.

---

## Current Work

_This section tracks what we're actively working on right now._

- Nothing in progress currently (ready to test and commit SQLite implementation)

---

## Tech Debt

### Fix Keybind Settings Dialog

**Status:** Blocked - UI rendering issues

**Problem:** The keybinds editor dialog has text rendering artifacts in the TUI. Characters from labels appear to overlap or bleed into description text, creating visual corruption.

**Attempted Fixes:**

- Changed bullet separators to dashes
- Simplified layout (removed nested boxes, TextAttributes.BOLD)
- Adjusted padding and gaps
- Added logging to verify data integrity (data is clean, issue is in rendering layer)

**Root Cause:** Appears to be a bug in the OpenTUI rendering engine when displaying complex nested text with multiple style attributes.

**Next Steps:**

- File issue with OpenTUI maintainers with screenshots
- Consider alternative UI approach (full-screen editor, simpler list view)
- May need to wait for OpenTUI fix before re-enabling feature

**Files Affected:**

- `packages/opencode/src/cli/cmd/tui/component/dialog-keybinds.tsx`
- `packages/opencode/src/cli/cmd/tui/routes/settings/general.tsx`

**Workaround:** Feature currently hidden from settings menu. Users can edit keybinds by manually editing `opencode.json`.

---

## Features

### Enhanced MCP Server Management

**Priority:** Medium

**Description:** Improve the MCP server configuration UI with:

- Add/remove servers from TUI (currently requires JSON editing)
- Test connection functionality
- View server logs/status
- Import/export server configurations

---

### Agent Configuration Editor

**Priority:** Medium

**Description:** Add TUI interface for configuring agent properties:

- Temperature, top_p settings
- Tool permissions (bash, edit, etc.)
- Custom prompts
- Per-agent keybinds

---

### Session Export/Import

**Priority:** Low

**Description:**

- Export session history to markdown/JSON
- Import sessions from files
- Share sessions between machines
- Archive old sessions

---

## Performance

### Optimize Config Event System

**Priority:** Low

**Description:** The current config.updated event system triggers full Instance.dispose() on every config change, which can be expensive. Consider:

- Partial reload for specific config changes
- Debounce multiple rapid updates
- Cache invalidation strategy

---

## UX Improvements

### Settings Panel Enhancements

**Priority:** Medium

**Description:**

- ✅ Username input dialog (completed)
- ✅ Small model configuration (completed)
- Add search/filter for settings
- Settings categories/organization
- Reset to defaults button
- Export/import settings

---

### Better Error Messages

**Priority:** High

**Description:** Improve error messages throughout the application:

- Permission denied errors should suggest fixes
- Config validation errors should show exact location
- Tool errors should include troubleshooting steps
- Network errors should be more descriptive

---

## Documentation

### User Guide

**Priority:** Medium

**Description:** Create comprehensive user documentation:

- Getting started guide
- Settings panel usage
- MCP server setup
- Agent configuration
- Keybind customization
- Troubleshooting common issues

---

### Developer Documentation

**Priority:** Low

**Description:**

- Architecture overview
- Contributing guidelines (already exists)
- Custom workflow creation guide
- Plugin development guide

---

## Security

### Audit Permission System

**Priority:** High

**Description:** Comprehensive review of permission handling:

- ✅ Secure defaults in all tools (completed)
- Verify no permission bypasses exist
- Add permission audit logging
- Document permission model clearly

---

## Testing

### Increase Test Coverage

**Priority:** Medium

**Description:**

- ✅ Settings panel unit tests (completed)
- ✅ Keybind utility tests (completed)
- Add TUI component integration tests
- Add E2E tests for critical flows
- Add permission system tests

**Current Coverage:** 243 tests passing

---

## Upstream Tracking

### Stay Current with sst/opencode

**Priority:** High

**Description:** Regularly sync with upstream while preserving customizations:

- Monitor releases (currently on v1.0.78)
- Review security patches
- Adopt useful new features
- Maintain compatibility

**Process:** See `.agent/workflows/upstream-update.md`

---

## Future Ideas

These are exploratory ideas that need more investigation:

- **Web UI:** Complement TUI with web-based interface
- **Multi-session support:** Work on multiple sessions simultaneously
- **Collaborative sessions:** Share sessions with team members
- **Plugin marketplace:** Discover and install community plugins
- **Voice input:** Dictate commands and queries
- **Cloud sync:** Sync settings and sessions across devices
