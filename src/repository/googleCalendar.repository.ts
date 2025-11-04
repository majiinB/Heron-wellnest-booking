import { calendarClient } from "../config/googleCalendar.config.js";
import { env } from "../config/env.config.js";
import type { calendar_v3 } from "googleapis";
import { logger } from "../utils/logger.util.js";
import { AppError } from "../types/appError.type.js";

/**
 * Calendar event creation data
 */
export interface CalendarEventData {
  appointment_id: string;
  student_id: string;
  student_email: string;
  counselor_id: string;
  counselor_email: string;
  department: string;
  agenda: "counseling" | "meeting" | "routine_interview" | "event";
  start_time: Date;
  end_time: Date;
}

/**
 * Repository for managing Google Calendar events.
 * 
 * @description Handles creating, updating, and deleting calendar events
 * for appointments in department-specific Google Calendars.
 * 
 * @remarks
 * - Uses department-specific calendar IDs from environment variables
 * - Enforces consistent event formatting
 * - Stores appointment metadata in extendedProperties
 * - Does not send email notifications (sendUpdates: 'none')
 * 
 * @file googleCalendar.repository.ts
 * 
 * @author Arthur M. Artugue
 * @created 2025-10-31
 * @updated 2025-10-31
 */
export class GoogleCalendarRepository {
  
  /**
   * Gets the calendar ID for a specific department.
   * 
   * @param department - The department name
   * @returns The Google Calendar ID for the department
   * 
   * @remarks
   * Maps full department names to their corresponding environment variable keys:
   * - COLLEGE OF COMPUTING AND INFORMATION SCIENCES → CCIS_CALENDAR_ID
   * - COLLEGE OF LIBERAL ARTS AND SCIENCES → CLAS_CALENDAR_ID
   * - COLLEGE OF HUMAN KINETICS → CHK_CALENDAR_ID
   * - COLLEGE OF BUSINESS AND FINANCIAL SCIENCES → CBFS_CALENDAR_ID
   * - COLLEGE OF INNOVATIVE TEACHER EDUCATION → CITE_CALENDAR_ID
   * - COLLEGE OF GOVERNANCE AND PUBLIC POLICY → CGPP_CALENDAR_ID
   * - COLLEGE OF CONSTRUCTION SCIENCES AND ENGINEERING → CCSE_CALENDAR_ID
   * - COLLEGE OF ENGINEERING TECHNOLOGY → CET_CALENDAR_ID
   * - COLLEGE OF TOURISM AND HOSPITALITY MANAGEMENT → CTHM_CALENDAR_ID
   */
  private getDepartmentCalendarId(department: string): string {
    // Map full department names to their abbreviated environment variable keys
    const departmentMap: Record<string, keyof typeof env> = {
      'COLLEGE OF COMPUTING AND INFORMATION SCIENCES': 'CCIS_CALENDAR_ID',
      'COLLEGE OF LIBERAL ARTS AND SCIENCES': 'CLAS_CALENDAR_ID',
      'COLLEGE OF HUMAN KINETICS': 'CHK_CALENDAR_ID',
      'COLLEGE OF BUSINESS AND FINANCIAL SCIENCES': 'CBFS_CALENDAR_ID',
      'COLLEGE OF INNOVATIVE TEACHER EDUCATION': 'CITE_CALENDAR_ID',
      'COLLEGE OF GOVERNANCE AND PUBLIC POLICY': 'CGPP_CALENDAR_ID',
      'COLLEGE OF CONSTRUCTION SCIENCES AND ENGINEERING': 'CCSE_CALENDAR_ID',
      'COLLEGE OF ENGINEERING TECHNOLOGY': 'CET_CALENDAR_ID',
      'COLLEGE OF TOURISM AND HOSPITALITY MANAGEMENT': 'CTHM_CALENDAR_ID',
    };

    const normalizedDepartment = department.toUpperCase().trim();
    const envKey = departmentMap[normalizedDepartment];
    
    if (!envKey) {
      throw new AppError(
        400,
        "UNKNOWN_DEPARTMENT",
        `Unknown department: ${department}. Please use a valid department name.`,
        true
      );
    }

    const calendarId = env[envKey];
    
    if (!calendarId) {
      throw new AppError(
        400,
        "CALENDAR_ID_NOT_CONFIGURED",
        `Calendar ID not configured for department: ${department}. Please set ${envKey} in your .env file`,
        true
      );
    }
    
    return calendarId as string;
  }

  /**
   * Gets a human-readable display name for the agenda type.
   * 
   * @param agenda - The agenda type
   * @returns Display name for the agenda
   */
  private getAgendaDisplayName(agenda: string): string {
    const agendaNames: Record<string, string> = {
      counseling: 'Counseling Session',
      meeting: 'Meeting',
      routine_interview: 'Routine Interview',
      event: 'Event',
    };
    return agendaNames[agenda] || agenda;
  }

  /**
   * Gets the color ID for an event based on agenda type.
   * 
   * @param agenda - The agenda type
   * @returns Google Calendar color ID (1-11)
   * 
   * @remarks
   * Color IDs:
   * - 1: Lavender
   * - 2: Sage
   * - 3: Grape
   * - 4: Flamingo
   * - 5: Banana
   * - 6: Tangerine
   * - 7: Peacock
   * - 8: Graphite
   * - 9: Blueberry
   * - 10: Basil
   * - 11: Tomato
   */
  private getColorByAgenda(agenda: string): string {
    const colors: Record<string, string> = {
      counseling: '9', // Blueberry - most important
      meeting: '7', // Peacock - formal
      routine_interview: '5', // Banana - scheduled
      event: '10', // Basil - general
    };
    return colors[agenda] || '9';
  }

  /**
   * Creates a calendar event from an appointment.
   * 
   * @param eventData - The appointment and participant data
   * @returns The created Google Calendar event with the event ID
   * 
   * @remarks
   * - Creates event in department-specific calendar
   * - Student and counselor emails are included in description and extendedProperties
   * - Stores appointment metadata in extendedProperties
   * - Does not send email invitations or add attendees (to avoid Domain-Wide Delegation requirement)
   * 
   * @example
   * ```typescript
   * const repo = new GoogleCalendarRepository();
   * const event = await repo.createEvent({
   *   appointment_id: appointment.appointment_id,
   *   student_id: student.user_id,
   *   student_email: student.email,
   *   counselor_id: counselor.user_id,
   *   counselor_email: counselor.email,
   *   department: appointment.department,
   *   agenda: appointment.agenda,
   *   start_time: appointment.start_time,
   *   end_time: appointment.end_time
   * });
   * console.log(`Event created: ${event.id}`);
   * ```
   */
  async createEvent(eventData: CalendarEventData): Promise<calendar_v3.Schema$Event> {
    try {
      const calendar = await calendarClient;
      const calendarId = this.getDepartmentCalendarId(eventData.department);

      const response = await calendar.events.insert({
        calendarId: calendarId,
        requestBody: {
          summary: `${this.getAgendaDisplayName(eventData.agenda)} - ${eventData.student_email}`,
          description: `
${this.getAgendaDisplayName(eventData.agenda)}

Student: ${eventData.student_email}
Counselor: ${eventData.counselor_email}
Department: ${eventData.department}

Appointment ID: ${eventData.appointment_id}
          `.trim(),
          start: { 
            dateTime: eventData.start_time.toISOString(),
            timeZone: 'Asia/Manila' 
          },
          end: { 
            dateTime: eventData.end_time.toISOString(),
            timeZone: 'Asia/Manila'
          },
          // Note: Attendees removed to avoid Domain-Wide Delegation requirement
          // Student and counselor info is preserved in the description and extendedProperties
          extendedProperties: {
            private: {
              appointment_id: eventData.appointment_id,
              student_id: eventData.student_id,
              student_email: eventData.student_email,
              counselor_id: eventData.counselor_id,
              counselor_email: eventData.counselor_email,
              department: eventData.department,
              agenda: eventData.agenda,
            },
          },
          colorId: this.getColorByAgenda(eventData.agenda)
        },
        sendUpdates: 'none', // Don't send email invitations
      });

      if (!response.data.id) {
        throw new AppError(
          500,
          "CALENDAR_EVENT_CREATION_FAILED",
          'Failed to create calendar event - no event ID returned',
          true
        );
      }

      logger.info(`Calendar event created: ${response.data.id} for appointment ${eventData.appointment_id}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to create calendar event:', error);
      throw new Error(`Failed to create calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Updates an existing calendar event.
   * 
   * @param googleEventId - The Google Calendar event ID
   * @param department - The department name (to get calendar ID)
   * @param eventData - The updated appointment data
   * @returns The updated Google Calendar event
   * 
   * @example
   * ```typescript
   * const repo = new GoogleCalendarRepository();
   * await repo.updateEvent(googleEventId, 'CCIS', updatedEventData);
   * ```
   */
  async updateEvent(
    googleEventId: string,
    department: string,
    eventData: CalendarEventData
  ): Promise<calendar_v3.Schema$Event> {
    try {
      const calendar = await calendarClient;
      const calendarId = this.getDepartmentCalendarId(department);

      const response = await calendar.events.update({
        calendarId: calendarId,
        eventId: googleEventId,
        requestBody: {
          summary: `${this.getAgendaDisplayName(eventData.agenda)} - ${eventData.student_email}`,
          description: `
${this.getAgendaDisplayName(eventData.agenda)}

Student: ${eventData.student_email}
Counselor: ${eventData.counselor_email}
Department: ${eventData.department}

Appointment ID: ${eventData.appointment_id}
          `.trim(),
          start: { 
            dateTime: eventData.start_time.toISOString(),
            timeZone: 'Asia/Manila'
          },
          end: { 
            dateTime: eventData.end_time.toISOString(),
            timeZone: 'Asia/Manila'
          },
          // Note: Attendees removed to avoid Domain-Wide Delegation requirement
          // Student and counselor info is preserved in the description and extendedProperties
          extendedProperties: {
            private: {
              appointment_id: eventData.appointment_id,
              student_id: eventData.student_id,
              student_email: eventData.student_email,
              counselor_id: eventData.counselor_id,
              counselor_email: eventData.counselor_email,
              department: eventData.department,
              agenda: eventData.agenda,
            },
          },
          colorId: this.getColorByAgenda(eventData.agenda),
        },
        sendUpdates: 'none',
      });

      logger.info(`Calendar event updated: ${googleEventId} for appointment ${eventData.appointment_id}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to update calendar event:', error);
      throw new Error(`Failed to update calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deletes a calendar event.
   * 
   * @param googleEventId - The Google Calendar event ID
   * @param department - The department name (to get calendar ID)
   * 
   * @example
   * ```typescript
   * const repo = new GoogleCalendarRepository();
   * await repo.deleteEvent(googleEventId, 'CCIS');
   * ```
   */
  async deleteEvent(googleEventId: string, department: string): Promise<void> {
    try {
      const calendar = await calendarClient;
      const calendarId = this.getDepartmentCalendarId(department);

      await calendar.events.delete({
        calendarId: calendarId,
        eventId: googleEventId,
        sendUpdates: 'none',
      });

      logger.info(`Calendar event deleted: ${googleEventId}`);
    } catch (error) {
      logger.error('Failed to delete calendar event:', error);
      throw new Error(`Failed to delete calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets a calendar event by ID.
   * 
   * @param googleEventId - The Google Calendar event ID
   * @param department - The department name (to get calendar ID)
   * @returns The calendar event or null if not found
   * 
   * @example
   * ```typescript
   * const repo = new GoogleCalendarRepository();
   * const event = await repo.getEvent(googleEventId, 'CCIS');
   * ```
   */
  async getEvent(googleEventId: string, department: string): Promise<calendar_v3.Schema$Event | null> {
    try {
      const calendar = await calendarClient;
      const calendarId = this.getDepartmentCalendarId(department);

      const response = await calendar.events.get({
        calendarId: calendarId,
        eventId: googleEventId,
      });

      return response.data;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      logger.error('Failed to get calendar event:', error);
      throw new Error(`Failed to get calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Checks if the department calendar has any busy periods during the proposed time slot.
   * Uses Google Calendar's FreeBusy API.
   * 
   * @param department - The department name (to check department calendar)
   * @param proposedStart - The proposed start time
   * @param proposedEnd - The proposed end time
   * @returns True if the time slot is available, false if busy
   * 
   * @remarks
   * Only checks the department calendar where all appointments are stored.
   * Does not check counselor's personal calendar.
   * 
   * @example
   * ```typescript
   * const repo = new GoogleCalendarRepository();
   * const isAvailable = await repo.checkAvailability('CCIS', startTime, endTime);
   * ```
   */
  async checkAvailability(
    department: string,
    proposedStart: Date,
    proposedEnd: Date
  ): Promise<boolean> {
    try {
      const calendar = await calendarClient;
      const departmentCalendarId = this.getDepartmentCalendarId(department);

      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: proposedStart.toISOString(),
          timeMax: proposedEnd.toISOString(),
          items: [
            { id: departmentCalendarId }, // Department calendar only
          ],
        },
      });

      // Check busy periods in department calendar
      const departmentBusyPeriods = response.data.calendars?.[departmentCalendarId]?.busy || [];

      if (departmentBusyPeriods.length > 0) {
        logger.info(`Department ${department} calendar has ${departmentBusyPeriods.length} conflicting event(s)`);
      }

      return departmentBusyPeriods.length === 0;
    } catch (error) {
      logger.error('Failed to check calendar availability:', error);
      // Return true to allow the request if calendar check fails
      logger.warn(`Calendar availability check failed for department ${department}, proceeding anyway`);
      return true;
    }
  }

  /**
   * Gets events by appointment ID from extended properties.
   * 
   * @param department - The department name
   * @param appointmentId - The appointment ID to search for
   * @returns Array of matching calendar events
   * 
   * @remarks
   * This is useful for finding the Google Calendar event associated with an appointment.
   * 
   * @example
   * ```typescript
   * const repo = new GoogleCalendarRepository();
   * const events = await repo.getEventsByAppointmentId('CCIS', appointmentId);
   * ```
   */
  async getEventsByAppointmentId(
    department: string,
    appointmentId: string
  ): Promise<calendar_v3.Schema$Event[]> {
    try {
      const calendar = await calendarClient;
      const calendarId = this.getDepartmentCalendarId(department);

      const response = await calendar.events.list({
        calendarId: calendarId,
        privateExtendedProperty: [`appointment_id=${appointmentId}`],
        maxResults: 10,
      });

      return response.data.items || [];
    } catch (error) {
      logger.error('Failed to get events by appointment ID:', error);
      throw new Error(`Failed to get events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets all events where a specific user (by email) appears in the summary or description.
   * 
   * @param department - The department name
   * @param email - The user's email address
   * @param timeMin - Optional start time to filter events (defaults to now)
   * @param timeMax - Optional end time to filter events
   * @param maxResults - Maximum number of events to return (defaults to 100)
   * @returns Array of calendar events where the user's email appears
   * 
   * @remarks
   * Note: This method searches the summary and description since attendees are not used
   * to avoid Domain-Wide Delegation requirements. Use `getEventsByUserId` for more
   * accurate results using extended properties.
   * 
   * @example
   * ```typescript
   * const repo = new GoogleCalendarRepository();
   * const events = await repo.getEventsByAttendeeEmail('CCIS', 'student@example.com');
   * ```
   */
  async getEventsByAttendeeEmail(
    department: string,
    email: string,
    timeMin?: Date,
    timeMax?: Date,
    maxResults: number = 100
  ): Promise<calendar_v3.Schema$Event[]> {
    try {
      const calendar = await calendarClient;
      const calendarId = this.getDepartmentCalendarId(department);

      const response = await calendar.events.list({
        calendarId: calendarId,
        timeMin: timeMin?.toISOString() || new Date().toISOString(),
        timeMax: timeMax?.toISOString(),
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      // Filter events where the email appears in summary or description
      // Note: Attendees are not used to avoid Domain-Wide Delegation requirement
      const filteredEvents = (response.data.items || []).filter(event => {
        const summary = event.summary?.toLowerCase() || '';
        const description = event.description?.toLowerCase() || '';
        const searchEmail = email.toLowerCase();
        return summary.includes(searchEmail) || description.includes(searchEmail);
      });

      return filteredEvents;
    } catch (error) {
      logger.error('Failed to get events by attendee email:', error);
      throw new Error(`Failed to get events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets all events where a specific user (by user ID) is involved.
   * Uses the extended properties to search for student_id or counselor_id.
   * 
   * @param department - The department name
   * @param userId - The user's ID (UUID)
   * @param timeMin - Optional start time to filter events (defaults to now)
   * @param timeMax - Optional end time to filter events
   * @param maxResults - Maximum number of events to return (defaults to 100)
   * @returns Array of calendar events where the user is involved
   * 
   * @example
   * ```typescript
   * const repo = new GoogleCalendarRepository();
   * const events = await repo.getEventsByUserId('CCIS', userId);
   * ```
   */
  async getEventsByUserId(
    department: string,
    userId: string,
    timeMin?: Date,
    timeMax?: Date,
    maxResults: number = 100
  ): Promise<calendar_v3.Schema$Event[]> {
    try {
      const calendar = await calendarClient;
      const calendarId = this.getDepartmentCalendarId(department);

      // Search for events where user is either student or counselor
      const [studentEvents, counselorEvents] = await Promise.all([
        calendar.events.list({
          calendarId: calendarId,
          privateExtendedProperty: [`student_id=${userId}`],
          timeMin: timeMin?.toISOString() || new Date().toISOString(),
          timeMax: timeMax?.toISOString(),
          maxResults: maxResults,
          singleEvents: true,
          orderBy: 'startTime',
        }),
        calendar.events.list({
          calendarId: calendarId,
          privateExtendedProperty: [`counselor_id=${userId}`],
          timeMin: timeMin?.toISOString() || new Date().toISOString(),
          timeMax: timeMax?.toISOString(),
          maxResults: maxResults,
          singleEvents: true,
          orderBy: 'startTime',
        }),
      ]);

      // Combine and deduplicate events
      const allEvents = [...(studentEvents.data.items || []), ...(counselorEvents.data.items || [])];
      const uniqueEvents = Array.from(
        new Map(allEvents.map(event => [event.id, event])).values()
      );

      // Sort by start time
      uniqueEvents.sort((a, b) => {
        const aStart = a.start?.dateTime || a.start?.date || '';
        const bStart = b.start?.dateTime || b.start?.date || '';
        return aStart.localeCompare(bStart);
      });

      return uniqueEvents;
    } catch (error) {
      logger.error('Failed to get events by user ID:', error);
      throw new Error(`Failed to get events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets all events for a specific department within a time range.
   * 
   * @param department - The department name
   * @param timeMin - Optional start time to filter events (defaults to now)
   * @param timeMax - Optional end time to filter events
   * @param maxResults - Maximum number of events to return (defaults to 250)
   * @returns Array of all calendar events for the department
   * 
   * @example
   * ```typescript
   * const repo = new GoogleCalendarRepository();
   * const startOfMonth = new Date('2025-11-01');
   * const endOfMonth = new Date('2025-11-30');
   * const events = await repo.getAllDepartmentEvents('CCIS', startOfMonth, endOfMonth);
   * ```
   */
  async getAllDepartmentEvents(
    department: string,
    timeMin?: Date,
    timeMax?: Date,
    maxResults: number = 250
  ): Promise<calendar_v3.Schema$Event[]> {
    try {
      const calendar = await calendarClient;
      const calendarId = this.getDepartmentCalendarId(department);

      const response = await calendar.events.list({
        calendarId: calendarId,
        timeMin: timeMin?.toISOString() || new Date().toISOString(),
        timeMax: timeMax?.toISOString(),
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      logger.info(`Retrieved ${response.data.items?.length || 0} events for department ${department}`);
      return response.data.items || [];
    } catch (error) {
      logger.error('Failed to get department events:', error);
      throw new Error(`Failed to get events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
