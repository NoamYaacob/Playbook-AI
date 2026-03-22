// ---------------------------------------------------------------------------
// Storage Provider Interface
//
// Any storage backend (local filesystem, S3, Cloudflare R2, etc.) must
// implement this interface so the rest of the application remains decoupled
// from the underlying storage mechanism.
// ---------------------------------------------------------------------------

export interface StorageProvider {
  /**
   * Uploads a file to the storage backend.
   *
   * @param file - Browser File (or Node.js Blob) to upload.
   * @param path - Relative path / key under which to store the file.
   *               E.g. "screenshots/trade-abc123.png"
   * @returns An object containing the public URL and the storage key.
   */
  upload(file: File, path: string): Promise<{ url: string; key: string }>;

  /**
   * Permanently deletes a file from the storage backend.
   *
   * @param key - The storage key returned from a prior upload() call.
   */
  delete(key: string): Promise<void>;

  /**
   * Returns the public URL for a stored file without making a network request.
   *
   * @param key - The storage key returned from a prior upload() call.
   */
  getUrl(key: string): string;
}
