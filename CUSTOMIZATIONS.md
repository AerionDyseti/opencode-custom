# Custom Modifications to OpenCode

This document describes all custom modifications made to this fork that differ from the upstream `sst/opencode` repository. These must be preserved when applying upstream updates.

## Overview
This fork maintains:
1. **Secure-by-default permission handling** in all tool files
2. **Config update event system** for reactive configuration changes
3. **Settings panel UI** for configuring the TUI without editing config files

---

## 1. Settings Panel (TUI)

**File:** `packages/opencode/src/config/config.ts`

**Custom Addition:**
- Event definition for `config.updated`
- Event publishing in `update()` function

**Code:**
```typescript
// Added imports
import { Bus } from "../bus"

// Added in Config namespace
export const Event = {
  Updated: Bus.event(
    "config.updated",
    z.object({
      config: z.lazy(() => Info),
    }),
  ),
}

// Modified update function to publish event
export async function update(config: Info) {
  const filepath = path.join(Instance.directory, "config.json")
  const existing = await loadFile(filepath)
  const merged = mergeDeep(existing, config)
  await Bun.write(filepath, JSON.stringify(merged, null, 2))
  await Bus.publish(Event.Updated, { config: merged })  // <-- CUSTOM
  await Instance.dispose()
}
```

**Purpose:** Allows other parts of the system to react to config changes via the event bus.

---

## 1. Settings Panel (TUI)

**Files:**
- `packages/opencode/src/cli/cmd/tui/routes/settings/` - Settings route components
  - `index.tsx` - Main settings panel with tab navigation
  - `general.tsx` - General settings (model selection, theme)
  - `advanced.tsx` - Advanced settings
  - `mcp.tsx` - MCP server configuration
- `packages/opencode/src/cli/cmd/tui/component/settings/` - Settings UI components
  - `row.tsx` - Settings row component
  - `section.tsx` - Settings section component
  - `toggle.tsx` - Toggle switch component
  - `status-indicator.tsx` - Status indicator component
- `packages/opencode/src/cli/cmd/tui/component/tab.tsx` - Tab component
- `packages/opencode/src/cli/cmd/tui/app.tsx` - Settings route integration
- `packages/opencode/src/cli/cmd/tui/context/route.tsx` - Settings route type

**Features:**
- **Tabbed interface** with MCP, General, and Advanced settings
- **Model configuration** - Set default model and small model for lightweight tasks
- **Theme selection** - Choose themes with live preview
- **MCP server management** - Configure Model Context Protocol servers
- **Automatic persistence** - Changes saved via Config.update() and config.updated events
- **Keyboard shortcuts** - Accessible via command palette (tab → Settings) or keybind

**Purpose:** Provides a user-friendly UI for configuring OpenCode without manually editing JSON config files. Leverages the config event system for live updates.

---

## 3. Secure Permission Defaults in Tools

**Files:**
- `packages/opencode/src/tool/bash.ts`
- `packages/opencode/src/tool/edit.ts`
- `packages/opencode/src/tool/patch.ts`
- `packages/opencode/src/tool/read.ts`
- `packages/opencode/src/tool/write.ts`

**Custom Modification:**
Upstream v1.0.78+ uses **permissive defaults** (allow if permission not set). This fork uses **secure defaults** (deny if permission not set).

**Pattern Applied:**
```typescript
// UPSTREAM (permissive):
if (agent.permission.external_directory === "ask") {
  await Permission.ask({...})
} else if (agent.permission.external_directory === "deny") {
  throw new Permission.RejectedError(...)
}
// else: IMPLICITLY ALLOWS

// CUSTOM (secure):
if (agent.permission.external_directory === "allow") {
  // Explicitly allowed, proceed
} else if (agent.permission.external_directory === "ask") {
  await Permission.ask({...})
} else {
  // Default deny for "deny", undefined, null, or any other value
  throw new Permission.RejectedError(...)
}
```

**Applied To:**
- `external_directory` checks (all 5 files)
- `edit` permission checks (`edit.ts`, `write.ts`, `patch.ts`)

**Purpose:** Defense-in-depth security. Even if config schema validation fails or is bypassed, tools default to denying access rather than allowing it.

**Testing:** Config schema validates permissions as `"ask" | "allow" | "deny"`, so undefined values should not occur under normal operation. This is a safety net.

---

## Applying Updates While Preserving Modifications

### For Config Module:
1. Copy upstream `config/config.ts`
2. Add Bus import: `import { Bus } from "../bus"`
3. Add Event definition after `const log = ...`
4. Modify `update()` function to capture merged config and publish event

### For Tool Files:
1. Copy upstream tool file
2. Find all `if (permission === "ask")` checks
3. Transform to `if (permission === "allow") {} else if (permission === "ask") {} else { throw }`
4. Verify all permission checks follow secure pattern
5. Test build

### Verification Checklist:
- [ ] Config event publishing present
- [ ] All 5 tool files have secure defaults
- [ ] Build passes
- [ ] No regressions in permission handling

---

## Version History
- **v1.0.78 (2025-11-20)**: Initial documentation of custom modifications
