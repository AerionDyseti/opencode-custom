import { Database } from "bun:sqlite"
import type { StorageBackend } from "./backend"
import { Log } from "../util/log"
import { NamedError } from "../util/error"
import z from "zod"

const log = Log.create({ service: "sqlite-backend" })

const NotFoundError = NamedError.create(
  "NotFoundError",
  z.object({
    message: z.string(),
  }),
)

/**
 * SQLite storage backend
 *
 * Stores all data in a single SQLite database with JSON blobs.
 * Schema:
 * - key: Hierarchical key (e.g., "session/proj123/sess456")
 * - type: First component of key (e.g., "session", "message", "part")
 * - parent_key: Parent key for hierarchical queries
 * - data: JSON blob of the actual content
 * - created_at, updated_at: Timestamps
 */
export class SqliteBackend implements StorageBackend.Backend {
  private db: Database

  constructor(dbPath: string) {
    log.info("initializing sqlite backend", { dbPath })

    // Create database with WAL mode for better concurrency
    this.db = new Database(dbPath, { create: true })
    this.db.exec("PRAGMA journal_mode = WAL")
    this.db.exec("PRAGMA synchronous = NORMAL")

    this.initSchema()
  }

  private initSchema() {
    // Create main storage table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS storage (
        key TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        parent_key TEXT,
        data TEXT NOT NULL,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      )
    `)

    // Create indexes for fast lookups
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_type ON storage(type)`)
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_parent_key ON storage(parent_key)`)
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_updated_at ON storage(updated_at DESC)`)

    log.info("schema initialized")
  }

  async read<T>(key: string[]): Promise<T> {
    const keyStr = key.join("/")

    const stmt = this.db.query<{ data: string }, string>("SELECT data FROM storage WHERE key = ?")
    const row = stmt.get(keyStr)

    if (!row) {
      throw new NotFoundError({
        message: `Resource not found: ${keyStr}`,
      })
    }

    return JSON.parse(row.data) as T
  }

  async write<T>(key: string[], content: T): Promise<void> {
    const keyStr = key.join("/")
    const type = key[0]
    const parentKey = key.length > 1 ? key.slice(0, -1).join("/") : null
    const data = JSON.stringify(content)

    const stmt = this.db.query(`
      INSERT INTO storage (key, type, parent_key, data, updated_at)
      VALUES (?, ?, ?, ?, unixepoch())
      ON CONFLICT(key) DO UPDATE SET 
        data = excluded.data,
        updated_at = unixepoch()
    `)

    stmt.run(keyStr, type, parentKey, data)
  }

  async update<T>(key: string[], fn: (draft: T) => void): Promise<T> {
    const content = await this.read<T>(key)
    fn(content)
    await this.write(key, content)
    return content
  }

  async remove(key: string[]): Promise<void> {
    const keyStr = key.join("/")

    // Remove the key and all children (keys that start with keyStr/)
    const stmt = this.db.query(`
      DELETE FROM storage 
      WHERE key = ? OR key LIKE ?
    `)

    stmt.run(keyStr, `${keyStr}/%`)
  }

  async list(prefix: string[]): Promise<string[][]> {
    const prefixStr = prefix.join("/")
    const pattern = prefixStr ? `${prefixStr}/%` : "%"

    const stmt = this.db.query<{ key: string }, string>("SELECT key FROM storage WHERE key LIKE ? ORDER BY key")
    const rows = stmt.all(pattern)

    return rows.map((row) => row.key.split("/"))
  }

  async close(): Promise<void> {
    log.info("closing database")
    this.db.close()
  }
}
