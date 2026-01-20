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
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import {corsOptions} from './config/cors.config.js'; 
import { loggerMiddleware } from './middlewares/logger.middleware.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import studentBookingRouter from './routes/studentBooking.route.js'
import counselorBookingRouter from './routes/counselorBooking.route.js';
import { env } from './config/env.config.js';
import fs from 'fs';

const app = express();
const isTS = fs.existsSync('./src/routes');

// --- Swagger options ---
const swaggerOptions = {
  definition: {
    openapi: '3.0.1',
    info: {
      title: 'Heron Wellnest Booking API',
      version: '1.0.0',
      description:"Heron Wellnest Booking API provides endpoints for managing and tracking booking activities within the app, including appointment requests, cancellations, and availability checks. This API enables secure creation, retrieval, and management of user booking data while supporting authentication and role-based access control.",
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}/api/v1/booking`, 
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [isTS? './src/routes/**/*.ts' : "./dist/routes/**/*.{js,ts}"], // 👈 path to your route files with @openapi JSDoc comments
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Middlewares
app.use(cors(corsOptions));
app.use(express.json()); 
app.use(loggerMiddleware); // Custom logger middleware
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
// This is a health check route
app.get('/api/v1/booking/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});
app.use('/api/v1/booking/student', studentBookingRouter);
app.use('/api/v1/booking/counselor', counselorBookingRouter);

app.use(errorMiddleware); // Custom error handling middleware

export default app;