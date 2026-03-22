// ---------------------------------------------------------------------------
// Local Filesystem Storage Provider
//
// Stores files under <project-root>/public/uploads/.
// Served as static assets at /uploads/{key}.
//
// SERVER-ONLY – uses Node.js `fs` and `path` modules.
// ---------------------------------------------------------------------------

import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { StorageProvider } from "./provider.interface";

/** Absolute path to the uploads directory inside the Next.js public folder. */
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

class LocalStorageProvider implements StorageProvider {
  /**
   * Ensures the uploads directory (and any sub-directories) exist.
   */
  private async ensureDir(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  /**
   * Uploads a file to the local public/uploads directory.
   *
   * @param file - The File object to store.
   * @param filePath - Relative path within the uploads directory.
   *                   E.g. "screenshots/trade-abc.png"
   *                   A UUID prefix is prepended to avoid collisions.
   * @returns { url: string; key: string }
   */
  async upload(
    file: File,
    filePath: string,
  ): Promise<{ url: string; key: string }> {
    // Prepend a UUID segment to prevent filename collisions
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    const dir = path.dirname(filePath);
    const uniqueName = `${base}-${randomUUID()}${ext}`;
    const key = dir === "." ? uniqueName : `${dir}/${uniqueName}`;

    const absolutePath = path.join(UPLOADS_DIR, key);
    await this.ensureDir(absolutePath);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(absolutePath, buffer);

    return { url: this.getUrl(key), key };
  }

  /**
   * Deletes a file from the local uploads directory.
   *
   * @param key - The key returned from a prior upload() call.
   */
  async delete(key: string): Promise<void> {
    const absolutePath = path.join(UPLOADS_DIR, key);
    try {
      await fs.unlink(absolutePath);
    } catch (err) {
      // Ignore "file not found" errors; re-throw anything else
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err;
      }
    }
  }

  /**
   * Returns the public URL for a stored file.
   * Files under public/uploads are served by Next.js at /uploads/{key}.
   *
   * @param key - The storage key.
   */
  getUrl(key: string): string {
    // Normalise path separators for URL usage
    const urlPath = key.replace(/\\/g, "/");
    return `/uploads/${urlPath}`;
  }
}

export const localStorageProvider = new LocalStorageProvider();
