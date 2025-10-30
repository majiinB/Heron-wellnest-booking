import type { GratitudeEntry } from "../models/gratitudeEntry.model.js";
import type { JournalEntry } from "../models/journalEntry.model.js";

/**
 * @description Represents a safe version of a GratitudeEntry with decrypted content.
 * 
 * This type omits the `content_encrypted` property from `GratitudeEntry`
 * and replaces it with a plain `content` string containing the decrypted entry.
 * 
 * @file safeGratitudeJarEntry.type.ts
 * 
 * @author Arthur M. Artugue
 * @created 2025-10-02
 * @updated 2025-10-02
 */
export type SafeGratitudeJarEntry = Omit<GratitudeEntry, "content_encrypted" > & {
  content: string;
};