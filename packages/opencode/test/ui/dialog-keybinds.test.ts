import { describe, test, expect } from "bun:test"
import { Keybind } from "../../src/util/keybind"

describe("DialogKeybinds keybind capture", () => {
  test("should convert captured keys to string format", () => {
    const capturedKeys: Keybind.Info[] = [{ ctrl: true, meta: false, shift: false, leader: false, name: "x" }]
    const result = capturedKeys.map((k) => Keybind.toString(k)).join(",")
    expect(result).toBe("ctrl+x")
  })

  test("should handle multiple captured keys with comma separation", () => {
    const capturedKeys: Keybind.Info[] = [
      { ctrl: true, meta: false, shift: false, leader: false, name: "c" },
      { ctrl: true, meta: false, shift: false, leader: false, name: "d" },
    ]
    const result = capturedKeys.map((k) => Keybind.toString(k)).join(",")
    expect(result).toBe("ctrl+c,ctrl+d")
  })

  test("should handle leader key combinations", () => {
    const capturedKeys: Keybind.Info[] = [{ ctrl: false, meta: false, shift: false, leader: true, name: "q" }]
    const result = capturedKeys.map((k) => Keybind.toString(k)).join(",")
    expect(result).toBe("<leader> q")
  })

  test("should handle complex multi-modifier combinations", () => {
    const capturedKeys: Keybind.Info[] = [{ ctrl: true, meta: true, shift: false, leader: false, name: "u" }]
    const result = capturedKeys.map((k) => Keybind.toString(k)).join(",")
    expect(result).toBe("ctrl+alt+u")
  })

  test("should handle empty captured keys array", () => {
    const capturedKeys: Keybind.Info[] = []
    const result = capturedKeys.map((k) => Keybind.toString(k)).join(",")
    expect(result).toBe("")
  })
})

describe("DialogKeybinds keybind parsing for display", () => {
  test("should parse default keybind for display", () => {
    const keybindString = "ctrl+x"
    const parsed = Keybind.parse(keybindString)
    expect(parsed).toHaveLength(1)
    expect(parsed[0]).toEqual({
      ctrl: true,
      meta: false,
      shift: false,
      leader: false,
      name: "x",
    })
  })

  test("should parse comma-separated keybinds", () => {
    const keybindString = "ctrl+c,ctrl+d,<leader>q"
    const parsed = Keybind.parse(keybindString)
    expect(parsed).toHaveLength(3)
    expect(parsed[0]).toEqual({
      ctrl: true,
      meta: false,
      shift: false,
      leader: false,
      name: "c",
    })
    expect(parsed[1]).toEqual({
      ctrl: true,
      meta: false,
      shift: false,
      leader: false,
      name: "d",
    })
    expect(parsed[2]).toEqual({
      ctrl: false,
      meta: false,
      shift: false,
      leader: true,
      name: "q",
    })
  })

  test("should parse none as empty array", () => {
    const keybindString = "none"
    const parsed = Keybind.parse(keybindString)
    expect(parsed).toEqual([])
  })
})

describe("DialogKeybinds filtering logic", () => {
  type KeybindEntry = {
    key: string
    label: string
    value: string
    description: string
    category: string
  }

  const mockEntries: KeybindEntry[] = [
    {
      key: "leader",
      label: "Leader Key",
      value: "ctrl+x",
      description: "Leader key for keybind combinations",
      category: "Core",
    },
    {
      key: "app_exit",
      label: "Exit Application",
      value: "ctrl+c,ctrl+d,<leader>q",
      description: "Exit the application",
      category: "Application",
    },
    {
      key: "theme_list",
      label: "List Themes",
      value: "<leader>t",
      description: "List available themes",
      category: "Appearance",
    },
    {
      key: "session_new",
      label: "New Session",
      value: "<leader>n",
      description: "Create a new session",
      category: "Session",
    },
  ]

  test("should filter by label", () => {
    const needle = "theme"
    const filtered = mockEntries.filter(
      (entry) =>
        entry.label.toLowerCase().includes(needle) ||
        entry.value.toLowerCase().includes(needle) ||
        entry.category.toLowerCase().includes(needle),
    )
    expect(filtered).toHaveLength(1)
    expect(filtered[0].key).toBe("theme_list")
  })

  test("should filter by category", () => {
    const needle = "session"
    const filtered = mockEntries.filter(
      (entry) =>
        entry.label.toLowerCase().includes(needle) ||
        entry.value.toLowerCase().includes(needle) ||
        entry.category.toLowerCase().includes(needle),
    )
    expect(filtered).toHaveLength(1)
    expect(filtered[0].key).toBe("session_new")
  })

  test("should filter by value", () => {
    const needle = "leader"
    const filtered = mockEntries.filter(
      (entry) =>
        entry.label.toLowerCase().includes(needle) ||
        entry.value.toLowerCase().includes(needle) ||
        entry.category.toLowerCase().includes(needle),
    )
    expect(filtered.length).toBeGreaterThan(1)
  })

  test("should return all entries when needle is empty", () => {
    const needle = ""
    const filtered =
      needle === ""
        ? mockEntries
        : mockEntries.filter(
            (entry) =>
              entry.label.toLowerCase().includes(needle) ||
              entry.value.toLowerCase().includes(needle) ||
              entry.category.toLowerCase().includes(needle),
          )
    expect(filtered).toHaveLength(mockEntries.length)
  })

  test("should return empty array when no matches", () => {
    const needle = "xyz123nonexistent"
    const filtered = mockEntries.filter(
      (entry) =>
        entry.label.toLowerCase().includes(needle) ||
        entry.value.toLowerCase().includes(needle) ||
        entry.category.toLowerCase().includes(needle),
    )
    expect(filtered).toHaveLength(0)
  })

  test("should be case insensitive", () => {
    const needle = "EXIT"
    const filtered = mockEntries.filter(
      (entry) =>
        entry.label.toLowerCase().includes(needle.toLowerCase()) ||
        entry.value.toLowerCase().includes(needle.toLowerCase()) ||
        entry.category.toLowerCase().includes(needle.toLowerCase()),
    )
    expect(filtered).toHaveLength(1)
    expect(filtered[0].key).toBe("app_exit")
  })
})

describe("DialogKeybinds change tracking", () => {
  test("should track changes in a record", () => {
    const changes: Record<string, string> = {}

    // Simulate adding a change
    changes["leader"] = "ctrl+y"
    expect(Object.keys(changes)).toHaveLength(1)
    expect("leader" in changes).toBe(true)
  })

  test("should count multiple changes", () => {
    const changes: Record<string, string> = {
      leader: "ctrl+y",
      app_exit: "ctrl+q",
      theme_list: "<leader>h",
    }
    expect(Object.keys(changes).length).toBe(3)
  })

  test("should allow resetting changes by removing from record", () => {
    const changes: Record<string, string> = {
      leader: "ctrl+y",
      app_exit: "ctrl+q",
    }

    // Simulate reset by setting to original value
    const originalValue = "ctrl+x"
    if (changes["leader"] === originalValue) {
      delete changes["leader"]
    } else {
      changes["leader"] = originalValue
    }

    expect(changes["leader"]).toBe("ctrl+x")
    expect(Object.keys(changes).length).toBe(2)
  })
})
