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

router.post('/', heronAuthMiddleware, asyncHandler(studentBookingController.requestAppointment.bind(studentBookingController)));

export default router;