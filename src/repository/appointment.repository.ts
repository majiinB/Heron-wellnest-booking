import { Between, EntityManager, LessThanOrEqual, MoreThanOrEqual, Repository } from "typeorm";
import { AppDataSource } from "../config/datasource.config.js";
import { Appointment } from "../models/appointments.model.js";
import type { App } from "supertest/types.js";
import type { AppointmentRequest } from "../models/appointmentRequests.model.js";

/**
 * Repository for managing confirmed appointments.
 * 
 * @description Handles creating, updating, and retrieving confirmed appointments between students and counselors.
 * 
 * @remarks
 * - Appointments are created from confirmed appointment requests
 * - Supports retrieving appointments by various time ranges (day, week, month)
 * - Handles appointment cancellations
 * 
 * @file appointment.repository.ts
 * @author Arthur M. Artugue
 * @created 2025-10-29
 * @updated 2025-10-29
 */
export class AppointmentRepository {
  private repository: Repository<Appointment>;

  constructor() {
    this.repository = AppDataSource.getRepository(Appointment);
  }

  /**
   * Creates a new confirmed appointment from an appointment request.
   * 
   * @param data - The appointment data
   * @param data.request_id - The unique identifier of the appointment request
   * @param data.student_id - The unique identifier of the student
   * @param data.counselor_id - The unique identifier of the counselor
   * @param data.agenda - The type of appointment
   * @param data.start_time - The scheduled start time
   * @param data.end_time - The scheduled end time
   * @param data.google_event_id - Optional Google Calendar event ID
   * @returns A promise that resolves to the created appointment
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRepository();
   * const appointment = await repo.createAppointment({
   *   request_id: request.request_id,
   *   student_id: request.student_id,
   *   counselor_id: request.counselor_id,
   *   agenda: request.agenda,
   *   start_time: request.proposed_start,
   *   end_time: request.proposed_end,
   *   google_event_id: "google_event_123"
   * });
   * ```
   */
  async createAppointmentWithManager(
  manager: EntityManager,
  data: {
    request: AppointmentRequest;
    student_id: string;
    counselor_id: string;
    department: string;
    agenda: "counseling" | "meeting" | "routine_interview" | "event";
    start_time: Date;
    end_time: Date;
    google_event_id?: string;
  }
): Promise<Appointment> {
  const appointment = manager.create(Appointment, {
    ...data,
    status: "both_confirmed",
    google_event_id: data.google_event_id || null,
  });

  return await manager.save(appointment);
}


  /**
   * Retrieves a single appointment by ID.
   * 
   * @param appointment_id - The unique identifier of the appointment
   * @returns A promise that resolves to the appointment or null if not found
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRepository();
   * const appointment = await repo.getAppointmentById(appointmentId);
   * ```
   */
  async getAppointmentById(appointment_id: string): Promise<Appointment | null> {
    return await this.repository.findOne({ 
      where: { appointment_id },
      relations: ["request_id"]
    });
  }

  /**
   * Retrieves all appointments for a student within a specific date range.
   * 
   * @param student_id - The unique identifier of the student
   * @param startDate - The start of the date range
   * @param endDate - The end of the date range
   * @returns A promise that resolves to an array of appointments
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRepository();
   * const appointments = await repo.getStudentAppointments(
   *   studentId,
   *   new Date('2025-10-01'),
   *   new Date('2025-10-31')
   * );
   * ```
   */
  async getStudentAppointments(
    student_id: string,
    startDate: Date,
    endDate: Date
  ): Promise<Appointment[]> {
    return await this.repository.find({
      where: {
        student_id,
        start_time: Between(startDate, endDate)
      },
      relations: ["request_id"],
      order: { start_time: "ASC" }
    });
  }

  /**
   * Retrieves all appointments for a counselor within a specific date range.
   * 
   * @param counselor_id - The unique identifier of the counselor
   * @param startDate - The start of the date range
   * @param endDate - The end of the date range
   * @returns A promise that resolves to an array of appointments
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRepository();
   * const appointments = await repo.getCounselorAppointments(
   *   counselorId,
   *   new Date('2025-10-01'),
   *   new Date('2025-10-31')
   * );
   * ```
   */
  async getCounselorAppointments(
    counselor_id: string,
    startDate: Date,
    endDate: Date
  ): Promise<Appointment[]> {
    return await this.repository.find({
      where: {
        counselor_id,
        start_time: Between(startDate, endDate)
      },
      relations: ["request_id"],
      order: { start_time: "ASC" }
    });
  }

  /**
   * Retrieves appointments for a student for a specific day.
   * 
   * @param student_id - The unique identifier of the student
   * @param date - The date (time will be ignored)
   * @returns A promise that resolves to an array of appointments
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRepository();
   * const appointments = await repo.getStudentAppointmentsByDay(studentId, new Date());
   * ```
   */
  async getStudentAppointmentsByDay(
    student_id: string,
    date: Date
  ): Promise<Appointment[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await this.getStudentAppointments(student_id, startOfDay, endOfDay);
  }

  /**
   * Retrieves appointments for a counselor for a specific day.
   * 
   * @param counselor_id - The unique identifier of the counselor
   * @param date - The date (time will be ignored)
   * @returns A promise that resolves to an array of appointments
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRepository();
   * const appointments = await repo.getCounselorAppointmentsByDay(counselorId, new Date());
   * ```
   */
  async getCounselorAppointmentsByDay(
    counselor_id: string,
    date: Date
  ): Promise<Appointment[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await this.getCounselorAppointments(counselor_id, startOfDay, endOfDay);
  }

  /**
   * Retrieves appointments for a student for a specific week.
   * 
   * @param student_id - The unique identifier of the student
   * @param date - Any date within the week
   * @returns A promise that resolves to an array of appointments
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRepository();
   * const appointments = await repo.getStudentAppointmentsByWeek(studentId, new Date());
   * ```
   */
  async getStudentAppointmentsByWeek(
    student_id: string,
    date: Date
  ): Promise<Appointment[]> {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return await this.getStudentAppointments(student_id, startOfWeek, endOfWeek);
  }

  /**
   * Retrieves appointments for a counselor for a specific week.
   * 
   * @param counselor_id - The unique identifier of the counselor
   * @param date - Any date within the week
   * @returns A promise that resolves to an array of appointments
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRepository();
   * const appointments = await repo.getCounselorAppointmentsByWeek(counselorId, new Date());
   * ```
   */
  async getCounselorAppointmentsByWeek(
    counselor_id: string,
    date: Date
  ): Promise<Appointment[]> {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return await this.getCounselorAppointments(counselor_id, startOfWeek, endOfWeek);
  }

  /**
   * Retrieves appointments for a student for a specific month.
   * 
   * @param student_id - The unique identifier of the student
   * @param date - Any date within the month
   * @returns A promise that resolves to an array of appointments
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRepository();
   * const appointments = await repo.getStudentAppointmentsByMonth(studentId, new Date());
   * ```
   */
  async getStudentAppointmentsByMonth(
    student_id: string,
    date: Date
  ): Promise<Appointment[]> {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

    return await this.getStudentAppointments(student_id, startOfMonth, endOfMonth);
  }

  /**
   * Retrieves appointments for a counselor for a specific month.
   * 
   * @param counselor_id - The unique identifier of the counselor
   * @param date - Any date within the month
   * @returns A promise that resolves to an array of appointments
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRepository();
   * const appointments = await repo.getCounselorAppointmentsByMonth(counselorId, new Date());
   * ```
   */
  async getCounselorAppointmentsByMonth(
    counselor_id: string,
    date: Date
  ): Promise<Appointment[]> {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

    return await this.getCounselorAppointments(counselor_id, startOfMonth, endOfMonth);
  }

  /**
   * Cancels an appointment.
   * 
   * @param appointment_id - The unique identifier of the appointment
   * @param cancelled_by - Who cancelled the appointment (student or counselor)
   * @returns A promise that resolves to the updated appointment or null if not found
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRepository();
   * const appointment = await repo.cancelAppointment(appointmentId, "student");
   * ```
   */
  async cancelAppointment(
    appointment_id: string,
    cancelled_by: "student" | "counselor"
  ): Promise<Appointment | null> {
    const appointment = await this.repository.findOne({ where: { appointment_id } });
    
    if (!appointment) {
      return null;
    }

    appointment.cancelled_by = cancelled_by;
    appointment.cancelled_at = new Date();
    appointment.status = "declined";

    return await this.repository.save(appointment);
  }

  /**
   * Updates the Google Calendar event ID for an appointment.
   * 
   * @param appointment_id - The unique identifier of the appointment
   * @param google_event_id - The Google Calendar event ID
   * @returns A promise that resolves to the updated appointment or null if not found
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRepository();
   * const appointment = await repo.updateGoogleEventId(appointmentId, "google_event_123");
   * ```
   */
  async updateGoogleEventId(
    appointment_id: string,
    google_event_id: string
  ): Promise<Appointment | null> {
    const appointment = await this.repository.findOne({ where: { appointment_id } });
    
    if (!appointment) {
      return null;
    }

    appointment.google_event_id = google_event_id;
    return await this.repository.save(appointment);
  }

  async updateGoogleEventIdWithManager(
  manager: EntityManager,
  appointment_id: string,
  google_event_id: string
): Promise<Appointment | null> {
  const repo = manager.getRepository(Appointment);
  const appointment = await repo.findOne({ where: { appointment_id } });

  if (!appointment) {
    return null;
  }

  appointment.google_event_id = google_event_id;
  return await repo.save(appointment);
}


  /**
   * Updates the time of an appointment.
   * 
   * @param appointment_id - The unique identifier of the appointment
   * @param start_time - The new start time
   * @param end_time - The new end time
   * @returns A promise that resolves to the updated appointment or null if not found
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRepository();
   * const appointment = await repo.updateAppointmentTime(
   *   appointmentId,
   *   new Date('2025-10-30T10:00:00'),
   *   new Date('2025-10-30T11:00:00')
   * );
   * ```
   */
  async updateAppointmentTime(
    appointment_id: string,
    start_time: Date,
    end_time: Date
  ): Promise<Appointment | null> {
    const appointment = await this.repository.findOne({ where: { appointment_id } });
    
    if (!appointment) {
      return null;
    }

    appointment.start_time = start_time;
    appointment.end_time = end_time;
    return await this.repository.save(appointment);
  }

  /**
   * Retrieves upcoming appointments for a student.
   * 
   * @param student_id - The unique identifier of the student
   * @param limit - Maximum number of appointments to retrieve (default: 10)
   * @returns A promise that resolves to an array of upcoming appointments
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRepository();
   * const upcomingAppointments = await repo.getUpcomingStudentAppointments(studentId, 5);
   * ```
   */
  async getUpcomingStudentAppointments(
    student_id: string,
    limit: number = 10
  ): Promise<Appointment[]> {
    return await this.repository.find({
      where: {
        student_id,
        start_time: MoreThanOrEqual(new Date()),
        cancelled_at: null as any
      },
      relations: ["request_id"],
      order: { start_time: "ASC" },
      take: limit
    });
  }

  /**
   * Retrieves upcoming appointments for a counselor.
   * 
   * @param counselor_id - The unique identifier of the counselor
   * @param limit - Maximum number of appointments to retrieve (default: 10)
   * @returns A promise that resolves to an array of upcoming appointments
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRepository();
   * const upcomingAppointments = await repo.getUpcomingCounselorAppointments(counselorId, 5);
   * ```
   */
  async getUpcomingCounselorAppointments(
    counselor_id: string,
    limit: number = 10
  ): Promise<Appointment[]> {
    return await this.repository.find({
      where: {
        counselor_id,
        start_time: MoreThanOrEqual(new Date()),
        cancelled_at: null as any
      },
      relations: ["request_id"],
      order: { start_time: "ASC" },
      take: limit
    });
  }

  /**
   * Retrieves past appointments for a student.
   * 
   * @param student_id - The unique identifier of the student
   * @param limit - Maximum number of appointments to retrieve (default: 10)
   * @returns A promise that resolves to an array of past appointments
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRepository();
   * const pastAppointments = await repo.getPastStudentAppointments(studentId);
   * ```
   */
  async getPastStudentAppointments(
    student_id: string,
    limit: number = 10
  ): Promise<Appointment[]> {
    return await this.repository.find({
      where: {
        student_id,
        end_time: LessThanOrEqual(new Date())
      },
      relations: ["request_id"],
      order: { start_time: "DESC" },
      take: limit
    });
  }

  /**
   * Retrieves past appointments for a counselor.
   * 
   * @param counselor_id - The unique identifier of the counselor
   * @param limit - Maximum number of appointments to retrieve (default: 10)
   * @returns A promise that resolves to an array of past appointments
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRepository();
   * const pastAppointments = await repo.getPastCounselorAppointments(counselorId);
   * ```
   */
  async getPastCounselorAppointments(
    counselor_id: string,
    limit: number = 10
  ): Promise<Appointment[]> {
    return await this.repository.find({
      where: {
        counselor_id,
        end_time: LessThanOrEqual(new Date())
      },
      relations: ["request_id"],
      order: { start_time: "DESC" },
      take: limit
    });
  }

  /**
   * Checks if a time slot is available for a counselor.
   * 
   * @param counselor_id - The unique identifier of the counselor
   * @param start_time - The proposed start time
   * @param end_time - The proposed end time
   * @param exclude_appointment_id - Optional appointment ID to exclude from the check (useful for rescheduling)
   * @returns A promise that resolves to true if the slot is available, false otherwise
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRepository();
   * const isAvailable = await repo.isTimeSlotAvailable(
   *   counselorId,
   *   new Date('2025-10-30T10:00:00'),
   *   new Date('2025-10-30T11:00:00')
   * );
   * ```
   */
  async isTimeSlotAvailable(
    counselor_id: string,
    start_time: Date,
    end_time: Date,
    exclude_appointment_id?: string
  ): Promise<boolean> {
    const query = this.repository
      .createQueryBuilder("appointment")
      .where("appointment.counselor_id = :counselor_id", { counselor_id })
      .andWhere("appointment.cancelled_at IS NULL")
      .andWhere(
        "(:start_time < appointment.end_time AND :end_time > appointment.start_time)",
        { start_time, end_time }
      );

    if (exclude_appointment_id) {
      query.andWhere("appointment.appointment_id != :exclude_appointment_id", { 
        exclude_appointment_id 
      });
    }

    const count = await query.getCount();
    return count === 0;
  }

  /**
   * Deletes an appointment.
   * 
   * @param appointment_id - The unique identifier of the appointment
   * @returns A promise that resolves to true if deleted, false if not found
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRepository();
   * const deleted = await repo.deleteAppointment(appointmentId);
   * ```
   */
  async deleteAppointment(appointment_id: string): Promise<boolean> {
    const result = await this.repository.delete({ appointment_id });
    return (result.affected ?? 0) > 0;
  }
}
