import { type NextFunction, type Response } from "express";
import type { CounselorBookingService } from "../services/counselorBooking.service.js";
import type { AuthenticatedRequest } from "../interface/authRequest.interface.js";
import type { ApiResponse } from "../types/apiResponse.type.js";
import { validate as isUuid } from "uuid";

export class CounselorBookingController {
  private counselorBookingService: CounselorBookingService;

  constructor(counselorBookingService: CounselorBookingService) {
    this.counselorBookingService = counselorBookingService;
  }

  /**
   * Handle a counselor's appointment request.
   *
   * Validates the authenticated user, ensures the user has the "counselor" role,
   * validates required request body properties, parses the proposed start/end times,
   * and forwards a request to the counselorBookingService to create the appointment request.
   *
   * The handler responds with JSON ApiResponse objects and appropriate HTTP status codes:
   * - 201 (APPOINTMENT_REQUESTED): Appointment request created successfully.
   * - 401 (UNAUTHORIZED): Missing or invalid authentication (no user id).
   * - 403 (FORBIDDEN): Authenticated user does not have the "counselor" role.
   * - 400 (MISSING_AGENDA): Missing agenda in the request body.
   * - 400 (MISSING_COUNSELOR_ID): Missing counselorId in the request body.
   * - 400 (MISSING_PROPOSED_START): Missing proposedStart in the request body.
   * - 400 (MISSING_PROPOSED_END): Missing proposedEnd in the request body.
   * - 400 (INVALID_AGENDA): Agenda is not one of the allowed values.
   * - 400 (INVALID_PROPOSED_START): proposedStart is not a valid ISO 8601 date string.
   * - 400 (INVALID_PROPOSED_END): proposedEnd is not a valid ISO 8601 date string.
   *
   * Allowed agenda values: "counseling", "meeting", "routine_interview", "event".
   *
   * @param req - AuthenticatedRequest containing:
   *   - user: object with `sub` (user id) and `role` (must be "counselor"),
   *   - body: expected shape { agenda: string, counselorId: string, proposedStart: string, proposedEnd: string }.
   * @param res - Express Response used to send ApiResponse JSON and appropriate HTTP status.
   * @param next - Express NextFunction; used to forward unexpected errors to error-handling middleware.
   *
   * @returns A Promise that resolves to void after sending a response.
   *
   * @remarks
   * - proposedStart and proposedEnd are parsed with the JS Date constructor and must be valid ISO 8601 strings.
   * - On success, the created appointment request data is returned in the ApiResponse `data` field.
   * - The function performs early returns for validation failures and does not throw for expected validation errors;
   *   unexpected exceptions should be delegated to `next`.
   */
  public async requestAppointment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.sub;
    const role = req.user?.role;
    const { agenda, studentId, proposedStart, proposedEnd } = req.body || {};
    let response: ApiResponse;

    if (!userId) {
      response = { success: false, code: "UNAUTHORIZED", message: "User authentication required." };
      res.status(401).json(response); return;
    }

    if (role !== "counselor") {
      response = { success: false, code: "FORBIDDEN", message: "Only counselors can request appointments." };
      res.status(403).json(response); return;
    }

    if (!agenda) {
      response = { success: false, code: "MISSING_AGENDA", message: "Agenda is required." };
      res.status(400).json(response); return;
    }

    if (!studentId) {
      response = { success: false, code: "MISSING_STUDENT_ID", message: "Student ID is required." };
      res.status(400).json(response); return;
    }

    if (!isUuid(studentId)) {
      response = {success: false, code: "INVALID_STUDENT_ID", message: "Student ID must be a valid UUID."};
      res.status(400).json(response);
      return;
    }

    if (!proposedStart) {
      response = { success: false, code: "MISSING_PROPOSED_START", message: "Proposed start time is required." };
      res.status(400).json(response); return;
    }
    if (!proposedEnd) {
      response = { success: false, code: "MISSING_PROPOSED_END", message: "Proposed end time is required." };
      res.status(400).json(response); return;
    }
    
    const validAgendas = ["counseling", "meeting", "routine_interview", "event"];
    if (!validAgendas.includes(agenda)) {
      response = { success: false, code: "INVALID_AGENDA", message: `Agenda must be one of: ${validAgendas.join(", ")}` };
      res.status(400).json(response); return;
    }

    const startDate = new Date(proposedStart);
    const endDate = new Date(proposedEnd);
    if (isNaN(startDate.getTime())) {
      response = { success: false, code: "INVALID_PROPOSED_START", message: "Proposed start time must be a valid ISO 8601 date string (e.g., 2025-11-01T10:00:00Z)" };
      res.status(400).json(response); return;
    }
    if (isNaN(endDate.getTime())) {
      response = { success: false, code: "INVALID_PROPOSED_END", message: "Proposed end time must be a valid ISO 8601 date string (e.g., 2025-11-01T11:00:00Z)" };
      res.status(400).json(response); return;
    }

    const appointmentRequestData = await this.counselorBookingService.requestAppointment(
      userId, agenda, studentId, startDate, endDate
    );
    response = { success: true, code: "APPOINTMENT_REQUESTED", message: "Appointment request created successfully.", data: appointmentRequestData };
    res.status(201).json(response);
  }

  public async acceptAppointmentRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.sub;
    const userRole = req.user?.role;
    const { requestId } = req.params;

    let response: ApiResponse;

    if (!userId) {
      response = { success: false, code: "UNAUTHORIZED", message: "User authentication required." };
      res.status(401).json(response); return;
    }

    if (userRole !== "counselor") {
      response = { success: false, code: "FORBIDDEN", message: "Only counselors can accept appointment requests." };
      res.status(403).json(response); return;
    }

    if (!requestId) {
      response = { success: false, code: "MISSING_REQUEST_ID", message: "Request ID is required." };
      res.status(400).json(response); return;
    }

    const appointmentData = await this.counselorBookingService.acceptAppointmentRequest(userId, requestId);

    response = { success: true, code: "APPOINTMENT_REQUEST_ACCEPTED", message: "Appointment request accepted successfully.", data: appointmentData };
    res.status(200).json(response);
  }

  public async declineAppointmentRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.sub;
    const userRole = req.user?.role;
    const { requestId } = req.params;

    let response: ApiResponse;

    if (!userId) {
      response = { success: false, code: "UNAUTHORIZED", message: "User authentication required." };
      res.status(401).json(response); return;
    }

    if (userRole !== "counselor") {
      response = { success: false, code: "FORBIDDEN", message: "Only counselors can reject appointment requests." };
      res.status(403).json(response); return;
    }

    if (!requestId) {
      response = { success: false, code: "MISSING_REQUEST_ID", message: "Request ID is required." };
      res.status(400).json(response); return;
    }

    const appointmentData = await this.counselorBookingService.declineAppointmentRequest(userId, requestId);

    response = { success: true, code: "APPOINTMENT_REQUEST_REJECTED", message: "Appointment request rejected successfully.", data: appointmentData };
    res.status(200).json(response);
  }

  public async cancelAppointment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.sub;
    const userRole = req.user?.role;
    const { appointmentId } = req.params;

    let response: ApiResponse;

    if (!userId) {
      response = { success: false, code: "UNAUTHORIZED", message: "User authentication required." };
      res.status(401).json(response); return;
    }

    if (userRole !== "counselor") {
      response = { success: false, code: "FORBIDDEN", message: "Only counselors can cancel appointments." };
      res.status(403).json(response); return;
    }

    if (!appointmentId) {
      response = { success: false, code: "MISSING_APPOINTMENT_ID", message: "Appointment ID is required." };
      res.status(400).json(response); return;
    }

    const appointmentData = await this.counselorBookingService.cancelAppointment(userId, appointmentId);

    response = { success: true, code: "APPOINTMENT_CANCELLED", message: "Appointment cancelled successfully.", data: appointmentData };
    res.status(200).json(response);
  }

  public async getAppointmentRequests(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.sub;
    const userRole = req.user?.role;
    const requestId = req.params.requestId;

    let response: ApiResponse;

    if (!userId) {
      response = { success: false, code: "UNAUTHORIZED", message: "User authentication required." };
      res.status(401).json(response); return;
    }

    if (userRole !== "counselor") {
      response = { success: false, code: "FORBIDDEN", message: "Only counselors can view their appointment requests." };
      res.status(403).json(response); return;
    }

    const appointmentRequests = await this.counselorBookingService.getAppointmentRequest(userId, requestId);

    response = { success: true, code: "APPOINTMENT_REQUESTS_RETRIEVED", message: "Appointment requests retrieved successfully.", data: appointmentRequests };
    res.status(200).json(response);
  }

  public async getAllAppointmentRequests(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.sub;
    const userRole = req.user?.role;

    let response: ApiResponse;

    if (!userId) {
      response = { success: false, code: "UNAUTHORIZED", message: "User authentication required." };
      res.status(401).json(response); return;
    }

    if (userRole !== "counselor") {
      response = { success: false, code: "FORBIDDEN", message: "Only counselors can view their appointment requests." };
      res.status(403).json(response); return;
    }

    const appointmentRequests = await this.counselorBookingService.getAllAppointmentRequests(userId);

    response = { success: true, code: "APPOINTMENT_REQUESTS_RETRIEVED", message: "Appointment requests retrieved successfully.", data: appointmentRequests };
    res.status(200).json(response);
  }

  public async getAppointment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.sub;
    const userRole = req.user?.role;
    const appointmentId = req.params.appointmentId;

    let response: ApiResponse;

    if (!userId) {
      response = { success: false, code: "UNAUTHORIZED", message: "User authentication required." };
      res.status(401).json(response); return;
    }

    if (userRole !== "counselor") {
      response = { success: false, code: "FORBIDDEN", message: "Only counselors can view their appointments." };
      res.status(403).json(response); return;
    }

    const appointment = await this.counselorBookingService.getAppointment(userId, appointmentId);

    response = { success: true, code: "APPOINTMENT_RETRIEVED", message: "Appointment retrieved successfully.", data: appointment };
    res.status(200).json(response);
  }

  public async getAllAppointments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.sub;
    const userRole = req.user?.role;
    const { startDate, endDate } = req.query;

    let response: ApiResponse;

    if (!userId) {
      response = { success: false, code: "UNAUTHORIZED", message: "User authentication required." };
      res.status(401).json(response); return;
    }

    if (userRole !== "counselor") {
      response = { success: false, code: "FORBIDDEN", message: "Only counselors can view their appointments." };
      res.status(403).json(response); return;
    }

    if (!startDate || !endDate) {
      response = { success: false, code: "BAD_REQUEST", message: "Start date and end date are required." };
      res.status(400).json(response); return;
    }

    const parseStartDate = new Date(startDate as string);
    const parseEndDate = new Date(endDate as string);

    if (isNaN(parseStartDate.getTime())) {
      response = { success: false, code: "INVALID_START", message: "Start time must be a valid ISO 8601 date string (e.g., 2025-11-01T10:00:00Z)" };
      res.status(400).json(response); return;
    }
    if (isNaN(parseEndDate.getTime())) {
      response = { success: false, code: "INVALID_END", message: "End time must be a valid ISO 8601 date string (e.g., 2025-11-01T11:00:00Z)" };
      res.status(400).json(response); return;
    }

    if (parseEndDate <= parseStartDate) {
      response = {
        success: false,
        code: "INVALID_DATE_RANGE",
        message: "End date must be after start date."
      };
      res.status(400).json(response);
      return;
    }

    const appointments = await this.counselorBookingService.getAllAppointments(userId, parseStartDate, parseEndDate);
    response = { success: true, code: "APPOINTMENTS_RETRIEVED", message: "Appointments retrieved successfully.", data: appointments };
    res.status(200).json(response);
  }

  public async getCounselorUnavailableSlots(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.sub;
    const userRole = req.user?.role;
    const { counselorId } = req.params;
    const { startDate, endDate } = req.query;

    let response: ApiResponse;

    if (!userId) {
      response = { success: false, code: "UNAUTHORIZED", message: "User authentication required." };
      res.status(401).json(response); return;
    }

    if (userRole !== "counselor") {
      response = { success: false, code: "FORBIDDEN", message: "Only counselors can view counselor availability." };
      res.status(403).json(response); return;
    }

    if (!counselorId) {
      response = { success: false, code: "MISSING_COUNSELOR_ID", message: "Counselor ID is required." };
      res.status(400).json(response); return;
    }

    if (!startDate || !endDate) {
      response = { success: false, code: "BAD_REQUEST", message: "Start date and end date are required." };
      res.status(400).json(response); return;
    }

    const parseStartDate = new Date(startDate as string);
    const parseEndDate = new Date(endDate as string);

    if (isNaN(parseStartDate.getTime())) {
      response = { success: false, code: "INVALID_START", message: "Start date must be a valid ISO 8601 date string (e.g., 2025-11-01T10:00:00Z)" };
      res.status(400).json(response); return;
    }
    if (isNaN(parseEndDate.getTime())) {
      response = { success: false, code: "INVALID_END", message: "End date must be a valid ISO 8601 date string (e.g., 2025-11-01T11:00:00Z)" };
      res.status(400).json(response); return;
    }

    const unavailableSlots = await this.counselorBookingService.getCounselorUnavailableSlots(
      counselorId, parseStartDate, parseEndDate
    );

    response = { success: true, code: "UNAVAILABLE_SLOTS_RETRIEVED", message: "Counselor unavailable time slots retrieved successfully.", data: unavailableSlots };
    res.status(200).json(response);
  }

  public async getDepartmentAvailableSlots(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.sub;
    const userRole = req.user?.role;
    const department = req.user?.college_department;
    const { startDate, endDate, slotDuration, workStartHour, workEndHour } = req.query;

    let response: ApiResponse;

    if (!userId) {
      response = { success: false, code: "UNAUTHORIZED", message: "User authentication required." };
      res.status(401).json(response); return;
    }

    if (userRole !== "counselor") {
      response = { success: false, code: "FORBIDDEN", message: "Only counselors can view department availability." };
      res.status(403).json(response); return;
    }

    if (!department) {
      response = { success: false, code: "MISSING_DEPARTMENT", message: "Department name is required." };
      res.status(400).json(response); return;
    }

    if (!startDate || !endDate) {
      response = { success: false, code: "BAD_REQUEST", message: "Start date and end date are required." };
      res.status(400).json(response); return;
    }

    const parseStartDate = new Date(startDate as string);
    const parseEndDate = new Date(endDate as string);

    if (isNaN(parseStartDate.getTime())) {
      response = { success: false, code: "INVALID_START", message: "Start date must be a valid ISO 8601 date string (e.g., 2025-11-01T10:00:00Z)" };
      res.status(400).json(response); return;
    }
    if (isNaN(parseEndDate.getTime())) {
      response = { success: false, code: "INVALID_END", message: "End date must be a valid ISO 8601 date string (e.g., 2025-11-01T11:00:00Z)" };
      res.status(400).json(response); return;
    }

    const slotDurationMinutes = slotDuration ? parseInt(slotDuration as string, 10) : 60;
    const workStart = workStartHour ? parseInt(workStartHour as string, 10) : 9;
    const workEnd = workEndHour ? parseInt(workEndHour as string, 10) : 17;

    if (isNaN(slotDurationMinutes) || slotDurationMinutes <= 0) {
      response = { success: false, code: "INVALID_SLOT_DURATION", message: "Slot duration must be a positive number (in minutes)." };
      res.status(400).json(response); return;
    }
    if (isNaN(workStart) || workStart < 0 || workStart > 23) {
      response = { success: false, code: "INVALID_WORK_START_HOUR", message: "Work start hour must be between 0 and 23." };
      res.status(400).json(response); return;
    }
    if (isNaN(workEnd) || workEnd < 0 || workEnd > 24) {
      response = { success: false, code: "INVALID_WORK_END_HOUR", message: "Work end hour must be between 0 and 24." };
      res.status(400).json(response); return;
    }
    if (workStart >= workEnd) {
      response = { success: false, code: "INVALID_WORK_HOURS", message: "Work start hour must be before work end hour." };
      res.status(400).json(response); return;
    }
    
    const availableSlots = await this.counselorBookingService.getDepartmentAvailableSlots(
      department, parseStartDate, parseEndDate, slotDurationMinutes, workStart, workEnd
    );
    response = { success: true, code: "AVAILABLE_SLOTS_RETRIEVED", message: "Department available time slots retrieved successfully.", data: availableSlots };
    res.status(200).json(response);
  }
}
