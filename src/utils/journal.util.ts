import type { JournalEntry } from "../models/journalEntry.model.js";
import { AppError } from "../types/appError.type.js";
import type { EncryptedField } from "../types/encryptedField.type.js";
import type { SafeJournalEntry } from "../types/safeJournalEntry.type.js";

/**
 * Converts an encrypted journal entry into a safe, decrypted format.
 *
 * Decrypts the `title_encrypted` and `content_encrypted` fields of the provided
 * `JournalEntry` using the given `decrypt` function, and returns a `SafeJournalEntry`
 * with the decrypted `title` and `content` fields. If decryption fails, throws an
 * `AppError` with a 500 status code.
 *
 * @param entry - The encrypted journal entry to be converted.
 * @param decrypt - A function that decrypts a field containing `iv`, `content`, and `tag`.
 * @returns A `SafeJournalEntry` with decrypted `title` and `content`.
 * @throws {AppError} If decryption fails.
 */
export function toSafeJournalEntry(
  entry: JournalEntry, 
  decrypt: (field: EncryptedField) => string): SafeJournalEntry {
  try {
    const { title_encrypted, content_encrypted, wellness_state, ...rest } = entry;
    return {
      ...rest,
      title: decrypt(title_encrypted),
      content: decrypt(content_encrypted),
      wellness_state
    };
  } catch (error) {
    throw new AppError(
      500,
      'DECRYPTION_ERROR',
      'Failed to decrypt journal entry',
      true
    );
  }
}

/**
 * Converts an array of `JournalEntry` objects into an array of `SafeJournalEntry` objects,
 * ensuring that sensitive information is handled according to the provided key.
 *
 * @param entries - The array of journal entries to be sanitized.
 * @param decrypt - A function that decrypts a field containing `iv`, `content`, and `tag`.
 * @returns An array of sanitized journal entries.
 */
export function toSafeJournalEntries(
  entries: JournalEntry[],
  decrypt: (field: EncryptedField) => string): SafeJournalEntry[] {
  return entries.map(e => toSafeJournalEntry(e, decrypt));
}

/**
 * 
 * Basic heuristic to determine if a string looks like nonsense.
 * 
 * @param input - The input string to evaluate.
 * @returns True if the input looks like nonsense, false otherwise.
 */
export function looksLikeNonsense(input: string): boolean {
  const normalized = input.trim().toLowerCase();

  // Empty or too short (already validated elsewhere, but safe)
  if (normalized.length < 3) return true;

  // Contains at least one letter?
  if (!/[a-z]/.test(normalized)) return false;

  // No vowels at all (very suspicious in English/Tagalog text)
  if (!/[aeiou]/.test(normalized)) return true;

  // Keyboard smash style (lots of consecutive consonants)
  if (/[bcdfghjklmnpqrstvwxyz]{6,}/.test(normalized)) return true;

  // Excessive repetition of same char
  if (/([a-z])\1{4,}/.test(normalized)) return true;

  return false;
}

/**
 * Checks if the input string consists only of numeric characters (0-9).
 *
 * @param input - The input string to check.
 * @returns True if the input contains only numbers, false otherwise.
 */
export function isNumbersOnly(input: string): boolean {
  const trimmed = input.trim();

  // Matches:
  // - plain digits
  // - digits with spaces
  // - numbers in scientific notation (e.g. "1.23e+10")
  return /^(\d+(\.\d+)?([eE][+-]?\d+)?)$/.test(trimmed.replace(/\s+/g, ""));
}
