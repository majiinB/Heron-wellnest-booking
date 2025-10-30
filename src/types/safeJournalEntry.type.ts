import type { JournalEntry } from "../models/journalEntry.model.js";

/**
 * Safe Journal Entry Type
 * 
 * @description Defines the structure for Journal Entry with its content and title already decrypted.
 * 
 * @file safeJournal.type.ts
 * 
 * @author Arthur M. Artugue
 * @created 2025-09-25
 * @updated 2025-09-25
 */
export type SafeJournalEntry = Omit<JournalEntry, "title_encrypted" | "content_encrypted" | "mood"> & {
  title: string;
  content: string;
};