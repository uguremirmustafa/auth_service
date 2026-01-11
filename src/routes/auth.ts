import express, { Request, Response } from 'express';
import { UserModel } from '../models/user.js';
import { RefreshTokenModel } from '../models/refreshToken.js';
import { AuditLogModel } from '../models/auditLog.js';
import { hashPassword, comparePassword, generateAccessToken } from '../utils/auth.js';
import { AppError, asyncHandler } from '../utils/errors.js';
import { authenticate } from '../middleware/auth.js';
import { config } from '../config/index.js';
import redis from '../config/redis.js';

const router = express.Router();

// Register new user
router.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'MISSING_FIELDS');
    }

    // Password validation
    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters', 400, 'WEAK_PASSWORD');
    }

    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      throw new AppError('Email already registered', 400, 'EMAIL_EXISTS');
    }

    const passwordHash = await hashPassword(password);
    const user = await UserModel.create({
      email,
      passwordHash,
      firstName,
      lastName,
    });

    // Assign default 'user' role
    await UserModel.assignRole(user.id, 'user').catch(() => {});

    await AuditLogModel.create({
      userId: user.id,
      action: 'register',
      resource: 'users',
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      },
    });
  })
);

// Login
router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'MISSING_FIELDS');
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw new AppError('Account is locked. Try again later', 423, 'ACCOUNT_LOCKED');
    }

    // Check if account is active
    if (!user.is_active) {
      throw new AppError('Account is disabled', 403, 'ACCOUNT_DISABLED');
    }

    // Verify password
    if (!user.password_hash) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      // Increment failed login attempts
      const newAttempts = (user.failed_login_attempts || 0) + 1;
      await UserModel.updateLoginAttempts(user.id, newAttempts);

      if (newAttempts >= config.security.maxLoginAttempts) {
        await UserModel.lockAccount(user.id, config.security.lockoutDuration);
        throw new AppError('Account locked due to too many failed attempts', 423, 'ACCOUNT_LOCKED');
      }

      await AuditLogModel.create({
        userId: user.id,
        action: 'login',
        resource: 'auth',
        status: 'failed',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { reason: 'Invalid password' },
      });

      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Reset failed login attempts
    if ((user.failed_login_attempts && user.failed_login_attempts > 0) || user.locked_until) {
      await UserModel.unlockAccount(user.id);
    }

    // Get user with roles and permissions
    const userWithPerms = await UserModel.getUserWithRolesAndPermissions(user.id);

    if (!userWithPerms) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: userWithPerms.id,
      email: userWithPerms.email,
      roles: userWithPerms.roles,
      permissions: userWithPerms.permissions,
    });

    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const refreshToken = await RefreshTokenModel.create(user.id, refreshTokenExpiry);

    await AuditLogModel.create({
      userId: user.id,
      action: 'login',
      resource: 'auth',
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      data: {
        user: {
          id: userWithPerms.id,
          email: userWithPerms.email,
          firstName: userWithPerms.first_name,
          lastName: userWithPerms.last_name,
          roles: userWithPerms.roles,
          permissions: userWithPerms.permissions,
        },
        accessToken,
        refreshToken,
        expiresIn: config.jwt.accessExpiry,
      },
    });
  })
);

// Refresh access token
router.post(
  '/refresh-token',
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400, 'MISSING_TOKEN');
    }

    const tokenData = await RefreshTokenModel.findByToken(refreshToken);
    if (!tokenData) {
      throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    if (!tokenData.is_active) {
      throw new AppError('User account is disabled', 403, 'ACCOUNT_DISABLED');
    }

    // Get user with roles and permissions
    const userWithPerms = await UserModel.getUserWithRolesAndPermissions(tokenData.user_id);

    if (!userWithPerms) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      userId: userWithPerms.id,
      email: userWithPerms.email,
      roles: userWithPerms.roles,
      permissions: userWithPerms.permissions,
    });

    res.json({
      success: true,
      data: {
        accessToken,
        expiresIn: config.jwt.accessExpiry,
      },
    });
  })
);

// Logout
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new AppError('No authorization header', 401, 'NO_AUTH_HEADER');
    }
    const token = authHeader.substring(7);
    const { refreshToken } = req.body;

    // Blacklist the access token
    const decoded = req.user;
    if (decoded?.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await redis.setex(`blacklist:${token}`, ttl, 'true');
      }
    }

    // Revoke refresh token if provided
    if (refreshToken) {
      await RefreshTokenModel.revoke(refreshToken);
    }

    await AuditLogModel.create({
      userId: req.user?.id || req.user?.userId || null,
      action: 'logout',
      resource: 'auth',
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  })
);

// Get current user profile
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      throw new AppError('User ID not found', 401, 'NO_USER_ID');
    }
    const user = await UserModel.getUserWithRolesAndPermissions(userId);

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
        roles: user.roles,
        permissions: user.permissions,
        isActive: user.is_active,
      },
    });
  })
);

export default router;
