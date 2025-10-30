import type { SafeGratitudeJarEntry } from "./safeGratitudeJarEntry.type.js";

export type PaginatedSafeGratitudeJarEntries = {
  entries: SafeGratitudeJarEntry[];
  hasMore: boolean;
  nextCursor?: string; // gratitude_id of the last entry for the next page
}