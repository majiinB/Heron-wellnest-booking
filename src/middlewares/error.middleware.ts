import type { Request, Response, NextFunction } from "express";
import { AppError } from "../types/appError.type.js";
import { env } from "../config/env.config.js";
import { logger } from "../utils/logger.util.js";
import type { ApiResponse } from "../types/apiResponse.type.js";

/**
 * Error handling middleware for Express applications.
 *
 * @file error.middleware.ts
 * @description This middleware captures errors thrown in the application and formats
 * them into a consistent JSON response. It distinguishes between custom
 * application errors (AppError) and generic errors, providing appropriate
 * status codes and messages.
 *
 * @param err - The error object, which can be an instance of AppError or a generic Error.
 * @param _req - The Express request object.
 * @param res - The Express response object.
 * @param next - The next middleware function in the stack.
 *
 * @example
 * // Example usage in an Express app:
 * app.use(errorMiddleware);
 * 
 * @author Arthur M. Artugue
 * @created 2025-08-20
 * @updated 2025-09-25
 */
export function errorMiddleware(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isAppError = err instanceof AppError;
  const isOperational = isAppError && err.isOperational;

  // Logging
  if (isOperational) {
    logger.warn("Operational error", {
      message: err.message,
      code: isAppError ? err.code : undefined,
    });
  } else {
    logger.error("Unexpected error", {
      message: err.message,
      stack: env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }

  // Response fields
  const statusCode: number = isAppError ? err.statusCode : 500;
  const code: string = isAppError ? err.code : "INTERNAL_SERVER_ERROR";
  const message: string =
    isOperational && isAppError
      ? err.message
      : "Internal Server Error"; // hide real error if not operational

  const response: ApiResponse = {
    success: false,
    code,
    message,
    ...(env.NODE_ENV === "development" && {
      details: {
        stack: err.stack,
      },
    }),
  };

  res.status(statusCode).json(response);
}