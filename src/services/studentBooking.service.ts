import type { AppointmentRequest } from "../models/appointmentRequests.model.js";
import type { AppointmentRepository } from "../repository/appointment.repository.js";
import type { AppointmentRequestRepository } from "../repository/appointmentRequest.repository.js";
import type { CounselorRepository } from "../repository/counselor.repository.js";
import type { StudentRepository } from "../repository/student.repository.js";
import type { CalendarEventData, GoogleCalendarRepository } from "../repository/googleCalendar.repository.js";
import type { ApiResponse } from "../types/apiResponse.type.js";
import { AppError } from "../types/appError.type.js";
import type { Appointment } from "../models/appointments.model.js";
import { AppDataSource } from "../config/datasource.config.js";
import { calendarClient } from "../config/googleCalendar.config.js";
import { logger } from "../utils/logger.util.js";

/**
 * Service class for managing Booking.
 *
 * @description Handles student booking operations such as requesting appointments,
 * canceling appointments, and managing appointment states.
 *
 * @remarks
 *
 * @example
 * ```typescript
 * const service = new StudentBookingService(...);
 * 
 * // Request an appointment
 * const appointmentRequest = await service.requestAppointment(
 *   "student-uuid",
 *   "counseling",
 *   "counselor-uuid",
 *  new Date("2025-11-15T10:00:00Z"),
 * );
 * ```
 *
 * @file studentBooking.service.ts
 * 
 * @author Arthur M. Artugue
 * @created 2025-10-29
 * @updated 2025-10-31
 */
export class StudentBookingService {
  private appointmentRequestsRepository : AppointmentRequestRepository;
  private appointmentsRepository : AppointmentRepository;
  private studentRepository : StudentRepository;
  private counselorRepository : CounselorRepository;
  private googleCalendarRepository : GoogleCalendarRepository;
  
  /**
   * Creates an instance of the StudentBookingService.
   */
  constructor(
    appointmentRequestsRepository: AppointmentRequestRepository, 
    appointmentsRepository: AppointmentRepository,
    studentRepository: StudentRepository,
    counselorRepository: CounselorRepository,
    googleCalendarRepository: GoogleCalendarRepository
  ) {
    this.appointmentRequestsRepository = appointmentRequestsRepository;
    this.appointmentsRepository = appointmentsRepository;
    this.studentRepository = studentRepository;
    this.counselorRepository = counselorRepository;
    this.googleCalendarRepository = googleCalendarRepository;
  }

  /**
   * Creates a new appointment request from a student to a counselor.
   * 
   * This method validates the proposed time slot, checks that the student and counselor
   * are in the same department, and verifies availability in both the database and
   * Google Calendar before creating the appointment request.
   * 
   * @param userId - The unique identifier of the student requesting the appointment
   * @param agenda - The type of appointment being requested (counseling, meeting, routine_interview, or event)
   * @param counselorId - The unique identifier of the counselor for the appointment
   * @param proposedStart - The proposed start date and time for the appointment
   * @param proposedEnd - The proposed end date and time for the appointment
   * 
   * @returns A Promise that resolves to the created AppointmentRequest object
   * 
   * @throws {AppError} 400 INVALID_TIME_RANGE - If the proposed end time is not after the start time
   * @throws {AppError} 400 PAST_APPOINTMENT - If the proposed start time is in the past
   * @throws {AppError} 404 STUDENT_NOT_FOUND - If the student does not exist or is inactive
   * @throws {AppError} 404 COUNSELOR_NOT_FOUND - If the counselor does not exist
   * @throws {AppError} 400 DIFFERENT_DEPARTMENT - If the student and counselor are not in the same department
   * @throws {AppError} 409 TIME_SLOT_UNAVAILABLE - If the counselor has a confirmed appointment or there's a conflicting calendar event
   * 
   * @example
   * ```typescript
   * const request = await studentBookingService.requestAppointment(
   *   'student-123',
   *   'counseling',
   *   'counselor-456',
   *   new Date('2024-01-15T10:00:00Z'),
   *   new Date('2024-01-15T11:00:00Z')
   * );
   * ```
   */
  public async requestAppointment(
    userId: string, 
    agenda: "counseling" | "meeting" | "routine_interview" | "event", 
    counselorId: string,
    proposedStart: Date,
    proposedEnd: Date
  ): Promise<AppointmentRequest> {
    // Validate time range
    if (proposedEnd <= proposedStart) {
      throw new AppError(
        400,
        "INVALID_TIME_RANGE",
        "Proposed end time must be after start time.",
        true
      );
    }

    // Validate appointment is in the future
    // Compare timestamps (UTC) to avoid timezone issues
    const now = new Date();
    if (proposedStart.getTime() < now.getTime()) {
      throw new AppError(
        400,
        "PAST_APPOINTMENT",
        "Cannot create appointment request for a past time.",
        true
      );
    }

    // Check if the appointment request already exists
    const existingRequests = await this.appointmentRequestsRepository.findRequestsByStudentAndTime(
      userId,
      proposedStart,
      proposedEnd,
      agenda
    );
    if (existingRequests.length > 0) {
      throw new AppError(
        409,
        "DUPLICATE_REQUEST",
        "An appointment request with the same details already exists.",
        true
      );
    }

    // Get student details including department
    const studentDetails = await this.studentRepository.getStudentDetails(userId);
    
    if (!studentDetails) {
      throw new AppError(
        404,
        "STUDENT_NOT_FOUND",
        "The student does not exist or is inactive.",
        true
      );
    }

    const counselorDetails = await this.counselorRepository.getCounselorDetails(counselorId);
    
    if (!counselorDetails) {
      throw new AppError(
        404,
        "COUNSELOR_NOT_FOUND",
        `Counselor with ID ${counselorId} not found`,
        true
      );
    }

    if (studentDetails.department_id !== counselorDetails.department_id) {
      throw new AppError(
        400,
        "DIFFERENT_DEPARTMENT",
        "Student and counselor are not in the same department.",
        true
      );
    }

    // Check counselor availability in both database and Google Calendar
    // 1. Check database for confirmed appointments
    const isAvailableInDb = await this.appointmentsRepository.isTimeSlotAvailable(
      counselorId,
      proposedStart,
      proposedEnd
    );
    if (!isAvailableInDb) {
      throw new AppError(
        409,
        "TIME_SLOT_UNAVAILABLE",
        "Counselor already has a confirmed appointment during this time.",
        true
      );
    }

    // 2. Check Google Calendar for any conflicting events in the department calendar
    const isAvailableInCalendar = await this.googleCalendarRepository.checkAvailability(
      studentDetails.department_name,
      proposedStart,
      proposedEnd
    );
    if (!isAvailableInCalendar) {
      throw new AppError(
        409,
        "TIME_SLOT_UNAVAILABLE",
        "There is a conflicting event in the department calendar during this time.",
        true
      );
    }

    // Use the repository method which handles auto-generation
    const appointmentRequest = await this.appointmentRequestsRepository.createStudentRequest({
      student_id: userId,
      counselor_id: counselorId,
      department: studentDetails.department_name,
      agenda: agenda,
      proposed_start: proposedStart,
      proposed_end: proposedEnd,
    });

    return appointmentRequest;
  }

  /**
   * Accepts an appointment request on behalf of a student.
   * 
   * This method handles the student's acceptance of a pending appointment request. It performs
   * several validation checks and, if both the counselor and student have accepted, creates a
   * confirmed appointment with a corresponding Google Calendar event using a database transaction
   * to ensure atomicity.
   * 
   * @param userId - The ID of the user (student) accepting the appointment request
   * @param requestId - The ID of the appointment request to accept
   * 
   * @returns A Promise that resolves to the created Appointment object if both parties have accepted,
   *          or null if only the student has accepted but waiting for counselor acceptance
   * 
   * @throws {AppError} 404 REQUEST_NOT_FOUND - If the appointment request with the given ID is not found
   * @throws {AppError} 400 INVALID_REQUEST_STATUS - If the appointment request status is not "pending"
   * @throws {AppError} 400 INVALID_STUDENT_RESPONSE - If the student has already responded to the request
   * @throws {AppError} 409 TIME_SLOT_UNAVAILABLE - If the time slot is no longer available in the database
   *                                                 or if there's a conflicting event in the department calendar
   * @throws {AppError} 500 REQUEST_UPDATE_FAILED - If updating the appointment request status fails
   * @throws {AppError} 500 USER_DETAILS_NOT_FOUND - If student or counselor details cannot be retrieved
   * @throws {AppError} 500 GOOGLE_CALENDAR_EVENT_CREATION_FAILED - If Google Calendar event creation fails
   * 
   * @remarks
   * The method follows these steps:
   * 1. Validates the appointment request exists and is in a valid state
   * 2. Checks availability in both the database and Google Calendar
   * 3. Updates the student's response to "accepted"
   * 4. If both parties have accepted, creates the appointment within a database transaction
   * 5. Creates a corresponding Google Calendar event
   * 6. Commits the transaction if all operations succeed, otherwise rolls back
   */
  public async acceptAppointmentRequest(
    userId: string,
    requestId: string
  ): Promise<Appointment | null> {
    // Fetch the appointment request
    const appointmentRequest = await this.appointmentRequestsRepository.getRequestById(requestId);

    if (!appointmentRequest) {
      throw new AppError(
        404,
        "REQUEST_NOT_FOUND",
        `Appointment request with ID ${requestId} not found.`,
        true
      );
    }

    // Ensure the appointment request is not already accepted or declined
    if (appointmentRequest.status !== "pending") {
      throw new AppError(
        400,
        "INVALID_REQUEST_STATUS",
        "Only pending appointment requests can be accepted.",
        true
      );
    }

    // Ensure the student's response is still pending
    if (appointmentRequest.student_response !== "pending") {
      throw new AppError(
        400,
        "INVALID_STUDENT_RESPONSE",
        "Cannot accept an appointment request that the student has already responded to.",
        true
      );
    }

    // Check the calendar and database availability again before accepting
    // 1. Check database for confirmed appointments
    const isAvailableInDb = await this.appointmentsRepository.isTimeSlotAvailable(
      appointmentRequest.counselor_id,
      appointmentRequest.proposed_start,
      appointmentRequest.proposed_end
    );
    if (!isAvailableInDb) {
      throw new AppError(
        409,
        "TIME_SLOT_UNAVAILABLE",
        "Counselor already has a confirmed appointment during this time.",
        true
      );
    }

    // 2. Check Google Calendar for any conflicting events in the department calendar
    const isAvailableInCalendar = await this.googleCalendarRepository.checkAvailability(
      appointmentRequest.department,
      appointmentRequest.proposed_start,
      appointmentRequest.proposed_end
    );
    if (!isAvailableInCalendar) {
      throw new AppError(
        409,
        "TIME_SLOT_UNAVAILABLE",
        "There is a conflicting event in the department calendar during this time.",
        true
      );
    }

    // If both counselor and student is already accepted, finalize the request
    const updatedRequest = await this.appointmentRequestsRepository.updateStudentResponse(
      requestId,
      "accepted"
    );

    if (!updatedRequest) {
      throw new AppError(
        500,
        "REQUEST_UPDATE_FAILED",
        "Failed to update the appointment request status.",
        true
      );
    }

    let appointment: Appointment | null = null;

    if(updatedRequest.counselor_response === "accepted" && updatedRequest.student_response === "accepted") {
      // Get user details first (before any database writes)
      const studentDetails = await this.studentRepository.getStudentDetails(updatedRequest.student_id);
      const counselorDetails = await this.counselorRepository.getCounselorDetails(updatedRequest.counselor_id);
      if (!studentDetails || !counselorDetails) {
        throw new AppError(
          500,
          "USER_DETAILS_NOT_FOUND",
          "Failed to retrieve student or counselor details for calendar event creation.",
          true
        );
      }

      // Use a database transaction to ensure atomicity
      const queryRunner = AppDataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Within transaction: Re-check availability to prevent race condition
        const isStillAvailableInDb = await this.appointmentsRepository.isTimeSlotAvailable(
          updatedRequest.counselor_id,
          updatedRequest.proposed_start,
          updatedRequest.proposed_end
        );

        if (!isStillAvailableInDb) {
          throw new AppError(
            409,
            "TIME_SLOT_UNAVAILABLE",
            "This time slot was just booked by someone else. Please try a different time.",
            true
          );
        }

        // Create appointment within transaction
        appointment = await this.appointmentsRepository.createAppointment({
          request_id: updatedRequest,
          student_id: updatedRequest.student_id,
          counselor_id: updatedRequest.counselor_id,
          department: updatedRequest.department,
          agenda: updatedRequest.agenda,
          start_time: updatedRequest.proposed_start,
          end_time: updatedRequest.proposed_end
        });

        // Try to create Google Calendar event
        const eventData: CalendarEventData = {
          appointment_id: appointment.appointment_id,
          student_id: updatedRequest.student_id,
          student_email: studentDetails.email,
          counselor_id: updatedRequest.counselor_id,
          counselor_email: counselorDetails.email,
          department: updatedRequest.department,
          agenda: updatedRequest.agenda,
          start_time: updatedRequest.proposed_start,
          end_time: updatedRequest.proposed_end
        };

        const googleCalendarEvent = await this.googleCalendarRepository.createEvent(eventData);

        if (!googleCalendarEvent || !googleCalendarEvent.id) {
          // Calendar creation failed - rollback the entire transaction
          throw new AppError(
            500,
            "GOOGLE_CALENDAR_EVENT_CREATION_FAILED",
            "Failed to create Google Calendar event. Appointment creation cancelled.",
            true
          );
        }

        // Update the appointment with the Google Calendar event ID
        await this.appointmentsRepository.updateGoogleEventId(
          appointment.appointment_id,
          googleCalendarEvent.id
        );

        // Commit transaction - all operations succeeded
        await queryRunner.commitTransaction();

        return appointment;
      } catch (error) {
        // Rollback transaction on any error
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        // Release the query runner
        await queryRunner.release();
      }
    }
    
    return appointment;
  }

  /**
   * Declines a pending appointment request by updating the student's response status.
   * 
   * @param userId - The ID of the user (student) declining the appointment request
   * @param requestId - The unique identifier of the appointment request to decline
   * 
   * @returns A promise that resolves to the updated AppointmentRequest object
   * 
   * @throws {AppError} 404 - REQUEST_NOT_FOUND - When the appointment request with the given ID is not found
   * @throws {AppError} 400 - INVALID_REQUEST_STATUS - When the appointment request status is not "pending"
   * @throws {AppError} 400 - INVALID_STUDENT_RESPONSE - When the student has already responded to the request
   * @throws {AppError} 500 - REQUEST_UPDATE_FAILED - When the update operation fails
   * 
   * @remarks
   * This method performs the following validations:
   * - Verifies the appointment request exists
   * - Ensures the request status is "pending"
   * - Confirms the student's response is still "pending"
   * - Updates the student's response to "declined"
   */
  public async declineAppointmentRequest(
    userId: string,
    requestId: string
  ): Promise<AppointmentRequest> {
    // Fetch the appointment request
    const appointmentRequest = await this.appointmentRequestsRepository.getRequestById(requestId);

    if (!appointmentRequest) {
      throw new AppError(
        404,
        "REQUEST_NOT_FOUND",
        `Appointment request with ID ${requestId} not found.`,
        true
      );
    }

    // Ensure the appointment request is not already accepted or declined
    if (appointmentRequest.status !== "pending") {
      throw new AppError(
        400,
        "INVALID_REQUEST_STATUS",
        "Only pending appointment requests can be declined.",
        true
      );
    }

    // Ensure the student's response is still pending
    if (appointmentRequest.student_response !== "pending") {
      throw new AppError(
        400,
        "INVALID_STUDENT_RESPONSE",
        "Cannot decline an appointment request that the student has already responded to.",
        true
      );
    }

    // Update the student's response to declined
    const updatedRequest = await this.appointmentRequestsRepository.updateStudentResponse(
      requestId,
      "declined"
    );

    if (!updatedRequest) {
      throw new AppError(
        500,
        "REQUEST_UPDATE_FAILED",
        "Failed to update the appointment request status.",
        true
      );
    }

    return updatedRequest;
  }

  /**
   * Cancels an appointment on behalf of a student.
   *
   * Fetches the appointment, verifies that the requesting user is the student
   * who owns the appointment, and then delegates cancellation to the
   * appointments repository with a "student" cancellation type.
   *
   * @param userId - The ID of the student requesting the cancellation.
   * @param appointmentId - The ID of the appointment to cancel.
   * @returns A Promise that resolves to the canceled Appointment.
   * @throws {AppError} 404 "APPOINTMENT_NOT_FOUND" if no appointment exists with the given ID.
   * @throws {AppError} 403 "UNAUTHORIZED_ACTION" if the requesting user is not the appointment owner.
   * @throws {AppError} 500 "APPOINTMENT_CANCELLATION_FAILED" if cancellation in the repository fails.
   */
  public async cancelAppointment(
    userId: string,
    appointmentId: string
  ): Promise<Appointment> {
    // Fetch the appointment
    const appointment = await this.appointmentsRepository.getAppointmentById(appointmentId);

    if (!appointment) {
      throw new AppError(
        404,
        "APPOINTMENT_NOT_FOUND",
        `Appointment with ID ${appointmentId} not found.`,
        true
      );
    }

    // Check if the user is authorized to cancel the appointment
    if (appointment.student_id !== userId) {
      throw new AppError(
        403,
        "UNAUTHORIZED_ACTION",
        "You are not authorized to cancel this appointment.",
        true
      );
    }

    // Cancel the appointment
    const canceledAppointment = await this.appointmentsRepository.cancelAppointment(appointmentId, "student");

    if (!canceledAppointment) {
      throw new AppError(
        500,
        "APPOINTMENT_CANCELLATION_FAILED",
        "Failed to cancel the appointment.",
        true
      );
    }

    return canceledAppointment;
  }

  /**
   * Retrieves an appointment request by its ID.
   * 
   * @param userId - The ID of the user requesting the appointment information
   * @param requestId - The unique identifier of the appointment request to retrieve
   * @returns A promise that resolves to the appointment request object
   * @throws {AppError} Throws a 404 error with code "REQUEST_NOT_FOUND" if the appointment request is not found
   * 
   * @example
   * ```typescript
   * const appointment = await service.getAppointmentRequest('user123', 'request456');
   * ```
   */
  public async getAppointmentRequest(
    userId: string,
    requestId: string
  ): Promise<AppointmentRequest> {
    // Fetch the appointment request
    const appointmentRequest = await this.appointmentRequestsRepository.getRequestById(requestId);

    if (!appointmentRequest) {
      throw new AppError(
        404,
        "REQUEST_NOT_FOUND",
        `Appointment request with ID ${requestId} not found.`,
        true
      );
    }

    return appointmentRequest;
  }

  /**
   * Retrieves all appointment requests for a specific student user.
   * 
   * @param userId - The unique identifier of the student user
   * @param status - Optional filter for appointment request status. Can be:
   *   - "pending": Requests awaiting confirmation
   *   - "both_confirmed": Requests confirmed by both parties
   *   - "declined": Requests that were declined
   *   - "expired": Requests that have expired
   * @returns A promise that resolves to an array of AppointmentRequest objects
   * @throws May throw an error if the database query fails
   */
  public async getAllAppointmentRequests(
    userId: string,
    status?: "pending" | "both_confirmed" | "declined" | "expired"
  ): Promise<AppointmentRequest[]> {
    const appointmentRequests = await this.appointmentRequestsRepository.getStudentRequests(userId, status);
    return appointmentRequests;
  }

  /**
   * Retrieves an appointment by its ID for a given user.
   * 
   * @param userId - The ID of the user requesting the appointment
   * @param appointmentId - The unique identifier of the appointment to retrieve
   * @returns A promise that resolves to the Appointment object
   * @throws {AppError} Throws a 404 error with code "APPOINTMENT_NOT_FOUND" if the appointment doesn't exist
   */
  public async getAppointment(
    userId: string,
    appointmentId: string,
  ): Promise<Appointment> {
    const appointment = await this.appointmentsRepository.getAppointmentById(appointmentId);

    if (!appointment) {
      throw new AppError(
        404,
        "APPOINTMENT_NOT_FOUND",
        `Appointment with ID ${appointmentId} not found.`,
        true
      );
    }

    return appointment;
  }

  /**
   * Retrieves all appointments for a specific student within a given date range.
   * 
   * @param userId - The unique identifier of the student
   * @param startDate - The start date of the appointment search range
   * @param endDate - The end date of the appointment search range
   * @returns A promise that resolves to an array of appointments for the specified student
   * @throws May throw an error if the repository operation fails
   */
  public async getAllAppointments(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Appointment[]> {
    const appointments = await this.appointmentsRepository.getStudentAppointments(userId, startDate, endDate);
    return appointments;
  }

  /**
   * Gets unavailable time slots for a specific counselor from the database.
   * Returns all confirmed (non-cancelled) appointments for the counselor in the given date range.
   * 
   * @param counselorId - The unique identifier of the counselor
   * @param startDate - The start date of the search range
   * @param endDate - The end date of the search range
   * @returns A promise that resolves to an array of time slot objects with start and end times
   * 
   * @remarks
   * This only checks the database appointments table, not Google Calendar.
   * Use this to show when a specific counselor is booked.
   * 
   * @example
   * ```typescript
   * const unavailable = await service.getCounselorUnavailableSlots(
   *   'counselor-123',
   *   new Date('2025-11-01'),
   *   new Date('2025-11-30')
   * );
   * // Returns: [
   * //   { start: '2025-11-01T10:00:00Z', end: '2025-11-01T11:00:00Z', agenda: 'counseling' },
   * //   { start: '2025-11-02T14:00:00Z', end: '2025-11-02T15:00:00Z', agenda: 'meeting' }
   * // ]
   * ```
   */
  public async getCounselorUnavailableSlots(
    counselorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ start: Date; end: Date; agenda: string; student_email?: string }>> {
    // Get all confirmed appointments for the counselor
    const appointments = await this.appointmentsRepository.getCounselorAppointments(
      counselorId,
      startDate,
      endDate
    );

    // Map to simple time slot format (exclude cancelled appointments)
    return appointments
      .filter(apt => apt.cancelled_by === null)
      .map(apt => ({
        start: apt.start_time,
        end: apt.end_time,
        agenda: apt.agenda,
      }));
  }

  /**
   * Gets busy time slots from the department calendar using Google Calendar FreeBusy API.
   * Returns all busy periods (including manually added events) in the department calendar.
   * 
   * @param department - The department name
   * @param startDate - The start date of the search range
   * @param endDate - The end date of the search range
   * @returns A promise that resolves to an array of busy time slots
   * 
   * @remarks
   * This checks the Google Calendar department calendar for ALL busy periods.
   * Useful for seeing department-wide unavailability including:
   * - Confirmed appointments from your system
   * - Manually added events (department meetings, holidays, etc.)
   * 
   * @example
   * ```typescript
   * const busySlots = await service.getDepartmentBusySlots(
   *   'COLLEGE OF COMPUTING AND INFORMATION SCIENCES',
   *   new Date('2025-11-01'),
   *   new Date('2025-11-30')
   * );
   * ```
   */
  public async getDepartmentBusySlots(
    department: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ start: string; end: string }>> {
    const calendar = await calendarClient;
    const calendarId = this.googleCalendarRepository['getDepartmentCalendarId'](department);

    try {
      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          items: [{ id: calendarId }],
        },
      });

      const busyPeriods = response.data.calendars?.[calendarId]?.busy || [];
      
      return busyPeriods.map((period: { start?: string | null; end?: string | null }) => ({
        start: period.start || '',
        end: period.end || '',
      }));
    } catch (error) {
      logger.error('Failed to get department busy slots:', error);
      throw new AppError(
        500,
        "CALENDAR_QUERY_FAILED",
        "Failed to retrieve department calendar busy slots.",
        true
      );
    }
  }

  /**
   * Gets available time slots for booking in a department.
   * Generates time slots and filters out busy periods from Google Calendar.
   * 
   * @param department - The department name
   * @param startDate - The start date of the search range
   * @param endDate - The end date of the search range
   * @param slotDurationMinutes - Duration of each time slot in minutes (default: 60)
   * @param workStartHour - Start of work day in 24h format (default: 9)
   * @param workEndHour - End of work day in 24h format (default: 17)
   * @returns A promise that resolves to an array of available time slots
   * 
   * @remarks
   * This method:
   * 1. Generates time slots based on work hours
   * 2. Checks Google Calendar for busy periods
   * 3. Returns only available (free) slots
   * 
   * Useful for showing students when they can book appointments.
   * 
   * @example
   * ```typescript
   * const available = await service.getDepartmentAvailableSlots(
   *   'COLLEGE OF COMPUTING AND INFORMATION SCIENCES',
   *   new Date('2025-11-01'),
   *   new Date('2025-11-07'),
   *   60, // 1-hour slots
   *   9,  // 9 AM start
   *   17  // 5 PM end
   * );
   * // Returns: [
   * //   { start: '2025-11-01T09:00:00Z', end: '2025-11-01T10:00:00Z' },
   * //   { start: '2025-11-01T11:00:00Z', end: '2025-11-01T12:00:00Z' },
   * //   ...
   * // ]
   * ```
   */
  public async getDepartmentAvailableSlots(
    department: string,
    startDate: Date,
    endDate: Date,
    slotDurationMinutes: number = 60,
    workStartHour: number = 9,
    workEndHour: number = 17
  ): Promise<Array<{ start: Date; end: Date }>> {
    // Get busy periods from Google Calendar
    const busySlots = await this.getDepartmentBusySlots(department, startDate, endDate);

    // Generate all possible time slots
    const allSlots: Array<{ start: Date; end: Date }> = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // Skip weekends (optional - remove if you want 7-day weeks)
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Sunday, 6 = Saturday
        // Generate slots for this day
        for (let hour = workStartHour; hour < workEndHour; hour++) {
          const slotStart = new Date(currentDate);
          slotStart.setHours(hour, 0, 0, 0);

          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + slotDurationMinutes);

          // Don't add slots that go past work end hour
          if (slotEnd.getHours() <= workEndHour) {
            allSlots.push({ start: slotStart, end: slotEnd });
          }
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Filter out busy slots
    const availableSlots = allSlots.filter(slot => {
      return !busySlots.some(busy => {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);

        // Check if slot overlaps with busy period
        return (
          (slot.start >= busyStart && slot.start < busyEnd) ||
          (slot.end > busyStart && slot.end <= busyEnd) ||
          (slot.start <= busyStart && slot.end >= busyEnd)
        );
      });
    });

    return availableSlots;
  }
}