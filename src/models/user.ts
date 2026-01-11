import { query } from '../config/database.js';

export interface User {
  id: string;
  email: string;
  password_hash?: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_email_verified: boolean;
  failed_login_attempts?: number;
  locked_until?: Date | null;
  created_at: Date;
  updated_at?: Date;
}

export interface UserWithRolesAndPermissions extends Omit<User, 'password_hash'> {
  roles: string[];
  permissions: string[];
}

interface CreateUserParams {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
}

export const UserModel = {
  async create({ email, passwordHash, firstName, lastName }: CreateUserParams): Promise<User> {
    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, first_name, last_name, is_active, created_at`,
      [email, passwordHash, firstName, lastName]
    );
    return result.rows[0];
  },

  async findByEmail(email: string): Promise<User | undefined> {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  },

  async findById(id: string): Promise<User | undefined> {
    const result = await query(
      'SELECT id, email, first_name, last_name, is_active, is_email_verified, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async updateLoginAttempts(userId: string, attempts: number): Promise<void> {
    await query(
      'UPDATE users SET failed_login_attempts = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [attempts, userId]
    );
  },

  async lockAccount(userId: string, lockoutDuration: number): Promise<void> {
    const lockedUntil = new Date(Date.now() + lockoutDuration);
    await query(
      'UPDATE users SET locked_until = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [lockedUntil, userId]
    );
  },

  async unlockAccount(userId: string): Promise<void> {
    await query(
      'UPDATE users SET locked_until = NULL, failed_login_attempts = 0, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
  },

  async getUserWithRolesAndPermissions(
    userId: string
  ): Promise<UserWithRolesAndPermissions | undefined> {
    const result = await query(
      `SELECT 
        u.id, u.email, u.first_name, u.last_name, u.is_active,
        COALESCE(json_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '[]') as roles,
        COALESCE(json_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL), '[]') as permissions
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       LEFT JOIN role_permissions rp ON r.id = rp.role_id
       LEFT JOIN permissions p ON rp.permission_id = p.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [userId]
    );
    return result.rows[0];
  },

  async assignRole(userId: string, roleName: string): Promise<void> {
    const roleResult = await query('SELECT id FROM roles WHERE name = $1', [roleName]);
    if (roleResult.rows.length === 0) {
      throw new Error(`Role ${roleName} not found`);
    }

    await query(
      'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, roleResult.rows[0].id]
    );
  },
};
