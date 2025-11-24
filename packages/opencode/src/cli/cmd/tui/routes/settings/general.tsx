import { useTheme } from "@tui/context/theme"
import { useSync } from "@tui/context/sync"
import { useSDK } from "@tui/context/sdk"
import { createMemo, createSignal, For } from "solid-js"
import { SettingRow } from "@tui/component/settings/row"
import { useKV } from "@tui/context/kv"
import { useToast } from "@tui/ui/toast"
import { useKeyboard } from "@opentui/solid"
import { useDialog } from "@tui/ui/dialog"
import { DialogSelect } from "@tui/ui/dialog-select"
import { DialogPrompt } from "@tui/ui/dialog-prompt"
// import { DialogKeybinds } from "@tui/component/dialog-keybinds" // Disabled - see ROADMAP.md
import { useLocal } from "@tui/context/local"
import { sortBy, flatMap, pipe, entries, isDeepEqual } from "remeda"

export function GeneralSettings() {
  const themeContext = useTheme()
  const { theme } = themeContext
  const sync = useSync()
  const sdk = useSDK()
  const kv = useKV()
  const toast = useToast()
  const dialog = useDialog()
  const local = useLocal()

  const [selectedIndex, setSelectedIndex] = createSignal(0)

  const currentTheme = createMemo(() => sync.data.config.theme ?? kv.get("theme", "opencode"))
  const availableThemes = createMemo(() => Object.keys(themeContext.all()))

  const currentModel = createMemo(() => {
    const model = local.model.current()
    const provider = sync.data.provider.find((x) => x.id === model.providerID)
    const modelInfo = provider?.models[model.modelID]
    return `${modelInfo?.name ?? model.modelID} (${provider?.name ?? model.providerID})`
  })

  const currentSmallModel = createMemo(() => {
    const smallModelConfig = sync.data.config.small_model
    console.log("[SmallModel] currentSmallModel memo running, config value:", smallModelConfig)
    if (!smallModelConfig) return "Not set (uses default model)"

    const [providerID, ...modelParts] = smallModelConfig.split("/")
    const modelID = modelParts.join("/")
    const provider = sync.data.provider.find((x) => x.id === providerID)
    const modelInfo = provider?.models[modelID]
    return `${modelInfo?.name ?? modelID} (${provider?.name ?? providerID})`
  })

  const currentSmallModelValue = createMemo(() => {
    const smallModelConfig = sync.data.config.small_model
    if (!smallModelConfig) return null
    const [providerID, ...modelParts] = smallModelConfig.split("/")
    return {
      providerID,
      modelID: modelParts.join("/"),
    }
  })

  const handleThemeChange = async (themeName: string) => {
    themeContext.set(themeName)
    try {
      await sdk.client.config.update({
        body: { theme: themeName },
      })
      toast.show({
        message: `Theme changed to ${themeName}`,
        variant: "success",
      })
    } catch (error) {
      toast.show({
        message: `Failed to save theme: ${error}`,
        variant: "error",
      })
    }
  }

  const handleModelChange = async (model: { providerID: string; modelID: string }) => {
    local.model.set(model, { recent: true })
    try {
      const currentAgent = local.agent.current()
      await sdk.client.config.update({
        body: {
          agent: {
            [currentAgent.name]: {
              model: `${model.providerID}/${model.modelID}`,
            },
          },
        },
      })
      const provider = sync.data.provider.find((x) => x.id === model.providerID)
      const modelInfo = provider?.models[model.modelID]
      toast.show({
        message: `${currentAgent.name} agent model changed to ${modelInfo?.name ?? model.modelID}`,
        variant: "success",
      })
    } catch (error) {
      toast.show({
        message: `Failed to save model: ${error}`,
        variant: "error",
      })
    }
  }

  const handleShareChange = async (shareMode: "manual" | "auto" | "disabled") => {
    try {
      await sdk.client.config.update({
        body: { share: shareMode },
      })
      toast.show({
        message: `Share mode changed to ${shareMode}`,
        variant: "success",
      })
    } catch (error) {
      toast.show({
        message: `Failed to save share setting: ${error}`,
        variant: "error",
      })
    }
  }

  const handleSmallModelChange = async (model: { providerID: string; modelID: string } | null) => {
    try {
      const updateBody = model ? { small_model: `${model.providerID}/${model.modelID}` } : { small_model: null }
      await sdk.client.config.update({
        body: updateBody as any,
      })
      if (model) {
        const provider = sync.data.provider.find((x) => x.id === model.providerID)
        const modelInfo = provider?.models[model.modelID]
        toast.show({
          message: `Small model changed to ${modelInfo?.name ?? model.modelID}`,
          variant: "success",
        })
      } else {
        toast.show({
          message: "Small model cleared (will use default model)",
          variant: "success",
        })
      }
    } catch (error) {
      toast.show({
        message: `Failed to save small model: ${error}`,
        variant: "error",
      })
    }
  }

  const settings = createMemo(() => [
    {
      id: "username",
      label: "Username",
      value: sync.data.config.username ?? "Not set",
      onActivate: async () => {
        const newUsername = await DialogPrompt.show(dialog, "Set Username", sync.data.config.username || "")

        if (newUsername !== null && newUsername !== sync.data.config.username) {
          try {
            await sdk.client.config.update({
              body: { username: newUsername },
            })
            toast.show({
              message: newUsername ? `Username set to ${newUsername}` : "Username cleared",
              variant: "success",
            })
          } catch (error) {
            toast.show({
              message: `Failed to save username: ${error}`,
              variant: "error",
            })
          }
        }
      },
    },
    {
      id: "share",
      label: "Share Settings",
      value: sync.data.config.share ?? "manual",
      onActivate: () => {
        const shareOptions = [
          { value: "manual", title: "Manual", description: "Share via commands only" },
          { value: "auto", title: "Auto", description: "Automatically share new sessions" },
          { value: "disabled", title: "Disabled", description: "Disable all sharing" },
        ]

        dialog.replace(() => (
          <DialogSelect
            title="Select Share Mode"
            current={sync.data.config.share}
            onSelect={(option) => {
              handleShareChange(option.value as "manual" | "auto" | "disabled")
              dialog.clear()
            }}
            options={shareOptions}
          />
        ))
      },
    },
    // NOTE: Keybinds editor temporarily disabled due to TUI rendering issues
    // See ROADMAP.md - Tech Debt section for details
    // Users can still edit keybinds manually in opencode.json
    // {
    //   id: "keybinds",
    //   label: "Keybinds",
    //   value: "Configure keyboard shortcuts",
    //   onActivate: async () => {
    //     const changes = await DialogKeybinds.show(dialog)
    //     if (changes && Object.keys(changes).length > 0) {
    //       try {
    //         await sdk.client.config.update({
    //           body: {
    //             keybinds: {
    //               ...sync.data.config.keybinds,
    //               ...changes,
    //             },
    //           },
    //         })
    //         toast.show({
    //           message: `Updated ${Object.keys(changes).length} keybind(s). Restart may be required.`,
    //           variant: "success",
    //         })
    //       } catch (error) {
    //         toast.show({
    //           message: `Failed to save keybinds: ${error}`,
    //           variant: "error",
    //         })
    //       }
    //     }
    //   },
    // },
    {
      id: "model",
      label: `Model (${local.agent.current()?.name ?? "..."})`,
      value: currentModel(),
      onActivate: () => {
        const modelOptions = createMemo(() => {
          return [
            ...local.model.recent().flatMap((item) => {
              const provider = sync.data.provider.find((x) => x.id === item.providerID)
              if (!provider) return []
              const model = provider.models[item.modelID]
              if (!model) return []
              return [
                {
                  key: item,
                  value: {
                    providerID: provider.id,
                    modelID: model.id,
                  },
                  title: model.name ?? item.modelID,
                  description: provider.name,
                  category: "Recent",
                },
              ]
            }),
            ...pipe(
              sync.data.provider,
              sortBy(
                (provider) => provider.id !== "opencode",
                (provider) => provider.name,
              ),
              flatMap((provider) =>
                pipe(
                  provider.models,
                  entries(),
                  (models) =>
                    models.map(([modelId, info]) => ({
                      value: {
                        providerID: provider.id,
                        modelID: modelId,
                      },
                      title: info.name ?? modelId,
                      description: provider.name,
                      category: provider.name,
                    })),
                  (models) => models.filter((x) => !local.model.recent().find((y) => isDeepEqual(y, x.value))),
                ),
              ),
            ),
          ]
        })

        dialog.replace(() => (
          <DialogSelect
            title="Select Model"
            current={local.model.current()}
            onSelect={(option) => {
              handleModelChange(option.value as { providerID: string; modelID: string })
              dialog.clear()
            }}
            options={modelOptions()}
          />
        ))
      },
    },
    {
      id: "small_model",
      label: "Small Model",
      value: currentSmallModel(),
      onActivate: () => {
        const modelOptions = createMemo(() => {
          return [
            {
              value: null,
              title: "Not set (use default model)",
              description: "Clear small model configuration",
              category: "Default",
            },
            ...local.model.recent().flatMap((item) => {
              const provider = sync.data.provider.find((x) => x.id === item.providerID)
              if (!provider) return []
              const model = provider.models[item.modelID]
              if (!model) return []
              return [
                {
                  key: item,
                  value: {
                    providerID: provider.id,
                    modelID: model.id,
                  },
                  title: model.name ?? item.modelID,
                  description: provider.name,
                  category: "Recent",
                },
              ]
            }),
            ...pipe(
              sync.data.provider,
              sortBy(
                (provider) => provider.id !== "opencode",
                (provider) => provider.name,
              ),
              flatMap((provider) =>
                pipe(
                  provider.models,
                  entries(),
                  (models) =>
                    models.map(([modelId, info]) => ({
                      value: {
                        providerID: provider.id,
                        modelID: modelId,
                      },
                      title: info.name ?? modelId,
                      description: provider.name,
                      category: provider.name,
                    })),
                  (models) => models.filter((x) => !local.model.recent().find((y) => isDeepEqual(y, x.value))),
                ),
              ),
            ),
          ]
        })

        dialog.replace(() => (
          <DialogSelect
            title="Select Small Model"
            current={currentSmallModelValue() || undefined}
            onSelect={(option) => {
              handleSmallModelChange(option.value as { providerID: string; modelID: string } | null)
              dialog.clear()
            }}
            options={modelOptions()}
          />
        ))
      },
    },
    {
      id: "theme",
      label: "Theme",
      value: currentTheme(),
      onActivate: () => {
        const originalTheme = currentTheme()
        let confirmed = false

        dialog.replace(
          () => (
            <DialogSelect
              title="Select Theme"
              current={originalTheme}
              onMove={(option) => {
                // Preview theme as user navigates
                themeContext.set(option.value as string)
              }}
              onSelect={(option) => {
                confirmed = true
                handleThemeChange(option.value as string)
                dialog.clear()
              }}
              options={availableThemes().map((themeName) => ({
                title: themeName,
                value: themeName,
              }))}
            />
          ),
          () => {
            // Restore original theme if dialog is closed without selecting
            if (!confirmed) {
              themeContext.set(originalTheme)
            }
          },
        )
      },
    },
  ])

  useKeyboard((evt) => {
    if (evt.defaultPrevented) return
    if (dialog.stack.length > 0) return

    if (evt.name === "up") {
      setSelectedIndex((i) => (i > 0 ? i - 1 : settings().length - 1))
      evt.preventDefault()
    } else if (evt.name === "down") {
      setSelectedIndex((i) => (i < settings().length - 1 ? i + 1 : 0))
      evt.preventDefault()
    } else if (evt.name === "return") {
      settings()[selectedIndex()]?.onActivate()
      evt.preventDefault()
    }
  })

  return (
    <box flexDirection="column" paddingLeft={2} paddingRight={2} paddingTop={2}>
      <text fg={theme.textMuted} paddingBottom={1}>
        Use ↑/↓ to navigate, Enter to select
      </text>
      <For each={settings()}>
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
            <text fg={selectedIndex() === index() ? theme.background : theme.textMuted}>{setting.value}</text>
          </box>
        )}
      </For>
    </box>
  )
}
