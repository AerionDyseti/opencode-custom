import { useTheme } from "@tui/context/theme"
import { TextAttributes } from "@opentui/core"
import { createSignal, Show, type ParentProps } from "solid-js"

export interface SettingSectionProps {
  title: string
  collapsible?: boolean
  defaultExpanded?: boolean
}

export function SettingSection(props: ParentProps<SettingSectionProps>) {
  const { theme } = useTheme()
  const [expanded, setExpanded] = createSignal(props.defaultExpanded ?? true)

  return (
    <box flexDirection="column" gap={1} paddingTop={1} paddingBottom={1}>
      <box flexDirection="row" gap={1} onMouseDown={() => props.collapsible && setExpanded(!expanded())}>
        <Show when={props.collapsible}>
          <text fg={theme.text}>{expanded() ? "▼" : "▶"}</text>
        </Show>
        <text fg={theme.text} attributes={TextAttributes.BOLD}>
          {props.title}
        </text>
      </box>
      <Show when={expanded()}>
        <box flexDirection="column" paddingLeft={props.collapsible ? 2 : 0}>
          {props.children}
        </box>
      </Show>
    </box>
  )
}
