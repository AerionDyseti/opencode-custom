import path from "path"
import fs from "fs/promises"
import type { StorageBackend } from "./backend"
import { Lock } from "../util/lock"
import { NamedError } from "../util/error"
import z from "zod"

const NotFoundError = NamedError.create(
  "NotFoundError",
  z.object({
    message: z.string(),
  }),
)

/**
 * JSON file storage backend
 *
 * Original storage implementation using individual JSON files.
 * File structure: {dir}/{key[0]}/{key[1]}/.../{key[n]}.json
 */
export class JsonBackend implements StorageBackend.Backend {
  constructor(private dir: string) {}

  async read<T>(key: string[]): Promise<T> {
    const target = path.join(this.dir, ...key) + ".json"
    return this.withErrorHandling(async () => {
      using _ = await Lock.read(target)
      const result = await Bun.file(target).json()
      return result as T
    })
  }

  async write<T>(key: string[], content: T): Promise<void> {
    const target = path.join(this.dir, ...key) + ".json"
    return this.withErrorHandling(async () => {
      using _ = await Lock.write(target)
      await Bun.write(target, JSON.stringify(content, null, 2))
    })
  }

  async update<T>(key: string[], fn: (draft: T) => void): Promise<T> {
    const target = path.join(this.dir, ...key) + ".json"
    return this.withErrorHandling(async () => {
      using _ = await Lock.write(target)
      const content = await Bun.file(target).json()
      fn(content)
      await Bun.write(target, JSON.stringify(content, null, 2))
      return content as T
    })
  }

  async remove(key: string[]): Promise<void> {
    const target = path.join(this.dir, ...key) + ".json"
    return this.withErrorHandling(async () => {
      await fs.unlink(target).catch(() => {})
    })
  }

  async list(prefix: string[]): Promise<string[][]> {
    try {
      const glob = new Bun.Glob("**/*")
      const result = await Array.fromAsync(
        glob.scan({
          cwd: path.join(this.dir, ...prefix),
          onlyFiles: true,
        }),
      ).then((results) => results.map((x) => [...prefix, ...x.slice(0, -5).split(path.sep)]))
      result.sort()
      return result
    } catch {
      return []
    }
  }

  private async withErrorHandling<T>(body: () => Promise<T>) {
    return body().catch((e) => {
      if (!(e instanceof Error)) throw e
      const errnoException = e as NodeJS.ErrnoException
      if (errnoException.code === "ENOENT") {
        throw new NotFoundError({ message: `Resource not found: ${errnoException.path}` })
      }
      throw e
    })
  }
}
