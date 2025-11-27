import { Session } from "./index"
import { MessageV2 } from "./message-v2"
import path from "path"
import { Global } from "../global"
import fs from "fs/promises"
import { Log } from "../util/log"

const log = Log.create({ service: "session-export" })

export namespace SessionExport {
  /**
   * Export a session to a JSON file for debugging
   *
   * Creates a human-readable JSON file with:
   * - Session metadata
   * - All messages with their parts
   * - Formatted for easy inspection
   */
  export async function toFile(sessionID: string): Promise<string> {
    log.info("exporting session", { sessionID })

    // Load session data
    const session = await Session.get(sessionID)
    const messages = await Session.messages({ sessionID })

    // Build export object
    const exportData = {
      session,
      messages: messages.map((msg) => ({
        info: msg.info,
        parts: msg.parts,
      })),
      exportedAt: new Date().toISOString(),
    }

    // Determine output path
    const exportDir = path.join(Global.Path.data, "exports")
    await fs.mkdir(exportDir, { recursive: true })

    const filename = `session-${sessionID}-${Date.now()}.json`
    const filepath = path.join(exportDir, filename)

    // Write pretty JSON
    await Bun.write(filepath, JSON.stringify(exportData, null, 2))

    log.info("session exported", { filepath, messageCount: messages.length })

    return filepath
  }
}
