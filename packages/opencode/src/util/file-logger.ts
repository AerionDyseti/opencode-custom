import fs from "fs"
import path from "path"

// Write to repo for development debugging
const logFile = path.join(process.cwd(), "debug.log")

// Ensure directory exists
try {
  fs.mkdirSync(path.dirname(logFile), { recursive: true })
} catch (e) {
  // ignore
}

// Clear log file on startup
try {
  fs.writeFileSync(logFile, `=== OpenCode Debug Log - ${new Date().toISOString()} ===\n`)
} catch (e) {
  // ignore
}

export function fileLog(...args: any[]) {
  try {
    const timestamp = new Date().toISOString()
    const message = args
      .map((arg) => {
        if (typeof arg === "object") {
          return JSON.stringify(arg, null, 2)
        }
        return String(arg)
      })
      .join(" ")

    const line = `[${timestamp}] ${message}\n`
    fs.appendFileSync(logFile, line)
  } catch (e) {
    // silently fail if we can't write
  }
}

export function getLogFilePath() {
  return logFile
}
