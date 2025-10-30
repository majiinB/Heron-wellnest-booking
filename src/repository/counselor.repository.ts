import { AppDataSource } from "../config/datasource.config.js";

/**
 * Counselor details interface
 */
export interface CounselorDetails {
  user_id: string;
  email: string;
  department_id: string;
  department_name: string;
}

/**
 * Repository for managing counselor data.
 * 
 * @description Handles retrieving counselor information from the database,
 * including their department details.
 * 
 * @remarks
 * - Uses raw SQL queries since we don't own the counselor schema
 * - Joins with college_departments table
 * 
 * @file counselor.repository.ts
 * 
 * @author Arthur M. Artugue
 * @created 2025-10-30
 * @updated 2025-10-30
 */
export class CounselorRepository {
  
  /**
   * Retrieves counselor details by user ID including department information.
   * 
   * @param userId - The unique identifier of the counselor
   * @returns A promise that resolves to the counselor details or null if not found
   * 
   * @remarks
   * Joins with:
   * - counselor table (user_id, email, department_id, is_deleted)
   * - college_departments table (department_id, department_name)
   * 
   * @example
   * ```typescript
   * const repo = new CounselorRepository();
   * const counselor = await repo.getCounselorDetails(userId);
   * if (counselor) {
   *   console.log(`Counselor: ${counselor.email}`);
   *   console.log(`Department: ${counselor.department_name}`);
   * }
   * ```
   */
  async getCounselorDetails(userId: string): Promise<CounselorDetails | null> {
    const query = `
      SELECT 
        c.user_id,
        c.email,
        c.department_id,
        cd.department_name
      FROM counselor c
      INNER JOIN college_departments cd ON c.department_id = cd.department_id
      WHERE c.user_id = $1
        AND c.is_deleted = false
      LIMIT 1
    `;

    const result = await AppDataSource.query(query, [userId]);
    
    return result.length > 0 ? result[0] : null;
  }

  /**
   * Retrieves counselor details by email including department information.
   * 
   * @param email - The email of the counselor
   * @returns A promise that resolves to the counselor details or null if not found
   * 
   * @example
   * ```typescript
   * const repo = new CounselorRepository();
   * const counselor = await repo.getCounselorDetailsByEmail('counselor@example.com');
   * ```
   */
  async getCounselorDetailsByEmail(email: string): Promise<CounselorDetails | null> {
    const query = `
      SELECT 
        c.user_id,
        c.email,
        c.department_id,
        cd.department_name
      FROM counselor c
      INNER JOIN college_departments cd ON c.department_id = cd.department_id
      WHERE c.email = $1
        AND c.is_deleted = false
      LIMIT 1
    `;

    const result = await AppDataSource.query(query, [email]);
    
    return result.length > 0 ? result[0] : null;
  }

  /**
   * Retrieves all counselors in a specific department.
   * 
   * @param departmentId - The unique identifier of the department
   * @returns A promise that resolves to an array of counselor details
   * 
   * @example
   * ```typescript
   * const repo = new CounselorRepository();
   * const counselors = await repo.getCounselorsByDepartment(departmentId);
   * ```
   */
  async getCounselorsByDepartment(departmentId: string): Promise<CounselorDetails[]> {
    const query = `
      SELECT 
        c.user_id,
        c.email,
        c.department_id,
        cd.department_name
      FROM counselor c
      INNER JOIN college_departments cd ON c.department_id = cd.department_id
      WHERE c.department_id = $1
        AND c.is_deleted = false
      ORDER BY c.email ASC
    `;

    return await AppDataSource.query(query, [departmentId]);
  }

  /**
   * Retrieves all counselors in the same department as a student.
   * 
   * @param studentId - The unique identifier of the student
   * @returns A promise that resolves to an array of counselor details
   * 
   * @remarks
   * This is useful for showing a student which counselors they can book with.
   * 
   * @example
   * ```typescript
   * const repo = new CounselorRepository();
   * const counselors = await repo.getCounselorsForStudent(studentId);
   * ```
   */
  async getCounselorsForStudent(studentId: string): Promise<CounselorDetails[]> {
    const query = `
      SELECT 
        c.user_id,
        c.email,
        c.department_id,
        cd.department_name
      FROM counselor c
      INNER JOIN college_departments cd ON c.department_id = cd.department_id
      INNER JOIN (
        SELECT cp.college_department_id
        FROM student s
        INNER JOIN college_programs cp ON s.program_id = cp.program_id
        WHERE s.user_id = $1
          AND s.is_deleted = false
      ) student_dept ON c.department_id = student_dept.college_department_id
      WHERE c.is_deleted = false
      ORDER BY c.email ASC
    `;

    return await AppDataSource.query(query, [studentId]);
  }

  /**
   * Checks if a counselor exists and is active.
   * 
   * @param userId - The unique identifier of the counselor
   * @returns A promise that resolves to true if the counselor exists and is active, false otherwise
   * 
   * @example
   * ```typescript
   * const repo = new CounselorRepository();
   * const exists = await repo.counselorExists(userId);
   * if (!exists) {
   *   throw new Error('Counselor not found');
   * }
   * ```
   */
  async counselorExists(userId: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 
        FROM counselor 
        WHERE user_id = $1 
          AND is_deleted = false
        LIMIT 1
      ) as "exists"
    `;

    const result = await AppDataSource.query(query, [userId]);
    return result[0]?.exists ?? false;
  }

  /**
   * Checks if a student and counselor are in the same department.
   * 
   * @param studentId - The unique identifier of the student
   * @param counselorId - The unique identifier of the counselor
   * @returns A promise that resolves to true if they're in the same department, false otherwise
   * 
   * @remarks
   * Useful for validating appointment requests to ensure students only book
   * with counselors from their department.
   * 
   * @example
   * ```typescript
   * const repo = new CounselorRepository();
   * const sameDept = await repo.areInSameDepartment(studentId, counselorId);
   * if (!sameDept) {
   *   throw new Error('Cannot book with counselor from different department');
   * }
   * ```
   */
  async areInSameDepartment(studentId: string, counselorId: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1
        FROM counselor c
        INNER JOIN student s ON c.department_id = (
          SELECT cp.college_department_id
          FROM student s2
          INNER JOIN college_programs cp ON s2.program_id = cp.program_id
          WHERE s2.user_id = $1
        )
        WHERE c.user_id = $2
          AND s.user_id = $1
          AND c.is_deleted = false
          AND s.is_deleted = false
        LIMIT 1
      ) as "exists"
    `;

    const result = await AppDataSource.query(query, [studentId, counselorId]);
    return result[0]?.exists ?? false;
  }

  /**
   * Gets the count of counselors in a department.
   * 
   * @param departmentId - The unique identifier of the department
   * @returns A promise that resolves to the count of counselors
   * 
   * @example
   * ```typescript
   * const repo = new CounselorRepository();
   * const count = await repo.getCounselorCountByDepartment(departmentId);
   * console.log(`Department has ${count} counselors`);
   * ```
   */
  async getCounselorCountByDepartment(departmentId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM counselor
      WHERE department_id = $1
        AND is_deleted = false
    `;

    const result = await AppDataSource.query(query, [departmentId]);
    return parseInt(result[0]?.count ?? '0', 10);
  }
}
