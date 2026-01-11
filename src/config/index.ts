interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

interface JWTConfig {
  accessSecret: string;
  refreshSecret: string;
  accessExpiry: string;
  refreshExpiry: string;
}

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

interface CorsConfig {
  allowedOrigins: string[];
}

interface SecurityConfig {
  bcryptRounds: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
}

interface Config {
  port: number;
  nodeEnv: string;
  db: DatabaseConfig;
  jwt: JWTConfig;
  redis: RedisConfig;
  cors: CorsConfig;
  security: SecurityConfig;
}

/**
 * Validates that required environment variables are set
 * Throws an error if any required variable is missing
 */
function validateEnvironment(): void {
  const required = [
    'NODE_ENV',
    'PORT',
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'JWT_ACCESS_EXPIRY',
    'JWT_REFRESH_EXPIRY',
    'REDIS_HOST',
    'REDIS_PORT',
    'BCRYPT_ROUNDS',
    'MAX_LOGIN_ATTEMPTS',
    'LOCKOUT_DURATION',
    'ALLOWED_ORIGINS',
  ];

  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  // Check for empty JWT secrets in production
  if (process.env.NODE_ENV === 'production') {
    if (
      process.env.JWT_ACCESS_SECRET ===
        'change-this-secret-in-production-use-strong-random-value' ||
      process.env.JWT_REFRESH_SECRET ===
        'change-this-refresh-secret-in-production-use-strong-random-value'
    ) {
      missing.push('JWT_ACCESS_SECRET or JWT_REFRESH_SECRET (still using default values)');
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((key) => `  - ${key}`).join('\n')}\n\nPlease check your .env file and ensure all required variables are set.`
    );
  }
}

// Run validation on module load
validateEnvironment();

export const config: Config = {
  port: parseInt(process.env.PORT || '8000'),
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'auth_service',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || '',
    refreshSecret: process.env.JWT_REFRESH_SECRET || '',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10'),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900000'), // 15 minutes
  },
};
