import { google } from 'googleapis';
import type { calendar_v3 } from 'googleapis';
import { logger } from '../utils/logger.util.js';

/**
 * Google Calendar API configuration.
 *
 * This module initializes and exports the Google Calendar API client
 * for managing calendar events and appointments.
 *
 * @file googleCalendar.config.ts
 * @description Configuration for Google Calendar API integration.
 * 
 * Usage:
 * - Import `calendarClient` to interact with Google Calendar API
 * - Import `getCalendarClient` to get a fresh authenticated client
 * 
 * @remarks
 * - Requires Google Cloud credentials to be configured
 * - Uses Application Default Credentials (ADC) for authentication
 * - Scopes: calendar (full access to calendars)
 *
 * @author Arthur M. Artugue
 * @created 2025-10-29
 * @updated 2025-10-29
 * 
 * @see {@link https://developers.google.com/calendar/api/v3/reference}
 * @see {@link https://cloud.google.com/docs/authentication/application-default-credentials}
 */

/**
 * Initialize Google Calendar API client with default credentials.
 * 
 * @remarks
 * This function creates an authenticated Google Calendar client using
 * Application Default Credentials (ADC). Ensure that:
 * 1. GOOGLE_APPLICATION_CREDENTIALS environment variable is set, OR
 * 2. Running on GCP with service account attached, OR
 * 3. gcloud CLI is configured with credentials
 * 
 * @returns A promise that resolves to an authenticated Calendar API client
 * 
 * @throws Will throw an error if authentication fails
 * 
 * @example
 * ```typescript
 * const calendar = await getCalendarClient();
 * const events = await calendar.events.list({
 *   calendarId: 'primary',
 *   timeMin: new Date().toISOString(),
 *   maxResults: 10,
 *   singleEvents: true,
 *   orderBy: 'startTime',
 * });
 * ```
 */
export async function getCalendarClient(): Promise<calendar_v3.Calendar> {
  try {
    // Initialize auth client with Calendar API scope
    const auth = await google.auth.getClient({
      scopes: ['https://www.googleapis.com/auth/calendar']
    });

    // Create and return Calendar API client
    const calendar = google.calendar({ version: 'v3', auth });
    
    return calendar;
  } catch (error) {
    throw new Error('Google Calendar authentication failed. Ensure credentials are properly configured.');
  }
}

/**
 * Default Calendar API client instance.
 * 
 * @remarks
 * This is a lazy-loaded singleton instance of the Calendar API client.
 * Use this for most operations to avoid creating multiple auth clients.
 * 
 * @example
 * ```typescript
 * import { calendarClient } from './config/googleCalendar.config.js';
 * 
 * const calendar = await calendarClient;
 * const event = await calendar.events.insert({
 *   calendarId: 'primary',
 *   requestBody: {
 *     summary: 'Counseling Session',
 *     start: { dateTime: '2025-10-30T10:00:00Z' },
 *     end: { dateTime: '2025-10-30T11:00:00Z' },
 *   }
 * });
 * ```
 */
export const calendarClient = getCalendarClient();

/**
 * Google Calendar API scopes.
 * 
 * @remarks
 * Available scopes for Google Calendar API:
 * - calendar: Full access to calendars
 * - calendar.readonly: Read-only access to calendars
 * - calendar.events: Access to events
 * - calendar.events.readonly: Read-only access to events
 */
export const CALENDAR_SCOPES = {
  FULL_ACCESS: 'https://www.googleapis.com/auth/calendar',
  READONLY: 'https://www.googleapis.com/auth/calendar.readonly',
  EVENTS: 'https://www.googleapis.com/auth/calendar.events',
  EVENTS_READONLY: 'https://www.googleapis.com/auth/calendar.events.readonly',
} as const;
