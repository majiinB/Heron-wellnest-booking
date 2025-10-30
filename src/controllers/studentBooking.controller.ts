
import { type NextFunction, type Response} from "express";
import { logger } from "../utils/logger.util.js";
import type { StudentBookingService } from "../services/studentBooking.service.js";
import { calendarClient } from "../config/googleCalendar.config.js";
import { google } from "googleapis";
import type { AuthenticatedRequest } from "../interface/authRequest.interface.js";

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
    try {
      const userId = req.user?.sub;
      const { agenda, counselorId, proposedStart, proposedEnd } = req.body || {};

      // Validate required fields
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "User authentication required."
          }
        });
        return;
      }

      if (!agenda) {
        res.status(400).json({
          success: false,
          error: {
            code: "MISSING_AGENDA",
            message: "Agenda is required."
          }
        });
        return;
      }

      if (!counselorId) {
        res.status(400).json({
          success: false,
          error: {
            code: "MISSING_COUNSELOR_ID",
            message: "Counselor ID is required."
          }
        });
        return;
      }

      if (!proposedStart) {
        res.status(400).json({
          success: false,
          error: {
            code: "MISSING_PROPOSED_START",
            message: "Proposed start time is required."
          }
        });
        return;
      }

      if (!proposedEnd) {
        res.status(400).json({
          success: false,
          error: {
            code: "MISSING_PROPOSED_END",
            message: "Proposed end time is required."
          }
        });
        return;
      }

      // Validate agenda type
      const validAgendas = ["counseling", "meeting", "routine_interview", "event"];
      if (!validAgendas.includes(agenda)) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_AGENDA",
            message: `Agenda must be one of: ${validAgendas.join(", ")}`
          }
        });
        return;
      }

      // Validate and parse dates (ISO 8601 format expected: YYYY-MM-DDTHH:mm:ss.sssZ)
      const startDate = new Date(proposedStart);
      const endDate = new Date(proposedEnd);

      if (isNaN(startDate.getTime())) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_PROPOSED_START",
            message: "Proposed start time must be a valid ISO 8601 date string (e.g., 2025-11-01T10:00:00Z)"
          }
        });
        return;
      }

      if (isNaN(endDate.getTime())) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_PROPOSED_END",
            message: "Proposed end time must be a valid ISO 8601 date string (e.g., 2025-11-01T11:00:00Z)"
          }
        });
        return;
      }

      const appointmentRequestData = await this.studentBookingService.requestAppointment(
        userId,
        agenda,
        counselorId,
        startDate,
        endDate
      );

      res.status(201).json({
        success: true,
        data: appointmentRequestData
      });
    } catch (error) {
      next(error);
    }
  }
}