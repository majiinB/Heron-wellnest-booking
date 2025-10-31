/**
 * Heron Wellnest Booking API
 *
 * @file app.ts
 * @description Sets up and configures the Express application instance for the
 * Heron Wellnest Booking API. This file defines middleware, routes,
 * and application-level settings. It does not start the server directly—`index.ts`
 * handles bootstrapping and listening on the port.
 *
 * Routes:
 * - GET /health: A simple health check endpoint that returns a status of 'ok'.
 *
 * Middleware:
 * - express.json(): Parses incoming request bodies in JSON format.
 * - CORS policy: Applies Cross-Origin Resource Sharing rules for valid sources.
 *
 * Usage:
 * - Imported by `index.ts` to start the server.
 *
 * @author Arthur M. Artugue
 * @created 2025-08-16
 * @updated 2025-10-29
 */

import express from 'express';
import cors from 'cors';
import {corsOptions} from './config/cors.config.js'; 
import { loggerMiddleware } from './middlewares/logger.middleware.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import studentBookingRouter from './routes/studentBooking.route.js'
import counselorBookingRouter from './routes/counselorBooking.route.js';


const app : express.Express = express();

// Middlewares
app.use(cors(corsOptions));
app.use(express.json()); 
app.use(loggerMiddleware); // Custom logger middleware

// Routes
// This is a health check route
app.get('/api/v1/student/booking/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});
app.use('/api/v1/student/booking', studentBookingRouter);
app.use('/api/v1/counselor/booking', counselorBookingRouter);

app.use(errorMiddleware); // Custom error handling middleware

export default app;