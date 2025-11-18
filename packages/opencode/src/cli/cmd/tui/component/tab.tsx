import { TextAttributes } from "@opentui/core"
import { useTheme } from "@tui/context/theme"
import { Show } from "solid-js"

export interface TabProps {
  id: string
  label: string
  icon?: string
  active?: boolean
  onClick?: () => void
  disabled?: boolean
  shortcut?: string
  badge?: string | number
}

export function Tab(props: TabProps) {
  const { theme } = useTheme()

  return (
    <box
      flexDirection="row"
      gap={1}
      paddingLeft={2}
      paddingRight={2}
      backgroundColor={props.active ? theme.primary : "transparent"}
      onMouseDown={props.disabled ? undefined : props.onClick}
    >
      <Show when={props.shortcut}>
        <text fg={props.active ? theme.background : theme.textMuted} attributes={TextAttributes.BOLD}>
          {props.shortcut}
        </text>
      </Show>
      <Show when={props.icon}>
        <text fg={props.active ? theme.background : theme.text}>{props.icon}</text>
      </Show>
      <text
        fg={props.active ? theme.background : props.disabled ? theme.textMuted : theme.text}
        attributes={props.active ? TextAttributes.BOLD : undefined}
      >
        {props.label}
      </text>
      <Show when={props.badge}>
        <text fg={props.active ? theme.background : theme.accent}>({props.badge})</text>
      </Show>
    </box>
  )
}
