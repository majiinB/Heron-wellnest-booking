import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { AppointmentRequest } from "./appointmentRequests.model.js";
import { join } from "path";

/**
 * @file appointments.model.ts
 * 
 * @description Appointment model for the Heron Wellnest Booking API.
 * 
 * @remarks
 * This entity maps to the `appointments` table in the database and stores information
 * about counseling appointments, meetings, routine interviews, and events between students and counselors.
 * 
 * @property appointment_id - The unique identifier for the appointment (UUID).
 * @property request_id - The unique identifier of the related request (UUID).
 * @property student_id - The unique identifier of the student (UUID).
 * @property counselor_id - The unique identifier of the counselor (UUID).
 * @property department - The department to which both the student and counselor belong.
 * @property agenda - The type of appointment (counseling, meeting, routine_interview, event).
 * @property start_time - The scheduled start time of the appointment (timestamptz).
 * @property end_time - The scheduled end time of the appointment (timestamptz).
 * @property google_event_id - The Google Calendar event identifier (optional).
 * @property status - The current status of the appointment (pending, both_confirmed, declined, expired).
 * @property cancelled_by - Who cancelled the appointment, if cancelled (student or counselor, optional).
 * @property cancelled_at - The timestamp when the appointment was cancelled (optional).
 * @property created_at - The timestamp when the appointment was created.
 * @property updated_at - The timestamp when the appointment was last updated.
 * 
 * @author Arthur M. Artugue
 * @created 2025-10-29
 * @updated 2025-10-29
 */

@Entity("appointments")
export class Appointment {
  @PrimaryGeneratedColumn("uuid")
  appointment_id!: string;

  @OneToOne(() => AppointmentRequest, { onDelete: "CASCADE" })
  @JoinColumn({ name: "request_id" })
  request!: AppointmentRequest;

  @Column({ type: "uuid" })
  student_id!: string;

  @Column({ type: "uuid" })
  counselor_id!: string;

  @Column({ type: "text" })
  department!: string;

  @Column({ type: "enum", enum: ["counseling", "meeting", "routine_interview", "event"] })
  agenda!: "counseling" | "meeting" | "routine_interview" | "event";

  @Column({ type: "timestamptz" })
  start_time!: Date;

  @Column({ type: "timestamptz" })
  end_time!: Date;

  @Column({ type: "text", nullable: true })
  google_event_id!: string | null;

  @Column({ type: "enum", enum: ["pending", "both_confirmed", "declined", "expired"] })
  status!: "pending" | "both_confirmed" | "declined" | "expired";

  @Column({ type: "enum", enum: ["student", "counselor"], nullable: true })
  cancelled_by!: "student" | "counselor" | null;

  @Column({ type: "timestamptz", nullable: true })
  cancelled_at!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
