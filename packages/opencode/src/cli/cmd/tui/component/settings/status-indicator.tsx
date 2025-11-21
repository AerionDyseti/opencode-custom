import { useTheme } from "@tui/context/theme"

export interface StatusIndicatorProps {
  status: "success" | "error" | "warning" | "disabled"
  label?: string
}

export function StatusIndicator(props: StatusIndicatorProps) {
  const { theme } = useTheme()

  const color = () => {
    switch (props.status) {
      case "success":
        return theme.success
      case "error":
        return theme.error
      case "warning":
        return theme.accent
      case "disabled":
        return theme.textMuted
    }
  }

  return (
    <box flexDirection="row" gap={1} alignItems="center">
      <text fg={color()} flexShrink={0}>
        •
      </text>
      {props.label && <text fg={theme.text}>{props.label}</text>}
    </box>
  )
}
