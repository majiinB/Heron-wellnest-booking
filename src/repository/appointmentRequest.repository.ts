import { Between, Repository } from "typeorm";
import { AppDataSource } from "../config/datasource.config.js";
import { AppointmentRequest } from "../models/appointmentRequests.model.js";

/**
 * Repository for managing appointment requests.
 * 
 * @description Handles creating, updating, and retrieving appointment requests between students and counselors.
 * 
 * @remarks
 * - Appointment requests can be created by either students or counselors
 * - Both parties must respond before the request is finalized
 * - Status is automatically updated based on responses
 * 
 * @file appointmentRequest.repository.ts
 * @author Arthur M. Artugue
 * @created 2025-10-29
 * @updated 2025-10-29
 */
export class AppointmentRequestRepository {
  private repository: Repository<AppointmentRequest>;

  constructor() {
    this.repository = AppDataSource.getRepository(AppointmentRequest);
  }

  /**
   * Creates a new appointment request initiated by a student.
   * 
   * @param data - The appointment request data
   * @param data.student_id - The unique identifier of the student
   * @param data.counselor_id - The unique identifier of the counselor
   * @param data.agenda - The type of appointment
   * @param data.proposed_start - The proposed start time
   * @param data.proposed_end - The proposed end time
   * @returns A promise that resolves to the created appointment request
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRequestRepository();
   * const request = await repo.createStudentRequest({
   *   student_id: "uuid",
   *   counselor_id: "uuid",
   *   agenda: "counseling",
   *   proposed_start: new Date(),
   *   proposed_end: new Date()
   * });
   * ```
   */
  async createStudentRequest(data: {
    student_id: string;
    counselor_id: string;
    department: string;
    agenda: "counseling" | "meeting" | "routine_interview" | "event";
    proposed_start: Date;
    proposed_end: Date;
  }): Promise<AppointmentRequest> {
    const request = this.repository.create({
      ...data,
      proposed_by: "student",
      created_by: "student",
      student_response: "accepted", // Student auto-accepts their own request
      counselor_response: "pending",
      status: "pending"
    });

    return await this.repository.save(request);
  }

  /**
   * Creates a new appointment request initiated by a counselor.
   * 
   * @param data - The appointment request data
   * @param data.student_id - The unique identifier of the student
   * @param data.counselor_id - The unique identifier of the counselor
   * @param data.agenda - The type of appointment
   * @param data.proposed_start - The proposed start time
   * @param data.proposed_end - The proposed end time
   * @returns A promise that resolves to the created appointment request
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRequestRepository();
   * const request = await repo.createCounselorRequest({
   *   student_id: "uuid",
   *   counselor_id: "uuid",
   *   agenda: "routine_interview",
   *   proposed_start: new Date(),
   *   proposed_end: new Date()
   * });
   * ```
   */
  async createCounselorRequest(data: {
    student_id: string;
    counselor_id: string;
    department: string;
    agenda: "counseling" | "meeting" | "routine_interview" | "event";
    proposed_start: Date;
    proposed_end: Date;
  }): Promise<AppointmentRequest> {
    const request = this.repository.create({
      ...data,
      proposed_by: "counselor",
      created_by: "counselor",
      student_response: "pending",
      counselor_response: "accepted", // Counselor auto-accepts their own request
      status: "pending"
    });

    return await this.repository.save(request);
  }

  /**
   * Updates the student's response to an appointment request.
   * Automatically updates the overall status based on both responses.
   * 
   * @param request_id - The unique identifier of the appointment request
   * @param response - The student's response (accepted or declined)
   * @returns A promise that resolves to the updated appointment request
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRequestRepository();
   * const request = await repo.updateStudentResponse(requestId, "accepted");
   * ```
   */
  async updateStudentResponse(
    request_id: string,
    response: "accepted" | "declined"
  ): Promise<AppointmentRequest | null> {
    const request = await this.repository.findOne({ where: { request_id } });
    
    if (!request) {
      return null;
    }

    request.student_response = response;
    
    // Update overall status based on both responses
    if (response === "declined") {
      request.status = "declined";
      request.finalized_at = new Date();
    } else if (request.counselor_response === "accepted") {
      request.status = "both_confirmed";
      request.finalized_at = new Date();
    }

    return await this.repository.save(request);
  }

  /**
   * Updates the counselor's response to an appointment request.
   * Automatically updates the overall status based on both responses.
   * 
   * @param request_id - The unique identifier of the appointment request
   * @param response - The counselor's response (accepted or declined)
   * @returns A promise that resolves to the updated appointment request
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRequestRepository();
   * const request = await repo.updateCounselorResponse(requestId, "accepted");
   * ```
   */
  async updateCounselorResponse(
    request_id: string,
    response: "accepted" | "declined"
  ): Promise<AppointmentRequest | null> {
    const request = await this.repository.findOne({ where: { request_id } });
    
    if (!request) {
      return null;
    }

    request.counselor_response = response;
    
    // Update overall status based on both responses
    if (response === "declined") {
      request.status = "declined";
      request.finalized_at = new Date();
    } else if (request.student_response === "accepted") {
      request.status = "both_confirmed";
      request.finalized_at = new Date();
    }

    return await this.repository.save(request);
  }

  /**
   * Updates the status of an appointment request.
   * 
   * @param request_id - The unique identifier of the appointment request
   * @param status - The new status
   * @returns A promise that resolves to the updated appointment request
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRequestRepository();
   * const request = await repo.updateStatus(requestId, "expired");
   * ```
   */
  async updateStatus(
    request_id: string,
    status: "pending" | "both_confirmed" | "declined" | "expired"
  ): Promise<AppointmentRequest | null> {
    const request = await this.repository.findOne({ where: { request_id } });
    
    if (!request) {
      return null;
    }

    request.status = status;
    
    // Set finalized_at if status is not pending
    if (status !== "pending" && !request.finalized_at) {
      request.finalized_at = new Date();
    }

    return await this.repository.save(request);
  }

  /**
   * Retrieves all appointment requests for a student (both created by student and counselor).
   * 
   * @param student_id - The unique identifier of the student
   * @param status - Optional status filter
   * @returns A promise that resolves to an array of appointment requests
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRequestRepository();
   * 
   * // Get all requests
   * const allRequests = await repo.getStudentRequests(studentId);
   * 
   * // Get only pending requests
   * const pendingRequests = await repo.getStudentRequests(studentId, "pending");
   * ```
   */
  async getStudentRequests(
    student_id: string,
    status?: "pending" | "both_confirmed" | "declined" | "expired"
  ): Promise<AppointmentRequest[]> {
    const whereClause: any = { student_id };
    
    if (status) {
      whereClause.status = status;
    }

    return await this.repository.find({
      where: whereClause,
      order: { created_at: "DESC" }
    });
  }

  /**
   * Retrieves all appointment requests for a counselor (both created by counselor and student).
   * 
   * @param counselor_id - The unique identifier of the counselor
   * @param status - Optional status filter
   * @returns A promise that resolves to an array of appointment requests
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRequestRepository();
   * 
   * // Get all requests
   * const allRequests = await repo.getCounselorRequests(counselorId);
   * 
   * // Get only confirmed requests
   * const confirmedRequests = await repo.getCounselorRequests(counselorId, "both_confirmed");
   * ```
   */
  async getCounselorRequests(
    counselor_id: string,
    status?: "pending" | "both_confirmed" | "declined" | "expired"
  ): Promise<AppointmentRequest[]> {
    const whereClause: any = { counselor_id };
    
    if (status) {
      whereClause.status = status;
    }

    return await this.repository.find({
      where: whereClause,
      order: { created_at: "DESC" }
    });
  }

  /**
   * Retrieves a single appointment request by ID.
   * 
   * @param request_id - The unique identifier of the appointment request
   * @returns A promise that resolves to the appointment request or null if not found
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRequestRepository();
   * const request = await repo.getRequestById(requestId);
   * ```
   */
  async getRequestById(request_id: string): Promise<AppointmentRequest | null> {
    return await this.repository.findOne({ where: { request_id } });
  }

  /**
   * Retrieves appointment requests created by a specific user (student or counselor).
   * 
   * @param user_id - The unique identifier of the user
   * @param user_type - The type of user (student or counselor)
   * @param status - Optional status filter
   * @returns A promise that resolves to an array of appointment requests
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRequestRepository();
   * const myRequests = await repo.getRequestsCreatedBy(userId, "student");
   * ```
   */
  async getRequestsCreatedBy(
    user_id: string,
    user_type: "student" | "counselor",
    status?: "pending" | "both_confirmed" | "declined" | "expired"
  ): Promise<AppointmentRequest[]> {
    const whereClause: any = { created_by: user_type };
    
    if (user_type === "student") {
      whereClause.student_id = user_id;
    } else {
      whereClause.counselor_id = user_id;
    }
    
    if (status) {
      whereClause.status = status;
    }

    return await this.repository.find({
      where: whereClause,
      order: { created_at: "DESC" }
    });
  }

  /**
   * Retrieves appointment requests received by a specific user (student or counselor).
   * 
   * @param user_id - The unique identifier of the user
   * @param user_type - The type of user (student or counselor)
   * @param status - Optional status filter
   * @returns A promise that resolves to an array of appointment requests
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRequestRepository();
   * const receivedRequests = await repo.getRequestsReceivedBy(userId, "counselor");
   * ```
   */
  async getRequestsReceivedBy(
    user_id: string,
    user_type: "student" | "counselor",
    status?: "pending" | "both_confirmed" | "declined" | "expired"
  ): Promise<AppointmentRequest[]> {
    const whereClause: any = {};
    
    if (user_type === "student") {
      whereClause.student_id = user_id;
      whereClause.created_by = "counselor";
    } else {
      whereClause.counselor_id = user_id;
      whereClause.created_by = "student";
    }
    
    if (status) {
      whereClause.status = status;
    }

    return await this.repository.find({
      where: whereClause,
      order: { created_at: "DESC" }
    });
  }

  /**
   * Marks expired appointment requests as expired.
   * Useful for a scheduled job that runs periodically.
   * 
   * @param expirationHours - Number of hours after which a pending request expires (default: 48)
   * @returns A promise that resolves to the number of requests marked as expired
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRequestRepository();
   * const expiredCount = await repo.markExpiredRequests(24); // 24 hours
   * ```
   */
  async markExpiredRequests(expirationHours: number = 48): Promise<number> {
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() - expirationHours);

    const result = await this.repository
      .createQueryBuilder()
      .update(AppointmentRequest)
      .set({ 
        status: "expired",
        finalized_at: new Date()
      })
      .where("status = :status", { status: "pending" })
      .andWhere("created_at < :expirationDate", { expirationDate })
      .execute();

    return result.affected ?? 0;
  }

  /**
   * Deletes an appointment request.
   * 
   * @param request_id - The unique identifier of the appointment request
   * @returns A promise that resolves to true if deleted, false if not found
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRequestRepository();
   * const deleted = await repo.deleteRequest(requestId);
   * ```
   */
  async deleteRequest(request_id: string): Promise<boolean> {
    const result = await this.repository.delete({ request_id });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Gets pending requests count for a user.
   * 
   * @param user_id - The unique identifier of the user
   * @param user_type - The type of user (student or counselor)
   * @returns A promise that resolves to the count of pending requests
   * 
   * @example
   * ```typescript
   * const repo = new AppointmentRequestRepository();
   * const pendingCount = await repo.getPendingRequestsCount(userId, "student");
   * ```
   */
  async getPendingRequestsCount(
    user_id: string,
    user_type: "student" | "counselor"
  ): Promise<number> {
    const whereClause: any = { status: "pending" };
    
    if (user_type === "student") {
      whereClause.student_id = user_id;
    } else {
      whereClause.counselor_id = user_id;
    }

    return await this.repository.count({ where: whereClause });
  }
}
