/**
 * Storage backend abstraction
 *
 * Defines the interface that all storage backends must implement.
 * This allows swapping between JSON files, SQLite, or other storage mechanisms.
 */

export namespace StorageBackend {
  /**
   * Backend interface that all storage implementations must fulfill
   */
  export interface Backend {
    /**
     * Read data by key
     * @throws NotFoundError if key doesn't exist
     */
    read<T>(key: string[]): Promise<T>

    /**
     * Write data to key (upsert)
     */
    write<T>(key: string[], content: T): Promise<void>

    /**
     * Update existing data by applying a mutation function
     * @throws NotFoundError if key doesn't exist
     */
    update<T>(key: string[], fn: (draft: T) => void): Promise<T>

    /**
     * Remove data by key (and any children)
     */
    remove(key: string[]): Promise<void>

    /**
     * List all keys matching a prefix
     * Returns array of key arrays in sorted order
     */
    list(prefix: string[]): Promise<string[][]>

    /**
     * Close/cleanup backend resources (optional)
     */
    close?(): Promise<void>
  }
}
