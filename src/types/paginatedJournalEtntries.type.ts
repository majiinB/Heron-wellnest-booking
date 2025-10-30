import type { SafeJournalEntry } from "./safeJournalEntry.type.js";

export type PaginatedJournalEntries = {
  entries: SafeJournalEntry[];
  hasMore: boolean;
  nextCursor?: string; // journal_id of the last entry for the next page
}