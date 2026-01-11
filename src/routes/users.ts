import express, { Request, Response } from 'express';
import { UserModel } from '@/models/user.js';
import { query } from '@/config/database.js';
import { authenticate, authorize } from '@/middleware/auth.js';
import { AppError, asyncHandler } from '@/utils/errors.js';

const router = express.Router();

// Get all users (requires users:read permission)
router.get(
  '/',
  authenticate,
  authorize('users:read'),
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await query(
      'SELECT id, email, first_name, last_name, is_active, is_email_verified, created_at FROM users ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      data: result.rows,
    });
  })
);

// Get user by ID with roles and permissions
router.get(
  '/:id',
  authenticate,
  authorize('users:read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const user = await UserModel.getUserWithRolesAndPermissions(id as string);

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        isActive: user.is_active,
        roles: user.roles,
        permissions: user.permissions,
      },
    });
  })
);

// Assign role to user
router.post(
  '/:id/roles',
  authenticate,
  authorize('users:write'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { roleName } = req.body;

    if (!roleName) {
      throw new AppError('Role name is required', 400, 'MISSING_FIELD');
    }

    await UserModel.assignRole(id as string, roleName);

    res.json({
      success: true,
      message: 'Role assigned to user successfully',
    });
  })
);

// Remove role from user
router.delete(
  '/:id/roles/:roleName',
  authenticate,
  authorize('users:write'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id, roleName } = req.params;

    const roleResult = await query('SELECT id FROM roles WHERE name = $1', [roleName]);
    if (roleResult.rows.length === 0) {
      throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
    }

    await query('DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2', [
      id,
      roleResult.rows[0].id,
    ]);

    res.json({
      success: true,
      message: 'Role removed from user successfully',
    });
  })
);

export default router;
