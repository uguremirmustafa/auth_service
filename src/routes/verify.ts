import express, { Request, Response } from 'express';
import { verifyAccessToken } from '@/utils/auth.js';
import { AppError, asyncHandler } from '@/utils/errors.js';
import redis from '@/config/redis.js';

const router = express.Router();

// Verify token endpoint for other services
router.post(
  '/verify',
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;

    if (!token) {
      throw new AppError('Token is required', 400, 'MISSING_TOKEN');
    }

    // Check if token is blacklisted
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      throw new AppError('Token has been revoked', 401, 'TOKEN_REVOKED');
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      throw new AppError('Invalid or expired token', 401, 'INVALID_TOKEN');
    }

    res.json({
      success: true,
      data: {
        valid: true,
        user: {
          id: decoded.id,
          email: decoded.email,
          roles: decoded.roles,
          permissions: decoded.permissions,
        },
        expiresAt: decoded.exp
          ? new Date(decoded.exp * 1000).toISOString()
          : new Date().toISOString(),
      },
    });
  })
);

// Public key endpoint for JWT verification (JWKS format)
// This allows other services to verify tokens locally without calling the auth service
router.get('/.well-known/jwks.json', (_req: Request, res: Response) => {
  // For now, we're using symmetric keys (HS256)
  // In production, you should use asymmetric keys (RS256) and expose the public key here
  res.json({
    keys: [],
    message: 'This endpoint will contain public keys when using RS256 signing',
    note: 'Currently using HS256. Other services should use the /verify endpoint',
  });
});

export default router;
