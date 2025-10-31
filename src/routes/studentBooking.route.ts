import express, { Router } from 'express';
import { StudentBookingController } from '../controllers/studentBooking.controller.js';
import { StudentBookingService } from '../services/studentBooking.service.js';
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

const studentBookingService = new StudentBookingService(
  appointmentRequestRepository,
  appointmentRepository,
  studentRepository,
  counselorRepository,
  googleCalendarRepository
);
const studentBookingController = new StudentBookingController(studentBookingService);

/**
 * @openapi
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         code:
 *           type: string
 *           example: BAD_REQUEST
 *         message:
 *           type: string
 *           example: Invalid input data
 */

// Appointment Request routes
/**
 * @openapi
 * /student/requests/:
 *   post:
 *     summary: Create an appointment request (student → counselor)
 *     description: |
 *       Allows an authenticated student to create an appointment request for a counselor.
 *       The student must provide the agenda, the target counselor's ID, and ISO 8601 start/end times.
 *       Validations ensure correct agenda type, UUID format, and time constraints.
 *     tags:
 *       - Booking / Student
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
 *               - counselorId
 *               - proposedStart
 *               - proposedEnd
 *             properties:
 *               agenda:
 *                 type: string
 *                 enum: [counseling, meeting, routine_interview, event]
 *                 example: counseling
 *               counselorId:
 *                 type: string
 *                 format: uuid
 *                 example: c5e4f2bf-af11-489a-99cf-0954c3f9f3f7
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
 *                       example: 284e64fc-79cc-40a9-b517-8238922cbf9a
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
 *                       example: student
 *                     created_by:
 *                       type: string
 *                       example: student
 *                     student_response:
 *                       type: string
 *                       example: accepted
 *                     counselor_response:
 *                       type: string
 *                       example: pending
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
 *       "403":
 *         description: Forbidden - student role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               forbidden:
 *                 value:
 *                   success: false
 *                   code: FORBIDDEN
 *                   message: "Forbidden: Insufficient permissions / Forbidden: student role required"
 *       '404':
 *         description: Not Found - student or counselor not found
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
 *                       example: STUDENT_NOT_FOUND
 *                     message:
 *                       type: string
 *                       example: The student does not exist or is inactive.
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
 *                       example: Counselor with ID c5e4f2bf-af11-489a-99cf-0954c3f9f3f7 not found.
 *       '409':
 *         description: Conflict - duplicate or unavailable slot
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
 *                       example: Counselor already has a confirmed appointment during this time.
 *       "500":
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
router.post('/requests/', heronAuthMiddleware, asyncHandler(studentBookingController.requestAppointment.bind(studentBookingController)));
router.patch('/requests/:requestId/accept', heronAuthMiddleware, asyncHandler(studentBookingController.acceptAppointmentRequest.bind(studentBookingController)));
router.patch('/requests/:requestId/decline', heronAuthMiddleware, asyncHandler(studentBookingController.declineAppointmentRequest.bind(studentBookingController)));

/**
 * @openapi
 * /student/requests/:
 *   get:
 *     summary: Retrieve all appointment requests (student)
 *     description: |
 *       Allows an authenticated student to retrieve all their appointment requests.
 *       Optionally filters by status (pending, both_confirmed, declined, expired) if provided as a query parameter.
 *     tags:
 *       - Booking / Student
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
 *                         example: student
 *                       created_by:
 *                         type: string
 *                         example: student
 *                       student_response:
 *                         type: string
 *                         example: accepted
 *                       counselor_response:
 *                         type: string
 *                         example: pending
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
 *         description: Forbidden - student role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               forbidden:
 *                 value:
 *                   success: false
 *                   code: FORBIDDEN
 *                   message: Only students can view their appointment requests.
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
router.get('/requests/', heronAuthMiddleware, asyncHandler(studentBookingController.getAllAppointmentRequests.bind(studentBookingController)));
router.get('/requests/:requestId', heronAuthMiddleware, asyncHandler(studentBookingController.getAppointmentRequests.bind(studentBookingController)));


// Appointment routes
router.get('/appointments/:appointmentId', heronAuthMiddleware, asyncHandler(studentBookingController.getAppointment.bind(studentBookingController)));
router.get('/appointments', heronAuthMiddleware, asyncHandler(studentBookingController.getAllAppointments.bind(studentBookingController)));
router.delete('/appointments/:appointmentId', heronAuthMiddleware, asyncHandler(studentBookingController.cancelAppointment.bind(studentBookingController)));

// Availability routes
router.get('/availability/counselor/:counselorId', heronAuthMiddleware, asyncHandler(studentBookingController.getCounselorUnavailableSlots.bind(studentBookingController)));
router.get('/availability/department/:department', heronAuthMiddleware, asyncHandler(studentBookingController.getDepartmentAvailableSlots.bind(studentBookingController)));

export default router;