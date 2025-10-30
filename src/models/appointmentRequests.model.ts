import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

/**
 * @file appointmentRequests.model.ts
 * 
 * @description Appointment request model for the Heron Wellnest Booking API.
 * 
 * @remarks
 * This entity maps to the `appointment_requests` table in the database and stores information
 * about appointment requests between students and counselors, including proposed times and responses.
 * 
 * @property request_id - The unique identifier for the appointment request (UUID).
 * @property student_id - The unique identifier of the student (UUID).
 * @property counselor_id - The unique identifier of the counselor (UUID).
 * @property department - The department to which both the student and counselor belong.
 * @property agenda - The type of appointment (counseling, meeting, routine_interview, event).
 * @property proposed_start - The proposed start time of the appointment (timestamptz).
 * @property proposed_end - The proposed end time of the appointment (timestamptz).
 * @property proposed_by - Who proposed the appointment time (student or counselor).
 * @property created_by - Who created the appointment request (student or counselor).
 * @property student_response - The student's response to the request (pending, accepted, declined).
 * @property counselor_response - The counselor's response to the request (pending, accepted, declined).
 * @property status - The overall status of the request (pending, both_confirmed, declined, expired).
 * @property finalized_at - The timestamp when the request was finalized (optional).
 * @property created_at - The timestamp when the request was created.
 * @property updated_at - The timestamp when the request was last updated.
 * 
 * @author Arthur M. Artugue
 * @created 2025-10-29
 * @updated 2025-10-29
 */

@Entity("appointment_requests")
export class AppointmentRequest {
  @PrimaryGeneratedColumn("uuid")
  request_id!: string;

  @Column({ type: "uuid" })
  student_id!: string;

  @Column({ type: "uuid" })
  counselor_id!: string;

  @Column({ type: "text" })
  department!: string;

  @Column({ type: "enum", enum: ["counseling", "meeting", "routine_interview", "event"] })
  agenda!: "counseling" | "meeting" | "routine_interview" | "event";

  @Column({ type: "timestamptz" })
  proposed_start!: Date;

  @Column({ type: "timestamptz" })
  proposed_end!: Date;

  @Column({ type: "enum", enum: ["student", "counselor"] })
  proposed_by!: "student" | "counselor";

  @Column({ type: "enum", enum: ["student", "counselor"] })
  created_by!: "student" | "counselor";

  @Column({ type: "enum", enum: ["pending", "accepted", "declined"] })
  student_response!: "pending" | "accepted" | "declined";

  @Column({ type: "enum", enum: ["pending", "accepted", "declined"] })
  counselor_response!: "pending" | "accepted" | "declined";

  @Column({ type: "enum", enum: ["pending", "both_confirmed", "declined", "expired"] })
  status!: "pending" | "both_confirmed" | "declined" | "expired";

  @Column({ type: "timestamptz", nullable: true })
  finalized_at!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
