# Custom Modifications to OpenCode

This document describes all custom modifications made to this fork that differ from the upstream `sst/opencode` repository. These must be preserved when applying upstream updates.

## Overview
This fork maintains secure-by-default permission handling and adds a config update event system not present in upstream.

---

## 1. Config Module Event System

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

## 2. Secure Permission Defaults in Tools

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
