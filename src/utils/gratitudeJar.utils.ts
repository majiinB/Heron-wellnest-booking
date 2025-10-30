import type { GratitudeEntry } from "../models/gratitudeEntry.model.js";
import { AppError } from "../types/appError.type.js";
import type { EncryptedField } from "../types/encryptedField.type.js";
import type { SafeGratitudeJarEntry } from "../types/safeGratitudeJarEntry.type.js";

/**
 * Converts an encrypted gratitude jar entry into a safe, decrypted format.
 *
 * Decrypts the `content_encrypted` field of the provided
 * `GratitudeEntry` using the given `decrypt` function, and returns a `SafeGratitudeJarEntry`
 * with the decrypted `content` field. If decryption fails, throws an
 * `AppError` with a 500 status code.
 *
 * @param entry - The encrypted gratitude jar entry to be converted.
 * @param decrypt - A function that decrypts a field containing `iv`, `content`, and `tag`.
 * @returns A `SafeGratitudeJarEntry` with decrypted `content`.
 * @throws {AppError} If decryption fails.
 */
export function toSafeGratitudeJarEntry(
  entry: GratitudeEntry, 
  decrypt: (field: EncryptedField) => string): SafeGratitudeJarEntry {
  try {
    const { content_encrypted, ...rest } = entry;
    return {
      ...rest,
      content: decrypt(content_encrypted),
    };
  } catch (error) {
    throw new AppError(
      500,
      'DECRYPTION_ERROR',
      'Failed to decrypt gratitude jar entry',
      true
    );
  }
}

/**
 * Converts an array of `GratitudeEntry` objects into an array of `SafeGratitudeJarEntry` objects,
 * ensuring that sensitive information is handled according to the provided key.
 *
 * @param entries - The array of gratitude entries to be sanitized.
 * @param decrypt - A function that decrypts a field containing `iv`, `content`, and `tag`.
 * @returns An array of sanitized gratitude entries.
 */
export function toSafeGratitudeJarEntries(
  entries: GratitudeEntry[],
  decrypt: (field: EncryptedField) => string): SafeGratitudeJarEntry[] {
  return entries.map(e => toSafeGratitudeJarEntry(e, decrypt));
}
