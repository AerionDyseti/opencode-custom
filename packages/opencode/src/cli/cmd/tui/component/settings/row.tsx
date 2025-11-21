import { useTheme } from "@tui/context/theme"
import { Show, type JSX, type ParentProps } from "solid-js"

export interface SettingRowProps {
  label: string
  description?: string
  control: JSX.Element
}

export function SettingRow(props: ParentProps<SettingRowProps>) {
  const { theme } = useTheme()

  return (
    <box flexDirection="row" justifyContent="space-between" alignItems="center" paddingTop={1} paddingBottom={1}>
      <box flexGrow={1} flexDirection="column" gap={0.5}>
        <text fg={theme.text}>{props.label}</text>
        <Show when={props.description}>
          <text fg={theme.textMuted} wrapMode="word">
            {props.description}
          </text>
        </Show>
      </box>
      <box flexShrink={0} paddingLeft={2}>
        {props.control}
      </box>
    </box>
  )
}
