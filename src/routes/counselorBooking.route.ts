import express, { Router } from 'express';
import { CounselorBookingController } from '../controllers/counselorBooking.controller.js';
import { CounselorBookingService } from '../services/counselorBooking.service.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';
import { heronAuthMiddleware } from '../middlewares/heronAuth.middleware..js';
import { AppointmentRequestRepository } from '../repository/appointmentRequest.repository.js';
import { AppointmentRepository } from '../repository/appointment.repository.js';
import { StudentRepository } from '../repository/student.repository.js';
import { CounselorRepository } from '../repository/counselor.repository.js';
import { GoogleCalendarRepository } from '../repository/googleCalendar.repository.js';

const router: Router = express.Router();

const appointmentRequestRepository = new AppointmentRequestRepository();
const appointmentRepository = new AppointmentRepository();
const studentRepository = new StudentRepository();
const counselorRepository = new CounselorRepository();
const googleCalendarRepository = new GoogleCalendarRepository();

const counselorBookingService = new CounselorBookingService(
  appointmentRequestRepository,
  appointmentRepository,
  studentRepository,
  counselorRepository,
  googleCalendarRepository
);
const counselorBookingController = new CounselorBookingController(counselorBookingService);

// Appointment Request routes

/**
 * @openapi
 * /counselor/requests/:
 *   post:
 *     summary: Create an appointment request (counselor → student)
 *     description: |
 *       Allows an authenticated counselor to create an appointment request for a student.
 *       The counselor must provide the agenda, the target student's ID, and ISO 8601 start/end times.
 *       Validations ensure correct agenda type, UUID format, and logical time constraints.
 *     tags:
 *       - Booking / Counselor
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agenda
 *               - studentId
 *               - proposedStart
 *               - proposedEnd
 *             properties:
 *               agenda:
 *                 type: string
 *                 enum: [counseling, meeting, routine_interview, event]
 *                 example: counseling
 *               studentId:
 *                 type: string
 *                 format: uuid
 *                 example: 6a4952ff-f93d-48ff-a8fc-8544182f69c0
 *               proposedStart:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-11-15T09:00:00Z
 *               proposedEnd:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-11-15T10:00:00Z
 *     responses:
 *       '201':
 *         description: Appointment request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: string
 *                   example: APPOINTMENT_REQUESTED
 *                 message:
 *                   type: string
 *                   example: Appointment request created successfully.
 *                 data:
 *                   type: object
 *                   properties:
 *                     request_id:
 *                       type: string
 *                       format: uuid
 *                       example: 6d3f52ac-9a4a-4c3a-b7b1-9a2b4c21f0f1
 *                     student_id:
 *                       type: string
 *                       format: uuid
 *                       example: 6a4952ff-f93d-48ff-a8fc-8544182f69c0
 *                     counselor_id:
 *                       type: string
 *                       format: uuid
 *                       example: c5e4f2bf-af11-489a-99cf-0954c3f9f3f7
 *                     department:
 *                       type: string
 *                       example: COLLEGE OF COMPUTING AND INFORMATION SCIENCES
 *                     agenda:
 *                       type: string
 *                       example: counseling
 *                     proposed_start:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-11-15T09:00:00.000Z
 *                     proposed_end:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-11-15T10:00:00.000Z
 *                     proposed_by:
 *                       type: string
 *                       example: counselor
 *                     created_by:
 *                       type: string
 *                       example: counselor
 *                     student_response:
 *                       type: string
 *                       example: pending
 *                     counselor_response:
 *                       type: string
 *                       example: accepted
 *                     status:
 *                       type: string
 *                       example: pending
 *                     finalized_at:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-10-31T09:18:06.796Z
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-10-31T09:18:06.796Z
 *       '400':
 *         description: Bad request - validation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: INVALID_TIME_RANGE
 *                 message:
 *                   type: string
 *                   example: Proposed end time must be after start time.
 *       '401':
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: UNAUTHORIZED
 *                 message:
 *                   type: string
 *                   example: User authentication required.
 *       '403':
 *         description: Forbidden - counselor role required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: FORBIDDEN
 *                 message:
 *                   type: string
 *                   example: Only counselors can request appointments.
 *       '404':
 *         description: Not Found - counselor or student not found
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: false
 *                     code:
 *                       type: string
 *                       example: COUNSELOR_NOT_FOUND
 *                     message:
 *                       type: string
 *                       example: The counselor does not exist.
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: false
 *                     code:
 *                       type: string
 *                       example: STUDENT_NOT_FOUND
 *                     message:
 *                       type: string
 *                       example: Student with ID 6a4952ff-f93d-48ff-a8fc-8544182f69c0 not found.
 *       '409':
 *         description: Conflict - duplicate request or unavailable slot
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: false
 *                     code:
 *                       type: string
 *                       example: DUPLICATE_REQUEST
 *                     message:
 *                       type: string
 *                       example: An appointment request with the same details already exists.
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: false
 *                     code:
 *                       type: string
 *                       example: TIME_SLOT_UNAVAILABLE
 *                     message:
 *                       type: string
 *                       example: There is a conflicting event in the department calendar during this time.
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               serverError:
 *                 value:
 *                   success: false
 *                   code: INTERNAL_SERVER_ERROR
 *                   message: Internal server error
 */
router.post('/requests/', heronAuthMiddleware, asyncHandler(counselorBookingController.requestAppointment.bind(counselorBookingController)));

/**
 * @openapi
 * /counselor/requests/{requestId}/accept:
 *   patch:
 *     summary: Accept an appointment request (counselor)
 *     description: |
 *       Allows an authenticated **counselor** to accept an appointment request.
 *       If both counselor and student have accepted, the system automatically finalizes the request,
 *       creates a confirmed appointment, and synchronizes it with Google Calendar.
 *     tags:
 *       - Booking / Counselor
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the appointment request to accept.
 *     responses:
 *       '200':
 *         description: Appointment request accepted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: string
 *                   example: APPOINTMENT_REQUEST_ACCEPTED
 *                 message:
 *                   type: string
 *                   example: Appointment request accepted successfully.
 *                 data:
 *                   type: object
 *                   properties:
 *                     appointment_id:
 *                       type: string
 *                       format: uuid
 *                       example: a97b1e5d-4cf4-4c24-a13f-bf82d5fdc908
 *                     request_id:
 *                       type: string
 *                       format: uuid
 *                       example: c59125af-8102-4884-a565-183ca9771c56
 *                     student_id:
 *                       type: string
 *                       format: uuid
 *                       example: 6a4952ff-f93d-48ff-a8fc-8544182f69c0
 *                     counselor_id:
 *                       type: string
 *                       format: uuid
 *                       example: c5e4f2bf-af11-489a-99cf-0954c3f9f3f7
 *                     department:
 *                       type: string
 *                       example: COLLEGE OF COMPUTING AND INFORMATION SCIENCES
 *                     agenda:
 *                       type: string
 *                       enum: [counseling, meeting, routine_interview, event]
 *                       example: counseling
 *                     start_time:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-11-15T09:00:00.000Z
 *                     end_time:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-11-15T10:00:00.000Z
 *                     google_event_id:
 *                       type: string
 *                       example: "event_1AbCDeFgHiJKlMnOp"
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-10-31T09:18:06.796Z
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-10-31T09:18:06.796Z
 *       '400':
 *         description: Invalid request (already accepted, declined, or missing data)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidStatus:
 *                 value:
 *                   success: false
 *                   code: INVALID_REQUEST_STATUS
 *                   message: Only pending appointment requests can be accepted.
 *               invalidResponse:
 *                 value:
 *                   success: false
 *                   code: INVALID_COUNSELOR_RESPONSE
 *                   message: Cannot accept an appointment request that the counselor has already responded to.
 *       '401':
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               unauthorized:
 *                 value:
 *                   success: false
 *                   code: UNAUTHORIZED
 *                   message: User authentication required.
 *       '403':
 *         description: Forbidden - counselor role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               forbidden:
 *                 value:
 *                   success: false
 *                   code: FORBIDDEN
 *                   message: Only counselors can accept appointment requests.
 *       '404':
 *         description: Appointment request not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               notFound:
 *                 value:
 *                   success: false
 *                   code: REQUEST_NOT_FOUND
 *                   message: Appointment request with ID 123 not found.
 *       '409':
 *         description: Time slot conflict (database or Google Calendar)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               dbConflict:
 *                 value:
 *                   success: false
 *                   code: TIME_SLOT_UNAVAILABLE
 *                   message: Counselor already has a confirmed appointment during this time.
 *               calendarConflict:
 *                 value:
 *                   success: false
 *                   code: TIME_SLOT_UNAVAILABLE
 *                   message: There is a conflicting event in the department calendar during this time.
 *       '500':
 *         description: Internal server or Google Calendar error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               calendarError:
 *                 value:
 *                   success: false
 *                   code: GOOGLE_CALENDAR_EVENT_CREATION_FAILED
 *                   message: Failed to create Google Calendar event for the appointment.
 *               serverError:
 *                 value:
 *                   success: false
 *                   code: INTERNAL_SERVER_ERROR
 *                   message: Internal server error
 */
router.patch('/requests/:requestId/accept', heronAuthMiddleware, asyncHandler(counselorBookingController.acceptAppointmentRequest.bind(counselorBookingController)));

/**
 * @openapi
 * /counselor/requests/{requestId}/decline:
 *   patch:
 *     summary: Decline an appointment request (counselor)
 *     description: |
 *       Allows an authenticated **counselor** to decline a pending appointment request.  
 *       The request must still be in a `pending` state and the counselor’s response must not yet be recorded.  
 *       Once declined, the appointment request’s status becomes `declined` and is finalized.
 *     tags:
 *       - Booking / Counselor
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the appointment request to decline.
 *     responses:
 *       '200':
 *         description: Appointment request declined successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: string
 *                   example: APPOINTMENT_REQUEST_REJECTED
 *                 message:
 *                   type: string
 *                   example: Appointment request rejected successfully.
 *                 data:
 *                   type: object
 *                   properties:
 *                     request_id:
 *                       type: string
 *                       format: uuid
 *                       example: c253bc15-0048-4f67-a23f-0aa81b94d8c3
 *                     student_id:
 *                       type: string
 *                       format: uuid
 *                       example: 6a4952ff-f93d-48ff-a8fc-8544182f69c0
 *                     counselor_id:
 *                       type: string
 *                       format: uuid
 *                       example: c5e4f2bf-af11-489a-99cf-0954c3f9f3f7
 *                     department:
 *                       type: string
 *                       example: COLLEGE OF COMPUTING AND INFORMATION SCIENCES
 *                     agenda:
 *                       type: string
 *                       example: meeting
 *                     proposed_start:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-11-15T09:00:00.000Z
 *                     proposed_end:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-11-15T10:00:00.000Z
 *                     proposed_by:
 *                       type: string
 *                       example: student
 *                     created_by:
 *                       type: string
 *                       example: student
 *                     student_response:
 *                       type: string
 *                       enum: [pending, accepted, declined]
 *                       example: accepted
 *                     counselor_response:
 *                       type: string
 *                       enum: [pending, accepted, declined]
 *                       example: declined
 *                     status:
 *                       type: string
 *                       enum: [pending, both_confirmed, declined, cancelled]
 *                       example: declined
 *                     finalized_at:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-10-31T14:47:14.613Z
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-10-31T09:50:37.451Z
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-10-31T14:47:14.617Z
 *       '400':
 *         description: Invalid or already processed appointment request.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidStatus:
 *                 value:
 *                   success: false
 *                   code: INVALID_REQUEST_STATUS
 *                   message: Only pending appointment requests can be declined.
 *               invalidResponse:
 *                 value:
 *                   success: false
 *                   code: INVALID_COUNSELOR_RESPONSE
 *                   message: Cannot decline an appointment request that the counselor has already responded to.
 *       '401':
 *         description: Unauthorized - missing or invalid access token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               unauthorized:
 *                 value:
 *                   success: false
 *                   code: UNAUTHORIZED
 *                   message: User authentication required.
 *       '403':
 *         description: Forbidden - only counselors can decline appointment requests.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               forbidden:
 *                 value:
 *                   success: false
 *                   code: FORBIDDEN
 *                   message: Only counselors can reject appointment requests.
 *       '404':
 *         description: Appointment request not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               notFound:
 *                 value:
 *                   success: false
 *                   code: REQUEST_NOT_FOUND
 *                   message: Appointment request with ID {requestId} not found.
 *       '500':
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               internalError:
 *                 value:
 *                   success: false
 *                   code: INTERNAL_SERVER_ERROR
 *                   message: Internal server error.
 */
router.patch('/requests/:requestId/decline', heronAuthMiddleware, asyncHandler(counselorBookingController.declineAppointmentRequest.bind(counselorBookingController)));

/**
 * @openapi
 * /counselor/requests/:
 *   get:
 *     summary: Retrieve all appointment requests (counselor)
 *     description: |
 *       Allows an authenticated counselor to retrieve all appointment requests assigned to them.
 *       Optionally filters by status (pending, both_confirmed, declined, expired) if provided as a query parameter.
 *     tags:
 *       - Booking / Counselor
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum:
 *             - pending
 *             - both_confirmed
 *             - declined
 *             - expired
 *         description: Filter appointment requests by status
 *     responses:
 *       '200':
 *         description: Appointment requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: string
 *                   example: APPOINTMENT_REQUESTS_RETRIEVED
 *                 message:
 *                   type: string
 *                   example: Appointment requests retrieved successfully.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       request_id:
 *                         type: string
 *                         format: uuid
 *                         example: c59125af-8102-4884-a565-183ca9771c56
 *                       student_id:
 *                         type: string
 *                         format: uuid
 *                         example: 6a4952ff-f93d-48ff-a8fc-8544182f69c0
 *                       counselor_id:
 *                         type: string
 *                         format: uuid
 *                         example: c5e4f2bf-af11-489a-99cf-0954c3f9f3f7
 *                       department:
 *                         type: string
 *                         example: COLLEGE OF COMPUTING AND INFORMATION SCIENCES
 *                       agenda:
 *                         type: string
 *                         enum: [counseling, meeting, routine_interview, event]
 *                         example: counseling
 *                       proposed_start:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-11-15T09:00:00.000Z
 *                       proposed_end:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-11-15T10:00:00.000Z
 *                       proposed_by:
 *                         type: string
 *                         example: counselor
 *                       created_by:
 *                         type: string
 *                         example: counselor
 *                       student_response:
 *                         type: string
 *                         example: pending
 *                       counselor_response:
 *                         type: string
 *                         example: accepted
 *                       status:
 *                         type: string
 *                         example: pending
 *                       finalized_at:
 *                         type: string
 *                         nullable: true
 *                         example: null
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-10-31T09:18:06.796Z
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-10-31T09:18:06.796Z
 *       '401':
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: UNAUTHORIZED
 *                 message:
 *                   type: string
 *                   example: User authentication required.
 *       '403':
 *         description: Forbidden - counselor role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               forbidden:
 *                 value:
 *                   success: false
 *                   code: FORBIDDEN
 *                   message: Only counselors can view their appointment requests.
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               serverError:
 *                 value:
 *                   success: false
 *                   code: INTERNAL_SERVER_ERROR
 *                   message: Internal server error
 */
router.get('/requests/', heronAuthMiddleware, asyncHandler(counselorBookingController.getAllAppointmentRequests.bind(counselorBookingController)));


router.get('/requests/:requestId', heronAuthMiddleware, asyncHandler(counselorBookingController.getAppointmentRequests.bind(counselorBookingController)));

// Appointment routes
/**
 * @openapi
 * /counselor/appointments/:
 *   get:
 *     summary: Retrieve all confirmed appointments (counselor)
 *     description: |
 *       Allows an authenticated counselor to retrieve all their confirmed appointments within a specific date range.
 *       The request must include both a `startDate` and an `endDate` as ISO 8601 date strings.
 *     tags:
 *       - Booking / Counselor
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *           example: 2025-11-01T00:00:00Z
 *         description: The start date (inclusive) for filtering appointments.
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *           example: 2025-11-30T23:59:59Z
 *         description: The end date (inclusive) for filtering appointments.
 *     responses:
 *       '200':
 *         description: Appointments retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: string
 *                   example: APPOINTMENTS_RETRIEVED
 *                 message:
 *                   type: string
 *                   example: Appointments retrieved successfully.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       appointment_id:
 *                         type: string
 *                         format: uuid
 *                         example: 846bfe36-da6d-4497-acd2-21d1062ebb56
 *                       student_id:
 *                         type: string
 *                         format: uuid
 *                         example: 6a4952ff-f93d-48ff-a8fc-8544182f69c0
 *                       counselor_id:
 *                         type: string
 *                         format: uuid
 *                         example: c5e4f2bf-af11-489a-99cf-0954c3f9f3f7
 *                       department:
 *                         type: string
 *                         example: COLLEGE OF COMPUTING AND INFORMATION SCIENCES
 *                       agenda:
 *                         type: string
 *                         example: event
 *                       start_time:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-11-15T09:00:00.000Z
 *                       end_time:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-11-15T10:00:00.000Z
 *                       google_event_id:
 *                         type: string
 *                         example: 5ajjanuig8bd7luhgbd4e9qm7s
 *                       status:
 *                         type: string
 *                         enum: [pending, both_confirmed, declined, expired]
 *                         example: both_confirmed
 *                       cancelled_by:
 *                         type: string
 *                         nullable: true
 *                         example: null
 *                       cancelled_at:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                         example: null
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-10-31T14:27:11.056Z
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-10-31T14:27:11.056Z
 *                       request_id:
 *                         type: string
 *                         format: uuid
 *                         example: 45826df6-6fc2-447c-82e6-73796b05e960
 *       '400':
 *         description: Bad request — missing or invalid query parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: BAD_REQUEST
 *                 message:
 *                   type: string
 *                   example: Start date and end date are required.
 *       '401':
 *         description: Unauthorized — user not authenticated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: UNAUTHORIZED
 *                 message:
 *                   type: string
 *                   example: User authentication required.
 *       '403':
 *         description: Forbidden — only counselors can access this endpoint.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               forbidden:
 *                 value:
 *                   success: false
 *                   code: FORBIDDEN
 *                   message: Only counselors can view their appointments.
 *       '500':
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               serverError:
 *                 value:
 *                   success: false
 *                   code: INTERNAL_SERVER_ERROR
 *                   message: Internal server error.
 */
router.get('/appointments/', heronAuthMiddleware, asyncHandler(counselorBookingController.getAllAppointments.bind(counselorBookingController)));
router.get('/appointments/:appointmentId', heronAuthMiddleware, asyncHandler(counselorBookingController.getAppointment.bind(counselorBookingController)));
router.delete('/appointments/:appointmentId', heronAuthMiddleware, asyncHandler(counselorBookingController.cancelAppointment.bind(counselorBookingController)));

// Availability routes
/**
 * @openapi
 * /counselor/availability/:
 *   get:
 *     summary: Retrieve counselor unavailable time slots
 *     description: |
 *       Allows an authenticated counselor to view their **unavailable time slots** (based on confirmed appointments)
 *       within a specific date range. The request must include both a `startDate` and an `endDate` as ISO 8601 date strings.
 *     tags:
 *       - Booking / Counselor
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *           example: 2025-11-01T00:00:00Z
 *         description: The start date (inclusive) for filtering unavailable time slots.
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *           example: 2025-11-30T23:59:59Z
 *         description: The end date (inclusive) for filtering unavailable time slots.
 *     responses:
 *       '200':
 *         description: Unavailable time slots retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: string
 *                   example: UNAVAILABLE_SLOTS_RETRIEVED
 *                 message:
 *                   type: string
 *                   example: Counselor unavailable time slots retrieved successfully.
 *                 data:
 *                   type: array
 *                   description: List of unavailable time slots within the given range.
 *                   items:
 *                     type: object
 *                     properties:
 *                       start:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-11-15T09:00:00.000Z
 *                       end:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-11-15T10:00:00.000Z
 *                       agenda:
 *                         type: string
 *                         example: event
 *       '400':
 *         description: Bad request — missing or invalid query parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: BAD_REQUEST
 *                 message:
 *                   type: string
 *                   example: Start date and end date are required.
 *       '401':
 *         description: Unauthorized — user not authenticated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: UNAUTHORIZED
 *                 message:
 *                   type: string
 *                   example: User authentication required.
 *       '403':
 *         description: Forbidden — only counselors can access this endpoint.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               forbidden:
 *                 value:
 *                   success: false
 *                   code: FORBIDDEN
 *                   message: Only counselors can view counselor availability.
 *       '500':
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               serverError:
 *                 value:
 *                   success: false
 *                   code: INTERNAL_SERVER_ERROR
 *                   message: Internal server error.
 */
router.get('/availability/', heronAuthMiddleware, asyncHandler(counselorBookingController.getCounselorUnavailableSlots.bind(counselorBookingController)));

/**
 * @openapi
 * /counselor/availability/department:
 *   get:
 *     summary: Get available counseling slots for a counselor's department
 *     description: Retrieves available time slots for the counselor's department between a given start and end date. Only counselors can access this endpoint.
 *     tags:
 *       - Booking / Counselor
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         example: "2025-11-01T10:00:00Z"
 *         description: The start of the date range to check for available slots (ISO 8601 format).
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         example: "2025-11-05T17:00:00Z"
 *         description: The end of the date range to check for available slots (ISO 8601 format).
 *       - in: query
 *         name: slotDuration
 *         required: false
 *         schema:
 *           type: integer
 *           default: 60
 *         example: 60
 *         description: Duration of each slot in minutes.
 *       - in: query
 *         name: workStartHour
 *         required: false
 *         schema:
 *           type: integer
 *           default: 9
 *         example: 9
 *         description: The hour of the day when working hours start (0–23).
 *       - in: query
 *         name: workEndHour
 *         required: false
 *         schema:
 *           type: integer
 *           default: 17
 *         example: 17
 *         description: The hour of the day when working hours end (0–24).
 *     responses:
 *       200:
 *         description: Successfully retrieved available department slots.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 code:
 *                   type: string
 *                   example: AVAILABLE_SLOTS_RETRIEVED
 *                 message:
 *                   type: string
 *                   example: Department available time slots retrieved successfully.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       start:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-11-03T01:00:00.000Z"
 *                       end:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-11-03T02:00:00.000Z"
 *       400:
 *         description: Invalid or missing query parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 code:
 *                   type: string
 *                   example: INVALID_DATE_RANGE
 *                 message:
 *                   type: string
 *                   example: End date must be after start date.
 *       401:
 *         description: Unauthorized. Missing or invalid token.
 *       403:
 *         description: Forbidden. Only counselors can access this resource.
 *     examples:
 *       success:
 *         value:
 *           success: true
 *           code: AVAILABLE_SLOTS_RETRIEVED
 *           message: Department available time slots retrieved successfully.
 *           data:
 *             - start: "2025-11-03T01:00:00.000Z"
 *               end: "2025-11-03T02:00:00.000Z"
 *             - start: "2025-11-03T02:00:00.000Z"
 *               end: "2025-11-03T03:00:00.000Z"
 */
router.get('/availability/department/', heronAuthMiddleware, asyncHandler(counselorBookingController.getDepartmentAvailableSlots.bind(counselorBookingController)));

export default router;
