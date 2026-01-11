import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';
import { AppError } from '../utils/errors.js';
import { AuditLogModel } from '../models/auditLog.js';

interface ErrorWithCode extends Error {
  code?: string;
  statusCode?: number;
}

export const errorHandler = async (
  err: ErrorWithCode,
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  let error: AppError | ErrorWithCode = { ...err };
  error.message = err.message;

  // Log error
  console.error(err);

  // PostgreSQL unique constraint error
  if (err.code === '23505') {
    error = new AppError('Duplicate field value', 400, 'DUPLICATE_FIELD');
  }

  // PostgreSQL foreign key constraint error
  if (err.code === '23503') {
    error = new AppError('Referenced resource not found', 400, 'INVALID_REFERENCE');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token expired', 401, 'TOKEN_EXPIRED');
  }

  // Audit log for errors
  if (req.user) {
    await AuditLogModel.create({
      userId: req.user.id || req.user.userId || null,
      action: 'error',
      resource: req.path,
      status: 'failed',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        message: error.message,
        code: error instanceof AppError ? error.code : err.code,
      },
    }).catch(console.error);
  }

  const statusCode = error instanceof AppError ? error.statusCode : error.statusCode || 500;
  const errorCode = error instanceof AppError ? error.code : err.code || 'INTERNAL_ERROR';

  res.status(statusCode).json({
    success: false,
    error: {
      message: error.message || 'Internal server error',
      code: errorCode,
      ...(config.nodeEnv === 'development' && { stack: err.stack }),
    },
  });
};

export const notFound = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404, 'NOT_FOUND'));
};
