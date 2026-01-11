import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { config } from '@/config/index.js';
import pool from '@/config/database.js';
import redis from '@/config/redis.js';
import { errorHandler, notFound } from '@/middleware/errorHandler.js';

// Import routes
import authRoutes from '@/routes/auth.js';
import verifyRoutes from '@/routes/verify.js';
import roleRoutes from '@/routes/roles.js';
import permissionRoutes from '@/routes/permissions.js';
import userRoutes from '@/routes/users.js';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      if (config.cors.allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: 'Too many login attempts, please try again later',
  skipSuccessfulRequests: true,
});

app.use('/api', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    const redisStatus = redis.status === 'ready' ? 'connected' : 'disconnected';

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: redisStatus,
      },
    });
  } catch {
    res.status(503).json({
      status: 'error',
      message: 'Service unavailable',
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', verifyRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

// Cleanup function for tests
export const closeConnections = async () => {
  await pool.end();
  redis.disconnect();
};

export { app };
