import { AppDataSource } from "../config/datasource.config.js";

/**
 * Student details interface
 */
export interface StudentDetails {
  user_id: string;
  email: string;
  program_id: string;
  program_name: string;
  department_id: string;
  department_name: string;
}

/**
 * Repository for managing student data.
 * 
 * @description Handles retrieving student information from the database,
 * including their department and program details.
 * 
 * @remarks
 * - Uses raw SQL queries since we don't own the student schema
 * - Joins with college_programs and college_departments tables
 * 
 * @file student.repository.ts
 * 
 * @author Arthur M. Artugue
 * @created 2025-10-30
 * @updated 2025-10-30
 */
export class StudentRepository {
  
  /**
   * Retrieves student details by user ID including department and program information.
   * 
   * @param userId - The unique identifier of the student
   * @returns A promise that resolves to the student details or null if not found
   * 
   * @remarks
   * Joins with:
   * - student table (user_id, email, program_id, is_deleted)
   * - college_programs table (program_id, program_name, college_department_id)
   * - college_departments table (department_id, department_name)
   * 
   * @example
   * ```typescript
   * const repo = new StudentRepository();
   * const student = await repo.getStudentDetails(userId);
   * if (student) {
   *   console.log(`Student: ${student.email}`);
   *   console.log(`Department: ${student.department_name}`);
   *   console.log(`Program: ${student.program_name}`);
   * }
   * ```
   */
  async getStudentDetails(userId: string): Promise<StudentDetails | null> {
    const query = `
      SELECT 
        s.user_id,
        s.email,
        s.program_id,
        cp.program_name,
        cd.department_id,
        cd.department_name
      FROM student s
      INNER JOIN college_programs cp ON s.program_id = cp.program_id
      INNER JOIN college_departments cd ON cp.college_department_id = cd.department_id
      WHERE s.user_id = $1
        AND s.is_deleted = false
      LIMIT 1
    `;

    const result = await AppDataSource.query(query, [userId]);
    
    return result.length > 0 ? result[0] : null;
  }

  /**
   * Retrieves student details by email including department and program information.
   * 
   * @param email - The email of the student
   * @returns A promise that resolves to the student details or null if not found
   * 
   * @example
   * ```typescript
   * const repo = new StudentRepository();
   * const student = await repo.getStudentDetailsByEmail('student@example.com');
   * ```
   */
  async getStudentDetailsByEmail(email: string): Promise<StudentDetails | null> {
    const query = `
      SELECT 
        s.user_id,
        s.email,
        s.program_id,
        cp.program_name,
        cd.department_id,
        cd.department_name
      FROM student s
      INNER JOIN college_programs cp ON s.program_id = cp.program_id
      INNER JOIN college_departments cd ON cp.college_department_id = cd.department_id
      WHERE s.email = $1
        AND s.is_deleted = false
      LIMIT 1
    `;

    const result = await AppDataSource.query(query, [email]);
    
    return result.length > 0 ? result[0] : null;
  }

  /**
   * Retrieves multiple students by their user IDs with department and program details.
   * 
   * @param userIds - An array of user IDs
   * @returns A promise that resolves to an array of student details
   * 
   * @example
   * ```typescript
   * const repo = new StudentRepository();
   * const students = await repo.getStudentDetailsByIds([userId1, userId2, userId3]);
   * ```
   */
  async getStudentDetailsByIds(userIds: string[]): Promise<StudentDetails[]> {
    if (userIds.length === 0) {
      return [];
    }

    const placeholders = userIds.map((_, index) => `$${index + 1}`).join(', ');
    
    const query = `
      SELECT 
        s.user_id,
        s.email,
        s.program_id,
        cp.program_name,
        cd.department_id,
        cd.department_name
      FROM student s
      INNER JOIN college_programs cp ON s.program_id = cp.program_id
      INNER JOIN college_departments cd ON cp.college_department_id = cd.department_id
      WHERE s.user_id IN (${placeholders})
        AND s.is_deleted = false
      ORDER BY s.email ASC
    `;

    return await AppDataSource.query(query, userIds);
  }

  /**
   * Retrieves all students in a specific department.
   * 
   * @param departmentId - The unique identifier of the department
   * @param limit - Maximum number of students to retrieve (default: 50)
   * @param offset - Number of students to skip (default: 0)
   * @returns A promise that resolves to an array of student details
   * 
   * @example
   * ```typescript
   * const repo = new StudentRepository();
   * const students = await repo.getStudentsByDepartment(departmentId, 20, 0);
   * ```
   */
  async getStudentsByDepartment(
    departmentId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<StudentDetails[]> {
    const query = `
      SELECT 
        s.user_id,
        s.email,
        s.program_id,
        cp.program_name,
        cd.department_id,
        cd.department_name
      FROM student s
      INNER JOIN college_programs cp ON s.program_id = cp.program_id
      INNER JOIN college_departments cd ON cp.college_department_id = cd.department_id
      WHERE cd.department_id = $1
        AND s.is_deleted = false
      ORDER BY s.email ASC
      LIMIT $2 OFFSET $3
    `;

    return await AppDataSource.query(query, [departmentId, limit, offset]);
  }

  /**
   * Retrieves all students in a specific program.
   * 
   * @param programId - The unique identifier of the program
   * @param limit - Maximum number of students to retrieve (default: 50)
   * @param offset - Number of students to skip (default: 0)
   * @returns A promise that resolves to an array of student details
   * 
   * @example
   * ```typescript
   * const repo = new StudentRepository();
   * const students = await repo.getStudentsByProgram(programId);
   * ```
   */
  async getStudentsByProgram(
    programId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<StudentDetails[]> {
    const query = `
      SELECT 
        s.user_id,
        s.email,
        s.program_id,
        cp.program_name,
        cd.department_id,
        cd.department_name
      FROM student s
      INNER JOIN college_programs cp ON s.program_id = cp.program_id
      INNER JOIN college_departments cd ON cp.college_department_id = cd.department_id
      WHERE s.program_id = $1
        AND s.is_deleted = false
      ORDER BY s.email ASC
      LIMIT $2 OFFSET $3
    `;

    return await AppDataSource.query(query, [programId, limit, offset]);
  }

  /**
   * Checks if a student exists and is active.
   * 
   * @param userId - The unique identifier of the student
   * @returns A promise that resolves to true if the student exists and is active, false otherwise
   * 
   * @example
   * ```typescript
   * const repo = new StudentRepository();
   * const exists = await repo.studentExists(userId);
   * if (!exists) {
   *   throw new Error('Student not found');
   * }
   * ```
   */
  async studentExists(userId: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 
        FROM student 
        WHERE user_id = $1 
          AND is_deleted = false
        LIMIT 1
      ) as "exists"
    `;

    const result = await AppDataSource.query(query, [userId]);
    return result[0]?.exists ?? false;
  }

  /**
   * Gets the count of students in a department.
   * 
   * @param departmentId - The unique identifier of the department
   * @returns A promise that resolves to the count of students
   * 
   * @example
   * ```typescript
   * const repo = new StudentRepository();
   * const count = await repo.getStudentCountByDepartment(departmentId);
   * console.log(`Department has ${count} students`);
   * ```
   */
  async getStudentCountByDepartment(departmentId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM student s
      INNER JOIN college_programs cp ON s.program_id = cp.program_id
      INNER JOIN college_departments cd ON cp.college_department_id = cd.department_id
      WHERE cd.department_id = $1
        AND s.is_deleted = false
    `;

    const result = await AppDataSource.query(query, [departmentId]);
    return parseInt(result[0]?.count ?? '0', 10);
  }
}
