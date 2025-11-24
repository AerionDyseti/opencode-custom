import { Database } from "bun:sqlite"
import type { StorageBackend } from "./backend"
import { Log } from "../util/log"
import { NamedError } from "../util/error"
import z from "zod"
import path from "path"
import { existsSync, mkdirSync } from "fs"
import fs from "fs/promises"

const log = Log.create({ service: "multi-sqlite-backend" })

const NotFoundError = NamedError.create(
  "NotFoundError",
  z.object({
    message: z.string(),
  }),
)

/**
 * Multi-database SQLite backend
 * 
 * Per-project storage model:
 * - Stores data in project's .opencode/ directory
 * - One sessions.db for session metadata per project
 * - One {sessionID}.db per session for messages/parts
 * - Embeddings stored alongside messages (future: sqlite-vec)
 * 
 * Structure:
 * {project-root}/.opencode/
 *   sessions.db              <- Session metadata only
 *   sessions/
 *     {sessionID}.db         <- Messages, parts, embeddings for session
 *     {sessionID2}.db
 * 
 * Philosophy: Per-project by default, global only for truly global data
 */
export class MultiSqliteBackend implements StorageBackend.Backend {
  private baseDir: string
  private sessionsMetaDB: Database
  private sessionDBs = new Map<string, Database>()
  private messageSessionCache = new Map<string, string>() // messageID -> sessionID

  constructor(projectDir: string) {
    this.baseDir = path.join(projectDir, ".opencode")
    log.info("initializing multi-sqlite backend", { baseDir: this.baseDir })
    
    this.ensureDirectories()
    this.sessionsMetaDB = this.initSessionsMetaDB()
  }

  private ensureDirectories() {
    // Create .opencode/ and .opencode/sessions/ directories
    const dirs = [this.baseDir, path.join(this.baseDir, "sessions")]
    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
    }
  }

  private initSessionsMetaDB(): Database {
    const dbPath = path.join(this.baseDir, "sessions.db")
    const db = new Database(dbPath, { create: true })
    
    db.exec("PRAGMA journal_mode = WAL")
    db.exec("PRAGMA synchronous = NORMAL")

    // Simple table for session metadata
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      )
    `)

    db.exec(`CREATE INDEX IF NOT EXISTS idx_project_id ON sessions(project_id)`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_updated_at ON sessions(updated_at DESC)`)

    return db
  }

  private getSessionDB(sessionID: string): Database {
    // Return cached DB if already open
    if (this.sessionDBs.has(sessionID)) {
      return this.sessionDBs.get(sessionID)!
    }

    // Open new session DB
    const dbPath = path.join(this.baseDir, "sessions", `${sessionID}.db`)
    const db = new Database(dbPath, { create: true })

    db.exec("PRAGMA journal_mode = WAL")
    db.exec("PRAGMA synchronous = NORMAL")

    // Schema for messages and parts
    db.exec(`
      CREATE TABLE IF NOT EXISTS storage (
        key TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      )
    `)

    db.exec(`CREATE INDEX IF NOT EXISTS idx_type ON storage(type)`)

    // Future: Embedding table for sqlite-vec
    // When ready, just add:
    // db.exec(`
    //   CREATE VIRTUAL TABLE IF NOT EXISTS embeddings USING vec0(
    //     part_id TEXT PRIMARY KEY,
    //     embedding FLOAT[1536]
    //   )
    // `)

    this.sessionDBs.set(sessionID, db)
    return db
  }

  private parseKey(key: string[]): { type: string; sessionID?: string; id?: string } {
    // Key patterns:
    // ["session", projectID, sessionID] -> sessions.db
    // ["message", sessionID, messageID] -> session-{sessionID}.db
    // ["part", messageID, partID] -> session-{sessionID}.db
    // ["session_diff", sessionID] -> sessions.db or session DB

    const [type, ...rest] = key

    if (type === "session") {
      return { type: "session", sessionID: rest[1] }
    }

    if (type === "message") {
      return { type: "message", sessionID: rest[0], id: rest[1] }
    }

    if (type === "part") {
      // Parts have sessionID embedded in their data, we need to look it up
      // For now, we'll maintain a message-to-session cache
      const messageID = rest[0]
      const partID = rest[1]
      const sessionID = this.messageSessionCache.get(messageID)
      return { type: "part", sessionID, id: partID }
    }

    if (type === "session_diff") {
      return { type: "session_diff", sessionID: rest[0] }
    }

    return { type }
  }

  async read<T>(key: string[]): Promise<T> {
    const keyStr = key.join("/")
    const parsed = this.parseKey(key)

    if (parsed.type === "session") {
      // Read from sessions.db
      const stmt = this.sessionsMetaDB.query<{ data: string }, string>(
        "SELECT data FROM sessions WHERE session_id = ?"
      )
      const row = stmt.get(parsed.sessionID!)

      if (!row) {
        throw new NotFoundError({ message: `Resource not found: ${keyStr}` })
      }

      return JSON.parse(row.data) as T
    }

    if (parsed.type === "message" || parsed.type === "part") {
      // Read from session-specific DB
      if (!parsed.sessionID) {
        throw new Error(`Cannot read ${parsed.type}: session unknown`)
      }
      const db = this.getSessionDB(parsed.sessionID)

      const stmt = db.query<{ data: string }, string>("SELECT data FROM storage WHERE key = ?")
      const row = stmt.get(keyStr)

      if (!row) {
        throw new NotFoundError({ message: `Resource not found: ${keyStr}` })
      }

      return JSON.parse(row.data) as T
    }

    throw new Error(`Unknown key type: ${parsed.type}`)
  }

  async write<T>(key: string[], content: T): Promise<void> {
    const keyStr = key.join("/")
    const parsed = this.parseKey(key)
    const data = JSON.stringify(content)

    if (parsed.type === "session") {
      // Write to sessions.db
      const projectID = key[1]
      const sessionID = key[2]

      const stmt = this.sessionsMetaDB.query(`
        INSERT INTO sessions (session_id, project_id, data, updated_at)
        VALUES (?, ?, ?, unixepoch())
        ON CONFLICT(session_id) DO UPDATE SET 
          data = excluded.data,
          updated_at = unixepoch()
      `)

      stmt.run(sessionID, projectID, data)
      return
    }

    if (parsed.type === "message") {
      // Write to session-specific DB
      const sessionID = parsed.sessionID!
      const messageID = parsed.id!

      // Cache message-to-session mapping for parts
      this.messageSessionCache.set(messageID, sessionID)

      const db = this.getSessionDB(sessionID)

      const stmt = db.query(`
        INSERT INTO storage (key, type, data, updated_at)
        VALUES (?, ?, ?, unixepoch())
        ON CONFLICT(key) DO UPDATE SET 
          data = excluded.data,
          updated_at = unixepoch()
      `)

      stmt.run(keyStr, parsed.type, data)
      return
    }

    if (parsed.type === "part") {
      // Write to session-specific DB (sessionID from cache)
      if (!parsed.sessionID) {
        throw new Error(`Cannot write part: session unknown for message ${key[1]}`)
      }

      const db = this.getSessionDB(parsed.sessionID)

      const stmt = db.query(`
        INSERT INTO storage (key, type, data, updated_at)
        VALUES (?, ?, ?, unixepoch())
        ON CONFLICT(key) DO UPDATE SET 
          data = excluded.data,
          updated_at = unixepoch()
      `)

      stmt.run(keyStr, parsed.type, data)
      return
    }

    throw new Error(`Unknown key type: ${parsed.type}`)
  }

  async update<T>(key: string[], fn: (draft: T) => void): Promise<T> {
    const content = await this.read<T>(key)
    fn(content)
    await this.write(key, content)
    return content
  }

  async remove(key: string[]): Promise<void> {
    const parsed = this.parseKey(key)

    if (parsed.type === "session") {
      const sessionID = parsed.sessionID!

      // Remove from sessions.db
      const stmt = this.sessionsMetaDB.query("DELETE FROM sessions WHERE session_id = ?")
      stmt.run(sessionID)

      // Close and delete session DB file
      const db = this.sessionDBs.get(sessionID)
      if (db) {
        db.close()
        this.sessionDBs.delete(sessionID)
      }

      const dbPath = path.join(this.baseDir, "sessions", `${sessionID}.db`)
      await fs.unlink(dbPath).catch(() => {})
      // Also remove WAL files
      await fs.unlink(`${dbPath}-wal`).catch(() => {})
      await fs.unlink(`${dbPath}-shm`).catch(() => {})

      return
    }

    if (parsed.type === "message" || parsed.type === "part") {
      const keyStr = key.join("/")
      if (!parsed.sessionID) {
        throw new Error(`Cannot remove ${parsed.type}: session unknown`)
      }
      const db = this.getSessionDB(parsed.sessionID)

      const stmt = db.query("DELETE FROM storage WHERE key = ? OR key LIKE ?")
      stmt.run(keyStr, `${keyStr}/%`)
      return
    }
  }

  async list(prefix: string[]): Promise<string[][]> {
    const prefixStr = prefix.join("/")
    const [type] = prefix

    if (type === "session") {
      // List sessions from sessions.db
      const projectID = prefix[1]
      const stmt = this.sessionsMetaDB.query<{ session_id: string }, string>(
        "SELECT session_id FROM sessions WHERE project_id = ? ORDER BY updated_at DESC"
      )
      const rows = stmt.all(projectID)

      return rows.map((row) => ["session", projectID, row.session_id])
    }

    if (type === "message" || type === "part") {
      // List from session-specific DB
      const sessionID = prefix[1]
      const db = this.getSessionDB(sessionID)

      const pattern = prefixStr ? `${prefixStr}/%` : "%"
      const stmt = db.query<{ key: string }, string>(
        "SELECT key FROM storage WHERE key LIKE ? ORDER BY key"
      )
      const rows = stmt.all(pattern)

      return rows.map((row) => row.key.split("/"))
    }

    return []
  }



  async close(): Promise<void> {
    log.info("closing databases")

    // Close all session DBs
    for (const [sessionID, db] of this.sessionDBs.entries()) {
      db.close()
      log.info("closed session db", { sessionID })
    }
    this.sessionDBs.clear()

    // Close sessions metadata DB
    this.sessionsMetaDB.close()
  }
}
