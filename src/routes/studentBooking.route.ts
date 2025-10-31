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

// Appointment Request routes

router.post('/requests/', heronAuthMiddleware, asyncHandler(studentBookingController.requestAppointment.bind(studentBookingController)));
router.patch('/requests/:requestId/accept', heronAuthMiddleware, asyncHandler(studentBookingController.acceptAppointmentRequest.bind(studentBookingController)));
router.patch('/requests/:requestId/decline', heronAuthMiddleware, asyncHandler(studentBookingController.declineAppointmentRequest.bind(studentBookingController)));
router.get('/requests', heronAuthMiddleware, asyncHandler(studentBookingController.getAllAppointmentRequests.bind(studentBookingController)));
router.get('/requests/:requestId', heronAuthMiddleware, asyncHandler(studentBookingController.getAppointmentRequests.bind(studentBookingController)));


// Appointment routes
router.get('/appointments/:appointmentId', heronAuthMiddleware, asyncHandler(studentBookingController.getAppointment.bind(studentBookingController)));
router.get('/appointments', heronAuthMiddleware, asyncHandler(studentBookingController.getAllAppointments.bind(studentBookingController)));
router.delete('/appointments/:appointmentId', heronAuthMiddleware, asyncHandler(studentBookingController.cancelAppointment.bind(studentBookingController)));

// Availability routes
router.get('/availability/counselor/:counselorId', heronAuthMiddleware, asyncHandler(studentBookingController.getCounselorUnavailableSlots.bind(studentBookingController)));
router.get('/availability/department/:department', heronAuthMiddleware, asyncHandler(studentBookingController.getDepartmentAvailableSlots.bind(studentBookingController)));

export default router;