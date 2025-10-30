import { AppDataSource } from "../config/datasource.config.js";

/**
 * Repository for managing user badges.
 * 
 * @description Handles checking badge ownership and granting badges to users.
 * Uses raw SQL queries since we don't own the user_badges schema (owned by activities API).
 * 
 * @remarks
 * - user_badges table schema: (user_badge_id, user_id, badge_id, awarded_at)
 * - badges table schema: (badge_id, name, description, icon_url, event_trigger, threshold, condition_type, level)
 */
export class BadgesRepository {
  
  /**
   * Checks if a user already owns a specific badge.
   * Can check by badge_id or badge name.
   * Uses raw SQL since we don't own the user_badges schema.
   *
   * @param user_id - The unique identifier of the user.
   * @param badge_id - (Optional) The unique identifier of the badge to check.
   * @param badge_name - (Optional) The name of the badge to check.
   * @returns A promise that resolves to `true` if the user owns the badge, otherwise `false`.
   * 
   * @remarks
   * - At least one of badge_id or badge_name must be provided.
   * - If both are provided, badge_id takes precedence.
   * 
   * @example
   * ```typescript
   * const repo = new BadgesRepository();
   * 
   * // Check by badge ID
   * const hasBadge = await repo.hasUserBadge(userId, badgeId);
   * 
   * // Check by badge name
   * const hasBadge = await repo.hasUserBadge(userId, undefined, "First Journal Entry");
   * ```
   */
  async hasUserBadge(user_id: string, badge_id?: string, badge_name?: string): Promise<boolean> {
    if (!badge_id && !badge_name) {
      throw new Error("Either badge_id or badge_name must be provided");
    }

    // If badge_id is provided, check directly
    if (badge_id) {
      const result = await AppDataSource.query(
        `SELECT EXISTS(
          SELECT 1 
          FROM user_badges 
          WHERE user_id = $1 
          AND badge_id = $2
          LIMIT 1
        ) as "exists"`,
        [user_id, badge_id]
      );
      return result[0]?.exists ?? false;
    }

    // If only badge_name is provided, join with badges table
    const result = await AppDataSource.query(
      `SELECT EXISTS(
        SELECT 1 
        FROM user_badges ub
        INNER JOIN badges b ON ub.badge_id = b.badge_id
        WHERE ub.user_id = $1 
        AND b.name = $2
        LIMIT 1
      ) as "exists"`,
      [user_id, badge_name]
    );
    return result[0]?.exists ?? false;
  }

  /**
   * Grants a badge to a user by inserting a record into the user_badges table.
   *
   * @param user_id - The unique identifier of the user receiving the badge.
   * @param badge_id - The unique identifier of the badge to grant.
   * @returns A promise that resolves to the created user_badge record.
   * 
   * @remarks
   * - Generates a new UUID for user_badge_id.
   * - Sets awarded_at to current timestamp.
   * - Will throw an error if the badge doesn't exist (foreign key constraint).
   * - Will throw an error if trying to grant a duplicate badge (if unique constraint exists).
   * 
   * @example
   * ```typescript
   * const repo = new BadgesRepository();
   * const userBadge = await repo.grantBadge(userId, badgeId);
   * console.log(`Badge awarded at: ${userBadge.awarded_at}`);
   * ```
   */
  async grantBadge(user_id: string, badge_id: string): Promise<{
    user_badge_id: string;
    user_id: string;
    badge_id: string;
    awarded_at: Date;
  }> {
    const result = await AppDataSource.query(
      `INSERT INTO user_badges (user_badge_id, user_id, badge_id, awarded_at)
       VALUES (gen_random_uuid(), $1, $2, CURRENT_TIMESTAMP)
       RETURNING user_badge_id, user_id, badge_id, awarded_at`,
      [user_id, badge_id]
    );

    if (!result || result.length === 0) {
      throw new Error("Failed to grant badge");
    }

    return result[0];
  }

  /**
   * Grants a badge to a user by badge name (looks up badge_id first).
   * Uses raw SQL since we don't own the user_badges schema.
   *
   * @param user_id - The unique identifier of the user receiving the badge.
   * @param badge_name - The name of the badge to grant.
   * @returns A promise that resolves to the created user_badge record, or null if badge name not found.
   * 
   * @remarks
   * - First looks up the badge_id from the badges table by name.
   * - Then inserts into user_badges table.
   * - Returns null if no badge exists with the given name.
   * 
   * @example
   * ```typescript
   * const repo = new BadgesRepository();
   * const userBadge = await repo.grantBadgeByName(userId, "First Journal Entry");
   * if (userBadge) {
   *   console.log(`Badge ${badge_name} awarded!`);
   * }
   * ```
   */
  async grantBadgeByName(user_id: string, badge_name: string): Promise<{
    user_badge_id: string;
    user_id: string;
    badge_id: string;
    awarded_at: Date;
  } | null> {
    // First, get the badge_id from the badge name
    const badgeResult = await AppDataSource.query(
      `SELECT badge_id FROM badges WHERE name = $1 LIMIT 1`,
      [badge_name]
    );

    if (!badgeResult || badgeResult.length === 0) {
      return null; // Badge doesn't exist
    }

    const badge_id = badgeResult[0].badge_id;

    // Grant the badge using the badge_id
    return await this.grantBadge(user_id, badge_id);
  }

  /**
   * Gets all badges owned by a user.
   * Uses raw SQL since we don't own the user_badges schema.
   *
   * @param user_id - The unique identifier of the user.
   * @returns A promise that resolves to an array of user badges with badge details.
   * 
   * @example
   * ```typescript
   * const repo = new BadgesRepository();
   * const badges = await repo.getUserBadges(userId);
   * console.log(`User has ${badges.length} badges`);
   * ```
   */
  async getUserBadges(user_id: string): Promise<Array<{
    user_badge_id: string;
    badge_id: string;
    badge_name: string;
    description: string | null;
    icon_url: string | null;
    level: number;
    awarded_at: Date;
  }>> {
    const result = await AppDataSource.query(
      `SELECT 
        ub.user_badge_id,
        ub.badge_id,
        b.name as badge_name,
        b.description,
        b.icon_url,
        b.level,
        ub.awarded_at
       FROM user_badges ub
       INNER JOIN badges b ON ub.badge_id = b.badge_id
       WHERE ub.user_id = $1
       ORDER BY ub.awarded_at DESC`,
      [user_id]
    );

    return result;
  }

  /**
   * Gets a specific badge by its ID.
   * 
   * @param badge_id - The unique identifier of the badge.
   * @returns A promise that resolves to the badge details or null if not found.
   */
  async getBadgeById(badge_id: string): Promise<{
    badge_id: string;
    name: string;
    description: string | null;
    icon_url: string | null;
    event_trigger: string;
    threshold: number;
    condition_type: string;
    level: number;
  } | null> {
    const result = await AppDataSource.query(
      `SELECT badge_id, name, description, icon_url, event_trigger, threshold, condition_type, level
       FROM badges
       WHERE badge_id = $1
       LIMIT 1`,
      [badge_id]
    );

    return result.length > 0 ? result[0] : null;
  }

  /**
   * Gets a specific badge by its name.
   * 
   * @param badge_name - The name of the badge.
   * @returns A promise that resolves to the badge details or null if not found.
   */
  async getBadgeByName(badge_name: string): Promise<{
    badge_id: string;
    name: string;
    description: string | null;
    icon_url: string | null;
    event_trigger: string;
    threshold: number;
    condition_type: string;
    level: number;
  } | null> {
    const result = await AppDataSource.query(
      `SELECT badge_id, name, description, icon_url, event_trigger, threshold, condition_type, level
       FROM badges
       WHERE name = $1
       LIMIT 1`,
      [badge_name]
    );

    return result.length > 0 ? result[0] : null;
  }
}
