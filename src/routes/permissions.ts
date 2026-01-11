import express, { Request, Response } from 'express';
import { query } from '@/config/database.js';
import { authenticate, authorize } from '@/middleware/auth.js';
import { asyncHandler } from '@/utils/errors.js';

const router = express.Router();

// Get all permissions
router.get(
  '/',
  authenticate,
  authorize('permissions:read'),
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await query('SELECT * FROM permissions ORDER BY resource, action');

    res.json({
      success: true,
      data: result.rows,
    });
  })
);

// Create new permission
router.post(
  '/',
  authenticate,
  authorize('permissions:write'),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, resource, action, description } = req.body;

    const result = await query(
      'INSERT INTO permissions (name, resource, action, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, resource, action, description]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  })
);

export default router;
