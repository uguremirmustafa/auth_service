import express, { Request, Response } from 'express';
import { query } from '@/config/database.js';
import { authenticate, authorize } from '@/middleware/auth.js';
import { AppError, asyncHandler } from '@/utils/errors.js';

const router = express.Router();

// Get all roles (requires permissions:read permission)
router.get(
  '/',
  authenticate,
  authorize('roles:read'),
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await query('SELECT id, name, description, created_at FROM roles ORDER BY name');

    res.json({
      success: true,
      data: result.rows,
    });
  })
);

// Create new role (requires roles:write permission)
router.post(
  '/',
  authenticate,
  authorize('roles:write'),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, description } = req.body;

    if (!name) {
      throw new AppError('Role name is required', 400, 'MISSING_FIELD');
    }

    const result = await query(
      'INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  })
);

// Get role by ID with permissions
router.get(
  '/:id',
  authenticate,
  authorize('roles:read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await query(
      `SELECT r.id, r.name, r.description, r.created_at,
     COALESCE(json_agg(json_build_object('id', p.id, 'name', p.name, 'resource', p.resource, 'action', p.action)) FILTER (WHERE p.id IS NOT NULL), '[]') as permissions
     FROM roles r
     LEFT JOIN role_permissions rp ON r.id = rp.role_id
     LEFT JOIN permissions p ON rp.permission_id = p.id
     WHERE r.id = $1
     GROUP BY r.id`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  })
);

// Assign permission to role
router.post(
  '/:id/permissions',
  authenticate,
  authorize('roles:write'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { permissionId } = req.body;

    if (!permissionId) {
      throw new AppError('Permission ID is required', 400, 'MISSING_FIELD');
    }

    await query(
      'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [id, permissionId]
    );

    res.json({
      success: true,
      message: 'Permission assigned to role successfully',
    });
  })
);

// Remove permission from role
router.delete(
  '/:id/permissions/:permissionId',
  authenticate,
  authorize('roles:write'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id, permissionId } = req.params;

    await query('DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2', [
      id,
      permissionId,
    ]);

    res.json({
      success: true,
      message: 'Permission removed from role successfully',
    });
  })
);

export default router;
