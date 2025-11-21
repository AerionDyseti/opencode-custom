---
description: Check for and apply upstream updates from sst/opencode
---

# Upstream Update Workflow

This workflow helps you check for new upstream releases and selectively apply updates while preserving custom modifications.

## Prerequisites

- Upstream remote configured: `git remote add upstream https://github.com/sst/opencode`
- Reference clone available or create one: `git clone https://github.com/sst/opencode ../opencode-reference`

## Steps

### 1. Check for New Releases

```bash
cd ../opencode-reference
git fetch --tags
git tag --sort=-v:refname | head -10
```

Note the latest version tag.

### 2. Checkout Target Version

```bash
cd ../opencode-reference
git checkout v1.0.XX  # Replace XX with target version
```

### 3. Create Safety Commit

```bash
cd ../opencode-custom
git add -A
git commit -m "WIP: Pre-update checkpoint before vX.X.XX"
```

### 4. Identify Differences

```bash
diff -r --brief packages/opencode/src ../opencode-reference/packages/opencode/src \
  2>&1 | grep -v "\.test\.ts" | wc -l
```

### 5. Review Critical Files First

Check security-sensitive files for changes:

```bash
# Tools (permission logic)
diff -u packages/opencode/src/tool/edit.ts ../opencode-reference/packages/opencode/src/tool/edit.ts | head -50
diff -u packages/opencode/src/tool/bash.ts ../opencode-reference/packages/opencode/src/tool/bash.ts | head -50

# Config (event system)
diff -u packages/opencode/src/config/config.ts ../opencode-reference/packages/opencode/src/config/config.ts | head -50
```

### 6. Apply Non-Security Files

Copy unchanged upstream files:

```bash
# Session, provider, CLI, TUI, etc.
cp -r ../opencode-reference/packages/opencode/src/session packages/opencode/src/
cp -r ../opencode-reference/packages/opencode/src/cli packages/opencode/src/
# ... etc
```

### 7. Merge Security Files

For tool files, apply improvements while preserving secure defaults:

- Copy upstream file
- Restore secure default pattern (see CUSTOMIZATIONS.md)
- Verify permission checks exist for: `edit`, `bash`, `external_directory`

### 8. Verify Build

```bash
cd packages/opencode
bun run build
```

### 9. Review Changes

```bash
git diff --stat
git diff packages/opencode/src/tool/
```

### 10. Commit

```bash
git add -A
git commit -m "Update to vX.X.XX with security enhancements

[Describe key changes]
[Note security fixes preserved]"
```

## Custom Files to Preserve

Always preserve these customizations:

1. **config/config.ts** - Event.Updated definition and publishing
2. **tool/\*.ts** - Secure permission defaults (5 files)

See CUSTOMIZATIONS.md for details.
