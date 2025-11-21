import { useTheme } from "@tui/context/theme"
import { useSync } from "@tui/context/sync"
import { useSDK } from "@tui/context/sdk"
import { createSignal, For, Show } from "solid-js"
import { useToast } from "@tui/ui/toast"
import { TextAttributes } from "@opentui/core"
import { useKeyboard } from "@opentui/solid"

export function AdvancedSettings() {
  const { theme } = useTheme()
  const sync = useSync()
  const sdk = useSDK()
  const toast = useToast()

  const [selectedIndex, setSelectedIndex] = createSignal(0)

  const experimentalFeatures = () => sync.data.config.experimental ?? {}
  const disablePasteSummary = () => experimentalFeatures().disable_paste_summary ?? false

  const handleToggleExperimental = async (key: string, currentValue: boolean) => {
    try {
      await sdk.client.config.update({
        body: {
          experimental: {
            ...experimentalFeatures(),
            [key]: !currentValue,
          },
        },
      })
      toast.show({
        message: `${key.replace(/_/g, " ")} ${!currentValue ? "enabled" : "disabled"}`,
        variant: "success",
      })
    } catch (error) {
      toast.show({
        message: `Failed to update setting: ${error}`,
        variant: "error",
      })
    }
  }

  const settings = [
    {
      id: "disable_paste_summary",
      label: "Disable Paste Summary",
      value: () => disablePasteSummary(),
      onActivate: () => handleToggleExperimental("disable_paste_summary", disablePasteSummary()),
    },
    {
      id: "batch_tool",
      label: "Batch Tool",
      value: () => experimentalFeatures().batch_tool ?? false,
      onActivate: () => handleToggleExperimental("batch_tool", experimentalFeatures().batch_tool ?? false),
    },
  ]

  useKeyboard((evt) => {
    if (evt.name === "up") {
      setSelectedIndex((i) => (i > 0 ? i - 1 : settings.length - 1))
      evt.preventDefault()
    } else if (evt.name === "down") {
      setSelectedIndex((i) => (i < settings.length - 1 ? i + 1 : 0))
      evt.preventDefault()
    } else if (evt.name === "return" || evt.name === "space") {
      settings[selectedIndex()]?.onActivate()
      evt.preventDefault()
    }
  })

  return (
    <box flexDirection="column" gap={2} paddingLeft={2} paddingRight={2} paddingTop={2}>
      <box flexDirection="column" gap={1}>
        <text fg={theme.text} attributes={TextAttributes.BOLD}>
          Experimental Features
        </text>
        <text fg={theme.textMuted} wrapMode="word">
          Use ↑/↓ to navigate, Enter/Space to toggle
        </text>
      </box>

      <box flexDirection="column">
        <For each={settings}>
          {(setting, index) => (
            <box
              flexDirection="row"
              justifyContent="space-between"
              alignItems="center"
              paddingLeft={1}
              paddingRight={1}
              backgroundColor={selectedIndex() === index() ? theme.primary : "transparent"}
              onMouseDown={() => {
                setSelectedIndex(index())
                setting.onActivate()
              }}
              onMouseOver={() => setSelectedIndex(index())}
            >
              <text fg={selectedIndex() === index() ? theme.background : theme.text}>{setting.label}</text>
              <text
                fg={selectedIndex() === index() ? theme.background : setting.value() ? theme.success : theme.textMuted}
              >
                {setting.value() ? "●" : "○"} {setting.value() ? "On" : "Off"}
              </text>
            </box>
          )}
        </For>
      </box>

      <box flexDirection="column" gap={2} paddingTop={2}>
        <box flexDirection="column" gap={1}>
          <text fg={theme.text} attributes={TextAttributes.BOLD}>
            Data & Privacy
          </text>
          <box flexDirection="column" gap={0.5}>
            <text fg={theme.textMuted}>Share Settings: {sync.data.config.share ?? "enabled"}</text>
            <Show when={sync.data.config.username}>
              <text fg={theme.textMuted}>Username: {sync.data.config.username}</text>
            </Show>
          </box>
        </box>

        <box flexDirection="column" gap={1}>
          <text fg={theme.text} attributes={TextAttributes.BOLD}>
            Configuration
          </text>
          <Show when={sync.data.config.model}>
            <text fg={theme.textMuted}>Default Model: {sync.data.config.model}</text>
          </Show>
          <text fg={theme.textMuted} wrapMode="word">
            Settings are saved to opencode.json. Some changes require a restart.
          </text>
        </box>
      </box>
    </box>
  )
}
