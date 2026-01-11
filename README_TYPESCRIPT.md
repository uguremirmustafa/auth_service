# Auth Service - TypeScript Project

## 📁 Project Structure

```
auth_service/
├── index.ts                    # Main application entry point
├── package.json                # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── schema.sql                 # Database schema
├── .env                       # Environment variables (not in git)
├── .gitignore
│
├── src/
│   ├── config/
│   │   ├── index.ts           # Configuration management
│   │   ├── database.ts        # PostgreSQL connection
│   │   └── redis.ts           # Redis connection
│   │
│   ├── middleware/
│   │   ├── auth.ts            # Authentication & authorization middleware
│   │   └── errorHandler.ts   # Global error handling
│   │
│   ├── models/
│   │   ├── user.ts            # User model with types
│   │   ├── refreshToken.ts    # Refresh token model
│   │   └── auditLog.ts        # Audit logging model
│   │
│   ├── routes/
│   │   ├── auth.ts            # Authentication endpoints
│   │   ├── verify.ts          # Token verification
│   │   ├── roles.ts           # Role management
│   │   ├── permissions.ts     # Permission management
│   │   └── users.ts           # User management
│   │
│   └── utils/
│       ├── auth.ts            # Auth helper functions
│       └── errors.ts          # Custom error classes
│
└── examples/
    └── client-integration.ts  # TypeScript client examples
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis
- TypeScript knowledge

### Installation

```bash
npm install
```

### Setup Database

```bash
npm run db:setup
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

## 📝 Available Scripts

| Script                 | Description                              |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | Start development server with hot-reload |
| `npm run build`        | Compile TypeScript to JavaScript         |
| `npm run typecheck`    | Check types without building             |
| `npm start`            | Run production server                    |
| `npm run lint`         | Run ESLint to check code quality         |
| `npm run lint:fix`     | Auto-fix ESLint issues                   |
| `npm run format`       | Format code with Prettier                |
| `npm run format:check` | Check code formatting                    |
| `npm run db:setup`     | Initialize database schema               |

## 🔧 Configuration

### Environment Variables (.env)

```env
# Server
PORT=8000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=auth_service
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Secrets
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Security
BCRYPT_ROUNDS=10
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900000

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

## 📚 API Documentation

### Authentication Endpoints

#### Register User

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Refresh Token

```http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

#### Logout

```http
POST /api/auth/logout
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

#### Get Current User

```http
GET /api/auth/me
Authorization: Bearer <access-token>
```

### User Management Endpoints

All require authentication and appropriate permissions.

#### List Users (requires: users:read)

```http
GET /api/users
Authorization: Bearer <access-token>
```

#### Get User by ID (requires: users:read)

```http
GET /api/users/:id
Authorization: Bearer <access-token>
```

#### Assign Role to User (requires: users:write)

```http
POST /api/users/:id/roles
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "roleName": "admin"
}
```

### Role Management (requires: roles:read/write)

- `GET /api/roles` - List all roles
- `POST /api/roles` - Create role
- `GET /api/roles/:id` - Get role details
- `POST /api/roles/:id/permissions` - Assign permission
- `DELETE /api/roles/:id/permissions/:permissionId` - Remove permission

### Permission Management (requires: permissions:read/write)

- `GET /api/permissions` - List all permissions
- `POST /api/permissions` - Create permission

### Token Verification

```http
POST /api/verify
Content-Type: application/json

{
  "token": "jwt-token-to-verify"
}
```

## 🔒 Security Features

- ✅ JWT-based authentication (access + refresh tokens)
- ✅ Password hashing with bcrypt
- ✅ Token blacklisting via Redis
- ✅ Rate limiting
- ✅ Account lockout after failed attempts
- ✅ Role-Based Access Control (RBAC)
- ✅ Permission-based authorization
- ✅ CORS protection
- ✅ Helmet security headers
- ✅ Audit logging
- ✅ SQL injection protection (parameterized queries)

## 🎯 TypeScript Features

### Type-Safe Models

```typescript
interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  roles: string[];
  permissions: string[];
}
```

### Type-Safe Middleware

```typescript
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  // Implementation
};
```

### Type-Safe Routes

```typescript
router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    // Fully typed request and response
  })
);
```

## 🧪 Testing

Run type checks:

```bash
npm run typecheck
```

## 📦 Build Output

TypeScript compiles to:

```
dist/
├── index.js
├── index.js.map
├── index.d.ts
└── src/
    ├── config/
    ├── middleware/
    ├── models/
    ├── routes/
    └── utils/
```

## 🤝 Contributing

1. Write TypeScript (not JavaScript)
2. Run `npm run typecheck` before committing
3. Follow existing code patterns
4. Add types for all functions and variables
5. Use interfaces for complex data structures

## 📄 License

ISC
