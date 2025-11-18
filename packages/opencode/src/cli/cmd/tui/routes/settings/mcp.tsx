import { useTheme } from "@tui/context/theme"
import { useSync } from "@tui/context/sync"
import { useSDK } from "@tui/context/sdk"
import { createMemo, createSignal, For, Match, Show, Switch } from "solid-js"
import { StatusIndicator } from "@tui/component/settings/status-indicator"
import { TextAttributes } from "@opentui/core"
import { useToast } from "@tui/ui/toast"
import { useKeyboard } from "@opentui/solid"

export function MCPSettings() {
  const { theme } = useTheme()
  const sync = useSync()
  const sdk = useSDK()
  const toast = useToast()

  const [selectedIndex, setSelectedIndex] = createSignal(0)

  const mcpServers = createMemo(() => Object.entries(sync.data.mcp))
  const hasServers = createMemo(() => mcpServers().length > 0)

  const handleToggleMCP = async (name: string, currentlyEnabled: boolean) => {
    try {
      const mcpConfig = sync.data.config.mcp || {}
      const serverConfig = mcpConfig[name]

      if (!serverConfig) {
        toast.show({
          message: `MCP server ${name} not found in config`,
          variant: "error",
        })
        return
      }

      await sdk.client.config.update({
        body: {
          mcp: {
            ...mcpConfig,
            [name]: {
              ...serverConfig,
              enabled: !currentlyEnabled,
            },
          },
        },
      })

      toast.show({
        message: `MCP server ${name} ${!currentlyEnabled ? "enabled" : "disabled"}. Restart required.`,
        variant: "success",
      })
    } catch (error) {
      toast.show({
        message: `Failed to update MCP server: ${error}`,
        variant: "error",
      })
    }
  }

  useKeyboard((evt) => {
    if (!hasServers()) return

    if (evt.name === "up") {
      setSelectedIndex((i) => (i > 0 ? i - 1 : mcpServers().length - 1))
      evt.preventDefault()
    } else if (evt.name === "down") {
      setSelectedIndex((i) => (i < mcpServers().length - 1 ? i + 1 : 0))
      evt.preventDefault()
    } else if (evt.name === "return" || evt.name === "space") {
      const [name] = mcpServers()[selectedIndex()]
      const serverConfig = sync.data.config.mcp?.[name]
      const isEnabled = serverConfig?.enabled !== false
      handleToggleMCP(name, isEnabled)
      evt.preventDefault()
    }
  })

  return (
    <box flexDirection="column" gap={2} paddingLeft={2} paddingRight={2} paddingTop={2}>
      <Show
        when={hasServers()}
        fallback={
          <box flexDirection="column" gap={1} alignItems="center" justifyContent="center" paddingTop={4}>
            <text fg={theme.textMuted}>No MCP servers configured</text>
            <text fg={theme.textMuted}>Add servers in your opencode.json configuration file</text>
          </box>
        }
      >
        <box flexDirection="column">
          <For each={mcpServers()}>
            {([name, server], index) => {
              const serverConfig = () => sync.data.config.mcp?.[name]
              const isEnabled = () => serverConfig()?.enabled !== false
              const isSelected = () => selectedIndex() === index()

              return (
                <box
                  flexDirection="row"
                  justifyContent="space-between"
                  alignItems="center"
                  paddingLeft={1}
                  paddingRight={1}
                  backgroundColor={isSelected() ? theme.primary : "transparent"}
                  onMouseDown={() => {
                    setSelectedIndex(index())
                    handleToggleMCP(name, isEnabled())
                  }}
                  onMouseOver={() => setSelectedIndex(index())}
                >
                  <box flexDirection="row" gap={1} alignItems="center">
                    <StatusIndicator
                      status={
                        server.status === "connected" ? "success" : server.status === "failed" ? "error" : "disabled"
                      }
                    />
                    <text fg={isSelected() ? theme.background : theme.text}>{name}</text>
                  </box>
                  <text fg={isSelected() ? theme.background : isEnabled() ? theme.success : theme.textMuted}>
                    {isEnabled() ? "●" : "○"} {isEnabled() ? "On" : "Off"}
                  </text>
                </box>
              )
            }}
          </For>
        </box>

        <box paddingTop={2}>
          <text fg={theme.textMuted} wrapMode="word">
            Use ↑/↓ to navigate, Enter/Space to toggle. To add new servers or modify commands, edit your opencode.json
            configuration file. Changes require a restart.
          </text>
        </box>
      </Show>
    </box>
  )
}
