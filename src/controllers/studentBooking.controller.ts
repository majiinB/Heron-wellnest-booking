
import { type NextFunction, type Response} from "express";
import { logger } from "../utils/logger.util.js";
import type { StudentBookingService } from "../services/studentBooking.service.js";
import { calendarClient } from "../config/googleCalendar.config.js";
import { google } from "googleapis";
import type { AuthenticatedRequest } from "../interface/authRequest.interface.js";
import type { ApiResponse } from "../types/apiResponse.type.js";

interface PubSubMessage {
  message: {
    data: string;
    messageId?: string;
    publishTime?: string;
  };
  subscription?: string;
}

/**
 * Controller class for handling badge awarding via Pub/Sub messages.
 * 
 * @description This class provides methods to handle Pub/Sub messages from activity events
 * and triggers badge checks based on the event type.
 * 
 * @remarks
 * - Receives Pub/Sub messages in base64-encoded format
 * - Decodes and validates message structure
 * - Routes to appropriate badge worker based on eventType
 * - Returns 204 on success, 400 on bad request, 500 on error
 * 
 * @example
 * ```typescript
 * const controller = new BadgeWorkerController(badgeWorkerService);
 * app.post('/pubsub/badge-worker', controller.handleBadgeAwarding.bind(controller));
 * ```
 * 
 * @file badgeWorker.controller.ts
 * 
 * @author Arthur M. Artugue
 * @created 2025-10-26
 * @updated 2025-10-26
 */
export class StudentBookingController {
  private studentBookingService : StudentBookingService;

  constructor(studentBookingService: StudentBookingService){
    this.studentBookingService = studentBookingService
  }

  public async requestAppointment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> { 
    const userId = req.user?.sub;
    const { agenda, counselorId, proposedStart, proposedEnd } = req.body || {};

    let response: ApiResponse;

    // Validate required fields
    if (!userId) {
      response = {
        success: false,
        code: "UNAUTHORIZED",
        message: "User authentication required."
      };
      res.status(401).json(response);
      return;
    }

    if (!agenda) {
      response = {
        success: false,
        code: "MISSING_AGENDA",
        message: "Agenda is required."
      };
      res.status(400).json(response);
      return;
    }

    if (!counselorId) {
      response = {
        success: false,
        code: "MISSING_COUNSELOR_ID",
        message: "Counselor ID is required."
      };
      res.status(400).json(response);
      return;
    }

    if (!counselorId) {
      response = {
        success: false,
        code: "MISSING_COUNSELOR_ID",
        message: "Counselor ID is required."
      };
      res.status(400).json(response);
      return;
    }

    if (!proposedStart) {
      response = {
        success: false,
        code: "MISSING_PROPOSED_START",
        message: "Proposed start time is required."
      };
      res.status(400).json(response);
      return;
    }

    if (!proposedEnd) {
      response = {
        success: false,
        code: "MISSING_PROPOSED_END",
        message: "Proposed end time is required."
      };
      res.status(400).json(response);
      return;
    }

    // Validate agenda type
    const validAgendas = ["counseling", "meeting", "routine_interview", "event"];
    if (!validAgendas.includes(agenda)) {
      response = {
        success: false,
        code: "INVALID_AGENDA",
        message: `Agenda must be one of: ${validAgendas.join(", ")}`
      };
      res.status(400).json(response);
      return;
    }

    // Validate and parse dates (ISO 8601 format expected: YYYY-MM-DDTHH:mm:ss.sssZ)
    const startDate = new Date(proposedStart);
    const endDate = new Date(proposedEnd);

    if (isNaN(startDate.getTime())) {
      response = {
        success: false,
        code: "INVALID_PROPOSED_START",
        message: "Proposed start time must be a valid ISO 8601 date string (e.g., 2025-11-01T10:00:00Z)"
      };
      res.status(400).json(response);
      return;
    }

    if (isNaN(endDate.getTime())) {
      response = {
        success: false,
        code: "INVALID_PROPOSED_END",
        message: "Proposed end time must be a valid ISO 8601 date string (e.g., 2025-11-01T11:00:00Z)"
      };
      res.status(400).json(response);
      return;
    }

    const appointmentRequestData = await this.studentBookingService.requestAppointment(
      userId,
      agenda,
      counselorId,
      startDate,
      endDate
    );

    response = {
      success: true,
      code: "APPOINTMENT_REQUESTED",
      message: "Appointment request created successfully.",
      data: appointmentRequestData
    };

    res.status(201).json(response);
  }

  public async acceptAppointmentRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.sub;
    const userRole = req.user?.role;
    const { requestId } = req.params;

    let response: ApiResponse;

    if (!userId) {
      response = {
        success: false,
        code: "UNAUTHORIZED",
        message: "User authentication required.",
      };

      res.status(401).json(response);
      return;
    }

    if (userRole !== "student") {
      response = {
        success: false,
        code: "FORBIDDEN",
        message: "Only students can accept appointment requests."
      };
      res.status(403).json(response);
      return;
    }

    if (!requestId) {
      response = {
        success: false,
        code: "MISSING_REQUEST_ID",
        message: "Request ID is required."
      };
      res.status(400).json(response);
      return;
    }

    if (!requestId) {
      response = {
        success: false,
        code: "MISSING_REQUEST_ID",
        message: "Request ID is required."
      };
      res.status(400).json(response);
      return;
    }

    const appointmentData = await this.studentBookingService.acceptAppointmentRequest(
      userId,
      requestId
    );

    response = {
      success: true,
      code: "APPOINTMENT_REQUEST_ACCEPTED",
      message: "Appointment request accepted successfully.",
      data: appointmentData
    };

    res.status(200).json(response);
  }

  public async declineAppointmentRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.sub;
    const userRole = req.user?.role;
    const { requestId } = req.params;

    let response: ApiResponse;

    // Validate required fields
    if (!userId) {
      response = {
        success: false,
        code: "UNAUTHORIZED",
        message: "User authentication required."
      };
      res.status(401).json(response);
      return;
    }

    if (userRole !== "student") {
      response = {
        success: false,
        code: "FORBIDDEN",
        message: "Only students can reject appointment requests."
      };
      res.status(403).json(response);
      return;
    }

    if (!requestId) {
      response = {
        success: false,
        code: "MISSING_REQUEST_ID",
        message: "Request ID is required."
      };
      res.status(400).json(response);
      return;
    }

    const appointmentData = await this.studentBookingService.declineAppointmentRequest(
      userId,
      requestId
    );

    response = {
      success: true,
      code: "APPOINTMENT_REQUEST_REJECTED",
      message: "Appointment request rejected successfully.",
      data: appointmentData
    };

    res.status(200).json(response);
  }

  public async cancelAppointment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.sub;
    const userRole = req.user?.role;
    const { appointmentId } = req.params;

    let response: ApiResponse;

    // Validate required fields
    if (!userId) {
      response = {
        success: false,
        code: "UNAUTHORIZED",
        message: "User authentication required."
      };
      res.status(401).json(response);
      return;
    }

    if (userRole !== "student") {
      response = {
        success: false,
        code: "FORBIDDEN",
        message: "Only students can cancel appointments."
      };
      res.status(403).json(response);
      return;
    }

    if (!appointmentId) {
      response = {
        success: false,
        code: "MISSING_APPOINTMENT_ID",
        message: "Appointment ID is required."
      };
      res.status(400).json(response);
      return;
    }

    const appointmentData = await this.studentBookingService.cancelAppointment(
      userId,
      appointmentId
    );

    response = {
      success: true,
      code: "APPOINTMENT_CANCELLED",
      message: "Appointment cancelled successfully.",
      data: appointmentData
    };

    res.status(200).json(response);
  }

  public async getAppointmentRequests(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.sub;
    const userRole = req.user?.role;
    const requestId = req.params.requestId;

    let response: ApiResponse;

    if (!userId) {
      response = {
        success: false,
        code: "UNAUTHORIZED",
        message: "User authentication required.",
      };
      res.status(401).json(response);
      return;
    }

    if (userRole !== "student") {
      response = {
        success: false,
        code: "FORBIDDEN",
        message: "Only students can view their appointment requests."
      };
      res.status(403).json(response);
      return;
    } 

    const appointmentRequests = await this.studentBookingService.getAppointmentRequest(userId, requestId);

    response = {
      success: true,
      code: "APPOINTMENT_REQUESTS_RETRIEVED",
      message: "Appointment requests retrieved successfully.",
      data: appointmentRequests
    };

    res.status(200).json(response);
  }

  public async getAllAppointmentRequests(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.sub;
    const userRole = req.user?.role;

    let response: ApiResponse;

    if (!userId) {
      response = {
        success: false,
        code: "UNAUTHORIZED",
        message: "User authentication required.",
      };
      res.status(401).json(response);
      return;
    }

    if (userRole !== "student") {
      response = {
        success: false,
        code: "FORBIDDEN",
        message: "Only students can view their appointment requests."
      };
      res.status(403).json(response);
      return;
    }

    const appointmentRequests = await this.studentBookingService.getAllAppointmentRequests(userId);

    response = {
      success: true,
      code: "APPOINTMENT_REQUESTS_RETRIEVED",
      message: "Appointment requests retrieved successfully.",
      data: appointmentRequests
    };

    res.status(200).json(response);
  }

  public async getAppointment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.sub;
    const userRole = req.user?.role;
    const appointmentId = req.params.appointmentId;

    let response: ApiResponse;

    if (!userId) {
      response = {
        success: false,
        code: "UNAUTHORIZED",
        message: "User authentication required.",
      };
      res.status(401).json(response);
      return;
    }

    if (userRole !== "student") {
      response = {
        success: false,
        code: "FORBIDDEN",
        message: "Only students can view their appointments."
      };
      res.status(403).json(response);
      return;
    }

    const appointment = await this.studentBookingService.getAppointment(userId, appointmentId);

    response = {
      success: true,
      code: "APPOINTMENT_RETRIEVED",
      message: "Appointment retrieved successfully.",
      data: appointment
    };

    res.status(200).json(response);
  }

  public async getAllAppointments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.sub;
    const userRole = req.user?.role;
    const {startDate, endDate} = req.query;

    let response: ApiResponse;

    if (!userId) {
      response = {
        success: false,
        code: "UNAUTHORIZED",
        message: "User authentication required.",
      };
      res.status(401).json(response);
      return;
    }

    if (userRole !== "student") {
      response = {
        success: false,
        code: "FORBIDDEN",
        message: "Only students can view their appointments."
      };
      res.status(403).json(response);
      return;
    }

    if (!startDate || !endDate) {
      response = {
        success: false,
        code: "BAD_REQUEST",
        message: "Start date and end date are required.",
      };
      res.status(400).json(response);
      return;
    }

    // Validate and parse dates (ISO 8601 format expected: YYYY-MM-DDTHH:mm:ss.sssZ)
    const parseStartDate = new Date(startDate as string);
    const parseEndDate = new Date(endDate as string);

    if (isNaN(parseStartDate.getTime())) {
      response = {
        success: false,
        code: "INVALID_START",
        message: "Start time must be a valid ISO 8601 date string (e.g., 2025-11-01T10:00:00Z)"
      };
      res.status(400).json(response);
      return;
    }

    if (isNaN(parseEndDate.getTime())) {
      response = {
        success: false,
        code: "INVALID_END",
        message: "End time must be a valid ISO 8601 date string (e.g., 2025-11-01T11:00:00Z)"
      };
      res.status(400).json(response);
      return;
    }

    const appointments = await this.studentBookingService.getAllAppointments(userId, parseStartDate, parseEndDate);

    response = {
      success: true,
      code: "APPOINTMENTS_RETRIEVED",
      message: "Appointments retrieved successfully.",
      data: appointments
    };

    res.status(200).json(response);
  }

  public async getCounselorUnavailableSlots(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.sub;
    const userRole = req.user?.role;
    const { counselorId } = req.params;
    const { startDate, endDate } = req.query;

    let response: ApiResponse;

    if (!userId) {
      response = {
        success: false,
        code: "UNAUTHORIZED",
        message: "User authentication required.",
      };
      res.status(401).json(response);
      return;
    }

    if (userRole !== "student") {
      response = {
        success: false,
        code: "FORBIDDEN",
        message: "Only students can view counselor availability."
      };
      res.status(403).json(response);
      return;
    }

    if (!counselorId) {
      response = {
        success: false,
        code: "MISSING_COUNSELOR_ID",
        message: "Counselor ID is required."
      };
      res.status(400).json(response);
      return;
    }

    if (!startDate || !endDate) {
      response = {
        success: false,
        code: "BAD_REQUEST",
        message: "Start date and end date are required.",
      };
      res.status(400).json(response);
      return;
    }

    // Validate and parse dates (ISO 8601 format expected: YYYY-MM-DDTHH:mm:ss.sssZ)
    const parseStartDate = new Date(startDate as string);
    const parseEndDate = new Date(endDate as string);

    if (isNaN(parseStartDate.getTime())) {
      response = {
        success: false,
        code: "INVALID_START",
        message: "Start date must be a valid ISO 8601 date string (e.g., 2025-11-01T10:00:00Z)"
      };
      res.status(400).json(response);
      return;
    }

    if (isNaN(parseEndDate.getTime())) {
      response = {
        success: false,
        code: "INVALID_END",
        message: "End date must be a valid ISO 8601 date string (e.g., 2025-11-01T11:00:00Z)"
      };
      res.status(400).json(response);
      return;
    }

    const unavailableSlots = await this.studentBookingService.getCounselorUnavailableSlots(
      counselorId,
      parseStartDate,
      parseEndDate
    );

    response = {
      success: true,
      code: "UNAVAILABLE_SLOTS_RETRIEVED",
      message: "Counselor unavailable time slots retrieved successfully.",
      data: unavailableSlots
    };

    res.status(200).json(response);
  }

  public async getDepartmentAvailableSlots(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const userId = req.user?.sub;
    const userRole = req.user?.role;
    const department = req.user?.college_department;
    const { startDate, endDate, slotDuration, workStartHour, workEndHour } = req.query;

    let response: ApiResponse;

    if (!userId) {
      response = {
        success: false,
        code: "UNAUTHORIZED",
        message: "User authentication required.",
      };
      res.status(401).json(response);
      return;
    }

    if (userRole !== "student") {
      response = {
        success: false,
        code: "FORBIDDEN",
        message: "Only students can view department availability."
      };
      res.status(403).json(response);
      return;
    }

    if (!department) {
      response = {
        success: false,
        code: "MISSING_DEPARTMENT",
        message: "Department name is required."
      };
      res.status(400).json(response);
      return;
    }

    if (!startDate || !endDate) {
      response = {
        success: false,
        code: "BAD_REQUEST",
        message: "Start date and end date are required.",
      };
      res.status(400).json(response);
      return;
    }

    // Validate and parse dates
    const parseStartDate = new Date(startDate as string);
    const parseEndDate = new Date(endDate as string);

    if (isNaN(parseStartDate.getTime())) {
      response = {
        success: false,
        code: "INVALID_START",
        message: "Start date must be a valid ISO 8601 date string (e.g., 2025-11-01T10:00:00Z)"
      };
      res.status(400).json(response);
      return;
    }

    if (isNaN(parseEndDate.getTime())) {
      response = {
        success: false,
        code: "INVALID_END",
        message: "End date must be a valid ISO 8601 date string (e.g., 2025-11-01T11:00:00Z)"
      };
      res.status(400).json(response);
      return;
    }

    // Parse optional parameters with defaults
    const slotDurationMinutes = slotDuration ? parseInt(slotDuration as string, 10) : 60;
    const workStart = workStartHour ? parseInt(workStartHour as string, 10) : 9;
    const workEnd = workEndHour ? parseInt(workEndHour as string, 10) : 17;

    // Validate optional parameters
    if (isNaN(slotDurationMinutes) || slotDurationMinutes <= 0) {
      response = {
        success: false,
        code: "INVALID_SLOT_DURATION",
        message: "Slot duration must be a positive number (in minutes)."
      };
      res.status(400).json(response);
      return;
    }

    if (isNaN(workStart) || workStart < 0 || workStart > 23) {
      response = {
        success: false,
        code: "INVALID_WORK_START_HOUR",
        message: "Work start hour must be between 0 and 23."
      };
      res.status(400).json(response);
      return;
    }

    if (isNaN(workEnd) || workEnd < 0 || workEnd > 24) {
      response = {
        success: false,
        code: "INVALID_WORK_END_HOUR",
        message: "Work end hour must be between 0 and 24."
      };
      res.status(400).json(response);
      return;
    }

    if (workStart >= workEnd) {
      response = {
        success: false,
        code: "INVALID_WORK_HOURS",
        message: "Work start hour must be before work end hour."
      };
      res.status(400).json(response);
      return;
    }

    const availableSlots = await this.studentBookingService.getDepartmentAvailableSlots(
      department,
      parseStartDate,
      parseEndDate,
      slotDurationMinutes,
      workStart,
      workEnd
    );

    response = {
      success: true,
      code: "AVAILABLE_SLOTS_RETRIEVED",
      message: "Department available time slots retrieved successfully.",
      data: availableSlots
    };

    res.status(200).json(response);
  }
}