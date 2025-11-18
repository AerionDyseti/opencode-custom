import { Bus } from "../bus"
import z from "zod"
import { Config as ConfigImpl } from "./config"

export namespace Config {
  export const Event = {
    Updated: Bus.event(
      "config.updated",
      z.object({
        config: ConfigImpl.Info,
      }),
    ),
  }

  // Re-export everything from config.ts
  export import state = ConfigImpl.state
  export import McpLocal = ConfigImpl.McpLocal
  export import McpRemote = ConfigImpl.McpRemote
  export import Mcp = ConfigImpl.Mcp
  export import Permission = ConfigImpl.Permission
  export import Command = ConfigImpl.Command
  export import Agent = ConfigImpl.Agent
  export import Keybinds = ConfigImpl.Keybinds
  export import TUI = ConfigImpl.TUI
  export import Layout = ConfigImpl.Layout
  export import Info = ConfigImpl.Info
  export import global = ConfigImpl.global
  export import get = ConfigImpl.get
  export import update = ConfigImpl.update
  export import directories = ConfigImpl.directories
  export import JsonError = ConfigImpl.JsonError
  export import ConfigDirectoryTypoError = ConfigImpl.ConfigDirectoryTypoError
  export import InvalidError = ConfigImpl.InvalidError
}
