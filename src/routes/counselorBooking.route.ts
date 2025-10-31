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
router.post('/requests/', heronAuthMiddleware, asyncHandler(counselorBookingController.requestAppointment.bind(counselorBookingController)));
router.patch('/requests/:requestId/accept', heronAuthMiddleware, asyncHandler(counselorBookingController.acceptAppointmentRequest.bind(counselorBookingController)));
router.patch('/requests/:requestId/decline', heronAuthMiddleware, asyncHandler(counselorBookingController.declineAppointmentRequest.bind(counselorBookingController)));
router.get('/requests', heronAuthMiddleware, asyncHandler(counselorBookingController.getAllAppointmentRequests.bind(counselorBookingController)));
router.get('/requests/:requestId', heronAuthMiddleware, asyncHandler(counselorBookingController.getAppointmentRequests.bind(counselorBookingController)));

// Appointment routes
router.get('/appointments/:appointmentId', heronAuthMiddleware, asyncHandler(counselorBookingController.getAppointment.bind(counselorBookingController)));
router.get('/appointments', heronAuthMiddleware, asyncHandler(counselorBookingController.getAllAppointments.bind(counselorBookingController)));
router.delete('/appointments/:appointmentId', heronAuthMiddleware, asyncHandler(counselorBookingController.cancelAppointment.bind(counselorBookingController)));

// Availability routes
router.get('/availability/counselor/:counselorId', heronAuthMiddleware, asyncHandler(counselorBookingController.getCounselorUnavailableSlots.bind(counselorBookingController)));
router.get('/availability/department/:department', heronAuthMiddleware, asyncHandler(counselorBookingController.getDepartmentAvailableSlots.bind(counselorBookingController)));

export default router;
