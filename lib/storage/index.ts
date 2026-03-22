// ---------------------------------------------------------------------------
// Storage – Active Provider Export
//
// The active provider is selected via the STORAGE_PROVIDER environment
// variable.  Currently supported values:
//
//   "local"  (default) – saves files to public/uploads/
//
// Future providers (e.g. "s3", "r2") can be added here without changing any
// call-sites in the application – they just need to implement StorageProvider.
// ---------------------------------------------------------------------------

import type { StorageProvider } from "./provider.interface";
import { localStorageProvider } from "./local.provider";

const providerName = process.env.STORAGE_PROVIDER ?? "local";

function resolveProvider(): StorageProvider {
  switch (providerName) {
    case "local":
      return localStorageProvider;

    // Placeholder for future cloud providers:
    // case "s3":
    //   return s3StorageProvider;
    // case "r2":
    //   return r2StorageProvider;

    default:
      console.warn(
        `[storage] Unknown STORAGE_PROVIDER "${providerName}". Falling back to "local".`,
      );
      return localStorageProvider;
  }
}

/** The active storage provider singleton. */
export const storage: StorageProvider = resolveProvider();

export type { StorageProvider } from "./provider.interface";
