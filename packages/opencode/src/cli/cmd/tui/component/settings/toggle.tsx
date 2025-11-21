import { useTheme } from "@tui/context/theme"
import { TextAttributes } from "@opentui/core"

export interface ToggleProps {
  value: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}

export function Toggle(props: ToggleProps) {
  const { theme } = useTheme()

  return (
    <box
      flexDirection="row"
      gap={1}
      onMouseDown={() => !props.disabled && props.onChange(!props.value)}
      paddingLeft={1}
      paddingRight={1}
    >
      <text
        fg={props.disabled ? theme.textMuted : props.value ? theme.success : theme.textMuted}
        attributes={props.value ? TextAttributes.BOLD : undefined}
      >
        {props.value ? "●" : "○"}
      </text>
      <text fg={props.disabled ? theme.textMuted : theme.text}>{props.value ? "On" : "Off"}</text>
    </box>
  )
}
