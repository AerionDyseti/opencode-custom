# Custom Modifications to OpenCode

This document describes all custom modifications made to this fork that differ from the upstream `sst/opencode` repository. These must be preserved when applying upstream updates.

## Overview
This fork maintains:
1. **Settings panel UI** for configuring the TUI without editing config files
2. **Config update event system** for reactive configuration changes
3. **Improved agent switching** that respects per-agent model configuration
4. **Secure-by-default permission handling** in all tool files
5. **Custom workflows** for session management and upstream updates

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

## 2. Config Module Event System

**Files:**
- `packages/opencode/src/config/config.ts` - Event definition and publishing
- `packages/opencode/src/cli/cmd/tui/context/sync.tsx` - Event subscription

**Custom Additions:**

### In config.ts:
- Event definition for `config.updated`
- Event publishing in `update()` function
- Config file path fix (opencode.json vs config.json)

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
  const filepath = path.join(Instance.directory, "opencode.json")  // <-- FIXED PATH
  const existing = await loadFile(filepath)
  const merged = mergeDeep(existing, config)
  await Bun.write(filepath, JSON.stringify(merged, null, 2))
  await Bus.publish(Event.Updated, { config: merged })  // <-- CUSTOM EVENT
  await Instance.dispose()
}
```

### In sync.tsx:
- Event handler for `config.updated` to update sync store

```typescript
case "config.updated": {
  setStore("config", reconcile(event.properties.config))
  break
}
```

**Purpose:** Allows reactive updates throughout the TUI when config changes, enabling live updates without restart. Critical for Settings panel functionality.

---

## 3. Agent Switching Improvements

**File:** `packages/opencode/src/cli/cmd/tui/context/local.tsx`

**Custom Modification:**
Improved agent switching logic to respect per-agent model configuration while preserving user manual selections.

**Logic:**
- Tracks previous agent to detect switches
- Only applies agent's configured model on first switch to that agent
- Preserves user manual model selections for each agent
- Falls back to agent config if user hasn't set a model for that agent

```typescript
// Track previous agent to detect agent switches
let previousAgentName: string | undefined
createEffect(() => {
  const currentAgent = agent.current()
  const agentName = currentAgent.name

  // Only update model when agent switches and has a configured model
  // and user hasn't manually set a model for this agent
  if (previousAgentName !== agentName && currentAgent.model && !modelStore.model[agentName]) {
    if (isModelValid(currentAgent.model))
      model.set({
        providerID: currentAgent.model.providerID,
        modelID: currentAgent.model.modelID,
      })
    else
      toast.show({
        variant: "warning",
        message: `Agent ${agentName}'s configured model is not valid`,
        duration: 3000,
      })
  }

  previousAgentName = agentName
})
```

**Purpose:** Better UX - respects both agent configuration AND user preferences. Prevents agent switches from clobbering user's manual model selections.

---

## 4. Secure Permission Defaults in Tools

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

---

## 5. Custom Workflows

**Files:**
- `.agent/workflows/upstream-update.md` - Upstream update process
- `.agent/workflows/reboot.md` - Session summary generation
- `.agent/workflows/hello.md` - Sample workflow

### /upstream-update Workflow
Step-by-step process for applying upstream updates while preserving customizations:
1. Check for new releases
2. Create safety commit
3. Clone upstream reference
4. Review critical files (config, tools, TUI contexts)
5. Apply changes selectively
6. Restore security patterns
7. Verify builds
8. Update documentation

### /reboot Workflow
Generates comprehensive session summaries for context window management:
- Session overview and status
- Key learnings and decisions
- Progress accomplished
- Current context and artifacts
- Next steps
- Creates CONTINUE.md handoff file

**Purpose:** Standardize common maintenance tasks and improve workflow efficiency.

---

## Applying Updates While Preserving Modifications

### For Settings Panel:
When updating TUI files, ensure:
1. Settings routes and components are preserved
2. Settings route is in app.tsx Switch statement
3. Settings command is in command palette
4. Settings route type in route.tsx context

### For Config Module:
1. Copy upstream `config/config.ts`
2. Add Bus import: `import { Bus } from "../bus"`
3. Add Event definition in Config namespace
4. Modify `update()` function to:
   - Use "opencode.json" not "config.json"
   - Publish event after writing
5. Add config.updated handler to `sync.tsx` event listener

### For Agent Switching:
1. In `local.tsx`, replace simple model update effect with tracked switching logic
2. Ensure manual selections are preserved in modelStore.model[agentName]

### For Tool Files:
1. Copy upstream tool file
2. Find all permission checks
3. Transform to `if (permission === "allow") {} else if (permission === "ask") {} else { throw }`
4. Verify all permission checks follow secure pattern
5. Test build

### Verification Checklist:
- [ ] Settings panel accessible (tab → Settings)
- [ ] Config.updated events published and received
- [ ] Agent switching preserves user model selections
- [ ] All 5 tool files have secure defaults
- [ ] Build passes (`bun run build`)
- [ ] No regressions in permission handling

---

## Version History
- **v1.0.78 (2025-11-20)**: Upstream update with security enhancements, settings panel restored, config event system preserved, agent switching improvements re-applied
