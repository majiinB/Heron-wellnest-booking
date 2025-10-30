import * as dotenv from "dotenv";
import * as z from "zod";

dotenv.config();

/**
 * Environment configuration for the API.
 *
 * This module defines the environment variables required for the application,
 * validates them using Zod, and exports them for use throughout the application.
 *
 * @file env.config.ts
 * @description Configuration for environment variables.
 * 
 * Usage:
 * - Imported in `app.ts` to access environment variables.
 * - Validates required variables and provides defaults where applicable.
 *
 * @author Arthur M. Artugue
 * @created 2025-08-17
 * @updated 2025-10-26
 */
export const envSchema = z.object({
  // Application environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(8080),
  
  // Database configuration
  DB_HOST : z.string().default("localhost"),
  DB_PORT : z.coerce.number().default(5432),
  DB_USER : z.string().min(1, "DB_USER is required").default("postgres"),
  DB_PASSWORD : z.string().optional().default(""),
  DB_NAME : z.string().min(1, "DB_NAME is required").default("heron_wellnest_db"),

  // Security
  JWT_SECRET: z.string().min(32).optional(), // for HS256
  JWT_PRIVATE_KEY: z.string().optional(), // for RS256
  JWT_PUBLIC_KEY: z.string().optional(),  // for RS256
  JWT_ISSUER: z.string().default("heron-wellnest-auth-api"),
  JWT_AUDIENCE: z.string().default("heron-wellnest-users"),
  JWT_ALGORITHM: z.enum(["HS256", "RS256"]).default("HS256"),
  // CORS_ORIGIN: z.string().url(),

  // Encryption
  CONTENT_ENCRYPTION_KEY: z.string().min(32, "CONTENT_ENCRYPTION_KEY must be at least 32 characters").default("default_content_encryption_key_1234"),
  CONTENT_ENCRYPTION_ALGORITHM: z.enum(["aes-256-gcm"]).default("aes-256-gcm"),
  CONTENT_ENCRYPTION_IV_LENGTH: z.coerce.number().default(16), // in bytes
  CONTENT_ENCRYPTION_KEY_LENGTH: z.coerce.number().default(32), // in bytes

  // Pub/Sub
  PUBSUB_JOURNAL_TOPIC: z.string().min(1, "PUBSUB_JOURNAL_TOPIC is required").default("journal-topic"),
  PUBSUB_ACTIVITY_TOPIC: z.string().min(1, "PUBSUB_ACTIVITY_TOPIC is required").default("activity-topic"),

  // Google Calendar - Department Calendar IDs
  CCIS_CALENDAR_ID: z.string().min(1, "CCIS calendar ID is required").default("ccis-calendar-id"),
  CLAS_CALENDAR_ID: z.string().optional(),
  CHK_CALENDAR_ID: z.string().optional(),
  CBFS_CALENDAR_ID: z.string().optional(),
  CITE_CALENDAR_ID: z.string().optional(),
  CGPP_CALENDAR_ID: z.string().optional(),
  CCSE_CALENDAR_ID: z.string().optional(),
  CET_CALENDAR_ID: z.string().optional(),
  CTHM_CALENDAR_ID: z.string().optional(),
}).superRefine((env, ctx) => {
  if (env.JWT_ALGORITHM === "HS256" && !env.JWT_SECRET) {
    ctx.addIssue({
      path: ["JWT_SECRET"],
      message: "JWT_SECRET is required when using HS256",
      code: z.ZodIssueCode.custom,
    });
  }

  if (env.JWT_ALGORITHM === "RS256") {
    if (!env.JWT_PRIVATE_KEY) {
      ctx.addIssue({
        path: ["JWT_PRIVATE_KEY_PATH"],
        message: "JWT_PRIVATE_KEY_PATH is required when using RS256",
        code: z.ZodIssueCode.custom,
      });
    }
    if (!env.JWT_PUBLIC_KEY) {
      ctx.addIssue({
        path: ["JWT_PUBLIC_KEY_PATH"],
        message: "JWT_PUBLIC_KEY_PATH is required when using RS256",
        code: z.ZodIssueCode.custom,
      });
    }
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

