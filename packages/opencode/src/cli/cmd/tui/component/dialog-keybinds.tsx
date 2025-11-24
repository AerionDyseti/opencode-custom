import { InputRenderable, ScrollBoxRenderable, TextAttributes } from "@opentui/core"
import { useTheme } from "@tui/context/theme"
import { createEffect, createMemo, For, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { useKeyboard, useTerminalDimensions } from "@opentui/solid"
import { useDialog, type DialogContext } from "@tui/ui/dialog"
import { Keybind } from "@/util/keybind"
import type { KeybindsConfig } from "@opencode-ai/sdk"
import { useSync } from "@tui/context/sync"

type KeybindEntry = {
  key: keyof KeybindsConfig
  label: string
  value: string
  description: string
  category: string
}

export type DialogKeybindsProps = {
  onSave?: (keybinds: Partial<KeybindsConfig>) => void
}

export function DialogKeybinds(props: DialogKeybindsProps) {
  const dialog = useDialog()
  const { theme } = useTheme()
  const sync = useSync()
  const [store, setStore] = createStore({
    selected: 0,
    filter: "",
    editing: null as string | null,
    capturedKeys: [] as Keybind.Info[],
    changes: {} as Partial<KeybindsConfig>,
  })

  let input: InputRenderable
  let scroll: ScrollBoxRenderable

  const keybindLabels: Record<keyof KeybindsConfig, { label: string; category: string }> = {
    leader: { label: "Leader Key", category: "Core" },
    app_exit: { label: "Exit Application", category: "Application" },
    editor_open: { label: "Open External Editor", category: "Editor" },
    theme_list: { label: "List Themes", category: "Appearance" },
    sidebar_toggle: { label: "Toggle Sidebar", category: "Interface" },
    status_view: { label: "View Status", category: "Interface" },
    session_export: { label: "Export Session", category: "Session" },
    session_new: { label: "New Session", category: "Session" },
    session_list: { label: "List Sessions", category: "Session" },
    session_timeline: { label: "Session Timeline", category: "Session" },
    session_share: { label: "Share Session", category: "Session" },
    session_unshare: { label: "Unshare Session", category: "Session" },
    session_interrupt: { label: "Interrupt Session", category: "Session" },
    session_compact: { label: "Compact Session", category: "Session" },
    session_child_cycle: { label: "Next Child Session", category: "Session" },
    session_child_cycle_reverse: { label: "Previous Child Session", category: "Session" },
    messages_page_up: { label: "Page Up", category: "Messages" },
    messages_page_down: { label: "Page Down", category: "Messages" },
    messages_half_page_up: { label: "Half Page Up", category: "Messages" },
    messages_half_page_down: { label: "Half Page Down", category: "Messages" },
    messages_first: { label: "First Message", category: "Messages" },
    messages_last: { label: "Last Message", category: "Messages" },
    messages_copy: { label: "Copy Message", category: "Messages" },
    messages_undo: { label: "Undo Message", category: "Messages" },
    messages_redo: { label: "Redo Message", category: "Messages" },
    messages_toggle_conceal: { label: "Toggle Code Concealment", category: "Messages" },
    model_list: { label: "List Models", category: "Model" },
    model_cycle_recent: { label: "Next Recent Model", category: "Model" },
    model_cycle_recent_reverse: { label: "Previous Recent Model", category: "Model" },
    command_list: { label: "List Commands", category: "Commands" },
    settings: { label: "Open Settings", category: "Interface" },
    agent_list: { label: "List Agents", category: "Agent" },
    agent_cycle: { label: "Next Agent", category: "Agent" },
    agent_cycle_reverse: { label: "Previous Agent", category: "Agent" },
    input_clear: { label: "Clear Input", category: "Input" },
    input_forward_delete: { label: "Forward Delete", category: "Input" },
    input_paste: { label: "Paste", category: "Input" },
    input_submit: { label: "Submit", category: "Input" },
    input_newline: { label: "Insert Newline", category: "Input" },
    history_previous: { label: "Previous History", category: "History" },
    history_next: { label: "Next History", category: "History" },
  }

  const keybindDescriptions: Record<keyof KeybindsConfig, string> = {
    leader: "Leader key for keybind combinations",
    app_exit: "Exit the application",
    editor_open: "Open external editor",
    theme_list: "List available themes",
    sidebar_toggle: "Toggle sidebar",
    status_view: "View status",
    session_export: "Export session to editor",
    session_new: "Create a new session",
    session_list: "List all sessions",
    session_timeline: "Show session timeline",
    session_share: "Share current session",
    session_unshare: "Unshare current session",
    session_interrupt: "Interrupt current session",
    session_compact: "Compact the session",
    session_child_cycle: "Next child session",
    session_child_cycle_reverse: "Previous child session",
    messages_page_up: "Scroll messages up by one page",
    messages_page_down: "Scroll messages down by one page",
    messages_half_page_up: "Scroll messages up by half page",
    messages_half_page_down: "Scroll messages down by half page",
    messages_first: "Navigate to first message",
    messages_last: "Navigate to last message",
    messages_copy: "Copy message",
    messages_undo: "Undo message",
    messages_redo: "Redo message",
    messages_toggle_conceal: "Toggle code block concealment in messages",
    model_list: "List available models",
    model_cycle_recent: "Next recently used model",
    model_cycle_recent_reverse: "Previous recently used model",
    command_list: "List available commands",
    settings: "Open settings panel",
    agent_list: "List agents",
    agent_cycle: "Next agent",
    agent_cycle_reverse: "Previous agent",
    input_clear: "Clear input field",
    input_forward_delete: "Forward delete",
    input_paste: "Paste from clipboard",
    input_submit: "Submit input",
    input_newline: "Insert newline in input",
    history_previous: "Previous history item",
    history_next: "Next history item",
  }

  const entries = createMemo((): KeybindEntry[] => {
    const currentKeybinds = sync.data.config.keybinds ?? {}
    return Object.keys(keybindLabels).map((key) => {
      const k = key as keyof KeybindsConfig
      const value = store.changes[k] ?? currentKeybinds[k] ?? ""
      return {
        key: k,
        label: keybindLabels[k].label,
        value: value,
        description: keybindDescriptions[k],
        category: keybindLabels[k].category,
      }
    })
  })

  const filtered = createMemo(() => {
    const needle = store.filter.toLowerCase()
    if (!needle) return entries()
    return entries().filter(
      (entry) =>
        entry.label.toLowerCase().includes(needle) ||
        entry.value.toLowerCase().includes(needle) ||
        entry.category.toLowerCase().includes(needle),
    )
  })

  const dimensions = useTerminalDimensions()
  const height = createMemo(() => Math.min(filtered().length, Math.floor(dimensions().height / 2) - 6))

  const selected = createMemo(() => filtered()[store.selected])

  createEffect(() => {
    store.filter
    setStore("selected", 0)
    scroll?.scrollTo(0)
  })

  function move(direction: number) {
    let next = store.selected + direction
    if (next < 0) next = filtered().length - 1
    if (next >= filtered().length) next = 0
    setStore("selected", next)

    const target = scroll?.getChildren().find((child) => child.id === selected()?.key)
    if (!target) return
    const y = target.y - scroll.y
    if (y >= scroll.height) scroll.scrollBy(y - scroll.height + 1)
    if (y < 0) scroll.scrollBy(y)
  }

  function startEditing() {
    if (!selected()) return
    setStore("editing", selected()!.key)
    setStore("capturedKeys", [])
  }

  function stopEditing(save: boolean) {
    if (store.editing && save && store.capturedKeys.length > 0) {
      const keybindString = store.capturedKeys.map((k) => Keybind.toString(k)).join(",")
      setStore("changes", store.editing as keyof KeybindsConfig, keybindString)
    }
    setStore("editing", null)
    setStore("capturedKeys", [])
  }

  function resetKeybind() {
    if (!selected()) return
    const key = selected()!.key
    const currentKeybinds = sync.data.config.keybinds ?? {}
    const originalValue = currentKeybinds[key] ?? ""
    setStore("changes", key, originalValue)
  }

  function saveKeybinds() {
    props.onSave?.(store.changes)
    dialog.clear()
  }

  useKeyboard((evt) => {
    if (store.editing) {
      // Capture key while editing
      if (evt.name === "escape") {
        stopEditing(false)
        evt.preventDefault()
        return
      }
      if (evt.name === "return") {
        stopEditing(true)
        evt.preventDefault()
        return
      }

      // Ignore comma by itself - it's used as separator in the display
      if (evt.name === "," && !evt.ctrl && !evt.meta && !evt.shift) {
        evt.preventDefault()
        return
      }

      // Capture the key combination
      const capturedKey: Keybind.Info = {
        ctrl: evt.ctrl,
        meta: evt.meta,
        shift: evt.shift,
        leader: false,
        name: evt.name,
      }
      setStore("capturedKeys", [...store.capturedKeys, capturedKey])
      evt.preventDefault()
      return
    }

    // Normal navigation
    if (evt.name === "up" || (evt.ctrl && evt.name === "p")) {
      move(-1)
      evt.preventDefault()
    }
    if (evt.name === "down" || (evt.ctrl && evt.name === "n")) {
      move(1)
      evt.preventDefault()
    }
    if (evt.name === "pageup") {
      move(-10)
      evt.preventDefault()
    }
    if (evt.name === "pagedown") {
      move(10)
      evt.preventDefault()
    }
    if (evt.name === "return") {
      startEditing()
      evt.preventDefault()
    }
    if (evt.name === "r") {
      resetKeybind()
      evt.preventDefault()
    }
    if (evt.ctrl && evt.name === "s") {
      saveKeybinds()
      evt.preventDefault()
    }
  })

  return (
    <box gap={1}>
      <box paddingLeft={3} paddingRight={2}>
        <box flexDirection="row" justifyContent="space-between">
          <text fg={theme.text} attributes={TextAttributes.BOLD}>
            Edit Keybinds
          </text>
          <text fg={theme.textMuted}>esc</text>
        </box>
        <box paddingTop={1} paddingBottom={1}>
          <input
            onInput={(e) => setStore("filter", e)}
            focusedBackgroundColor={theme.backgroundPanel}
            cursorColor={theme.primary}
            focusedTextColor={theme.textMuted}
            ref={(r) => {
              input = r
              setTimeout(() => input.focus(), 1)
            }}
            placeholder="Search keybinds..."
          />
        </box>
      </box>
      <scrollbox
        paddingLeft={2}
        paddingRight={2}
        scrollbarOptions={{ visible: false }}
        ref={(r: ScrollBoxRenderable) => (scroll = r)}
        maxHeight={height()}
      >
        <For each={filtered()}>
          {(entry) => {
            const active = createMemo(() => entry.key === selected()?.key)
            const isEditing = createMemo(() => store.editing === entry.key)
            const hasChanges = createMemo(() => entry.key in store.changes)

            return (
              <box
                id={entry.key}
                flexDirection="column"
                backgroundColor={active() ? theme.primary : "transparent"}
                paddingLeft={1}
                paddingRight={1}
                paddingTop={0.5}
                paddingBottom={0.5}
                onMouseUp={() => {
                  const index = filtered().findIndex((x) => x.key === entry.key)
                  setStore("selected", index)
                  startEditing()
                }}
                onMouseOver={() => {
                  const index = filtered().findIndex((x) => x.key === entry.key)
                  setStore("selected", index)
                }}
              >
                <box flexDirection="row" justifyContent="space-between">
                  <text fg={active() ? theme.background : theme.text} attributes={TextAttributes.BOLD}>
                    {entry.label}
                    <Show when={hasChanges()}>
                      <span style={{ fg: active() ? theme.background : theme.accent }}> *</span>
                    </Show>
                  </text>
                  <text fg={active() ? theme.background : theme.textMuted}>
                    <Show when={isEditing()} fallback={entry.value || "none"}>
                      {store.capturedKeys.length > 0
                        ? store.capturedKeys.map((k) => Keybind.toString(k)).join(",")
                        : "Press keys..."}
                    </Show>
                  </text>
                </box>
                <text fg={active() ? theme.background : theme.textMuted}>
                  {entry.category} • {entry.description}
                </text>
              </box>
            )
          }}
        </For>
      </scrollbox>
      <box paddingRight={2} paddingLeft={3} flexDirection="row" paddingBottom={1} gap={2}>
        <text>
          <span style={{ fg: theme.text, attributes: TextAttributes.BOLD }}>enter</span>
          <span style={{ fg: theme.textMuted }}> edit</span>
        </text>
        <text>
          <span style={{ fg: theme.text, attributes: TextAttributes.BOLD }}>r</span>
          <span style={{ fg: theme.textMuted }}> reset</span>
        </text>
        <text>
          <span style={{ fg: theme.text, attributes: TextAttributes.BOLD }}>ctrl+s</span>
          <span style={{ fg: theme.textMuted }}> save</span>
        </text>
        <Show when={Object.keys(store.changes).length > 0}>
          <text fg={theme.accent}>{Object.keys(store.changes).length} changes</text>
        </Show>
      </box>
    </box>
  )
}

DialogKeybinds.show = (dialog: DialogContext) => {
  return new Promise<Partial<KeybindsConfig> | null>((resolve) => {
    dialog.replace(
      () => (
        <DialogKeybinds
          onSave={(keybinds) => {
            resolve(keybinds)
          }}
        />
      ),
      () => resolve(null),
    )
  })
}
