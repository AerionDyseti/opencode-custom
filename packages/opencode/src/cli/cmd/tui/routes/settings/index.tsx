import { createSignal, Match, Switch, Show } from "solid-js"
import { TextAttributes } from "@opentui/core"
import { useKeyboard } from "@opentui/solid"
import { useTheme } from "@tui/context/theme"
import { useRoute } from "@tui/context/route"
import { Tab } from "@tui/component/tab"
import { SplitBorder } from "@tui/component/border"
import { MCPSettings } from "./mcp"
import { GeneralSettings } from "./general"
import { AdvancedSettings } from "./advanced"
import { Toast } from "@tui/ui/toast"
import { useDialog } from "@tui/ui/dialog"

export function Settings() {
  const { theme } = useTheme()
  const route = useRoute()
  const dialog = useDialog()
  const [activeTab, setActiveTab] = createSignal<"mcp" | "general" | "advanced">(
    route.data.type === "settings" ? route.data.tab || "mcp" : "mcp",
  )

  const tabs = [
    { id: "mcp" as const, label: "MCP Servers", shortcut: "1" },
    { id: "general" as const, label: "General", shortcut: "2" },
    { id: "advanced" as const, label: "Advanced", shortcut: "3" },
  ]

  const switchTab = (tabId: "mcp" | "general" | "advanced") => {
    setActiveTab(tabId)
    route.navigate({ type: "settings", tab: tabId })
  }

  useKeyboard((evt) => {
    if (evt.defaultPrevented) return

    if (evt.name === "escape") {
      // Only handle escape if no dialog is open
      if (dialog.stack.length === 0) {
        route.navigate({ type: "home" })
        evt.preventDefault()
      }
    } else if (evt.name === "left") {
      const currentIndex = tabs.findIndex((tab) => tab.id === activeTab())
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1
      switchTab(tabs[prevIndex].id)
    } else if (evt.name === "right") {
      const currentIndex = tabs.findIndex((tab) => tab.id === activeTab())
      const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0
      switchTab(tabs[nextIndex].id)
    } else if (evt.name === "1") {
      switchTab("mcp")
    } else if (evt.name === "2") {
      switchTab("general")
    } else if (evt.name === "3") {
      switchTab("advanced")
    }
  })

  return (
    <box flexDirection="column" flexGrow={1}>
      <box paddingLeft={1} paddingRight={1} {...SplitBorder} borderColor={theme.backgroundElement} flexShrink={0}>
        <box flexDirection="row" justifyContent="space-between" alignItems="center">
          <text fg={theme.text} attributes={TextAttributes.BOLD}>
            Settings
          </text>
          <text fg={theme.textMuted}>esc</text>
        </box>
      </box>

      <box
        height={3}
        backgroundColor={theme.background}
        flexDirection="row"
        gap={1}
        paddingLeft={2}
        paddingTop={1}
        paddingBottom={1}
        flexShrink={0}
      >
        {tabs.map((t) => (
          <Tab
            id={t.id}
            label={t.label}
            shortcut={t.shortcut}
            active={activeTab() === t.id}
            onClick={() => switchTab(t.id)}
          />
        ))}
      </box>

      <box flexGrow={1} overflow="hidden">
        <Show when={activeTab() === "mcp"}>
          <MCPSettings />
        </Show>
        <Show when={activeTab() === "general"}>
          <GeneralSettings />
        </Show>
        <Show when={activeTab() === "advanced"}>
          <AdvancedSettings />
        </Show>
      </box>
    </box>
  )
}
