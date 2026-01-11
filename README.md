# Authentication Service - API Documentation

## Overview

This is an enterprise authentication service that provides JWT-based authentication with Role-Based Access Control (RBAC) for multiple applications within your organization.

## Quick Start

### Prerequisites

- Node.js 20.6+
- PostgreSQL 12+
- Redis 6+

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

4. Create PostgreSQL database:

```bash
createdb auth_service
```

5. Run database migrations:

```bash
npm run db:setup
```

6. Start the server:

```bash
npm run dev
```

The service will be running at `http://localhost:8000`

## Architecture

### Token Flow

1. User authenticates with `/api/auth/login`
2. Receives access token (15min expiry) and refresh token (7 days)
3. Client apps include access token in Authorization header
4. Apps can verify tokens via `/api/verify` or decode JWT locally
5. When access token expires, use refresh token to get new access token

### RBAC System

- **Users** have one or more **Roles**
- **Roles** have one or more **Permissions**
- **Permissions** follow the pattern `resource:action` (e.g., `users:read`, `users:write`)

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/register

Register a new user.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

#### POST /api/auth/login

Authenticate user and receive tokens.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "roles": ["user"],
      "permissions": ["users:read"]
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "a1b2c3d4e5f6...",
    "expiresIn": "15m"
  }
}
```

#### POST /api/auth/refresh-token

Get a new access token using refresh token.

**Request:**

```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "15m"
  }
}
```

#### POST /api/auth/logout

Logout and invalidate tokens.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request:**

```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### GET /api/auth/me

Get current user profile.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["user", "manager"],
    "permissions": ["users:read", "users:write"],
    "isActive": true
  }
}
```

### Token Verification

#### POST /api/verify

Verify a JWT token (for other services to validate tokens).

**Request:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "user": {
      "id": 1,
      "email": "user@example.com",
      "roles": ["user"],
      "permissions": ["users:read"]
    },
    "expiresAt": "2026-01-10T15:30:00.000Z"
  }
}
```

### User Management

#### GET /api/users

Get all users (requires `users:read` permission).

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "is_active": true,
      "created_at": "2026-01-10T10:00:00.000Z"
    }
  ]
}
```

#### GET /api/users/:id

Get user by ID with roles and permissions.

#### POST /api/users/:id/roles

Assign role to user (requires `users:write` permission).

**Request:**

```json
{
  "roleName": "manager"
}
```

#### DELETE /api/users/:id/roles/:roleName

Remove role from user.

### Role Management

#### GET /api/roles

Get all roles (requires `roles:read` permission).

#### POST /api/roles

Create new role (requires `roles:write` permission).

**Request:**

```json
{
  "name": "manager",
  "description": "Manager role with elevated permissions"
}
```

#### GET /api/roles/:id

Get role with all permissions.

#### POST /api/roles/:id/permissions

Assign permission to role.

**Request:**

```json
{
  "permissionId": 5
}
```

#### DELETE /api/roles/:id/permissions/:permissionId

Remove permission from role.

### Permission Management

#### GET /api/permissions

Get all permissions (requires `permissions:read` permission).

#### POST /api/permissions

Create new permission (requires `permissions:write` permission).

**Request:**

```json
{
  "name": "invoices:approve",
  "resource": "invoices",
  "action": "approve",
  "description": "Approve invoices"
}
```

## Security Features

### Rate Limiting

- General API: 100 requests per 15 minutes per IP
- Login/Register: 5 requests per 15 minutes per IP

### Account Lockout

- After 5 failed login attempts, account is locked for 15 minutes

### Token Security

- Access tokens: 15 minute expiry
- Refresh tokens: 7 days expiry, stored as hashed values
- Token blacklist: Revoked tokens stored in Redis until expiry

### Password Security

- Minimum 8 characters required
- Passwords hashed with bcrypt (10 rounds)

### Audit Logging

All authentication and authorization events are logged with:

- User ID
- Action
- Status (success/failed)
- IP address
- User agent
- Timestamp

## Integration with Client Apps

### Option 1: Server-Side Token Verification (Recommended)

**Pros:**

- Real-time revocation checks
- No shared secrets needed in client apps

**Implementation:**

```javascript
// In your client application
async function verifyToken(token) {
  const response = await fetch('http://localhost:8000/api/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  const result = await response.json();
  return result.data;
}

// Express middleware example
async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const verification = await verifyToken(token);
    req.user = verification.user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

### Option 2: Local Token Verification (Faster)

**Pros:**

- No network calls
- Faster verification

**Cons:**

- Cannot detect revoked tokens
- Requires JWT secret in client app

**Implementation:**

```javascript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_ACCESS_SECRET;

function verifyTokenLocally(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}

// Express middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const decoded = verifyTokenLocally(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.user = decoded;
  next();
}
```

### Frontend Integration

#### React Example

```javascript
// auth.js
export const authService = {
  async login(email, password) {
    const response = await fetch('http://localhost:8000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.success) {
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
    }

    return data;
  },

  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');

    const response = await fetch('http://localhost:8000/api/auth/refresh-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();

    if (data.success) {
      localStorage.setItem('accessToken', data.data.accessToken);
    }

    return data;
  },

  getAccessToken() {
    return localStorage.getItem('accessToken');
  },

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};

// API client with automatic token refresh
export async function apiCall(url, options = {}) {
  const token = authService.getAccessToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  // If token expired, refresh and retry
  if (response.status === 401) {
    await authService.refreshToken();
    const newToken = authService.getAccessToken();

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${newToken}`,
      },
    });
  }

  return response;
}
```

### Permission Checking

```javascript
// Check if user has permission
function hasPermission(user, requiredPermission) {
  return user.permissions.includes(requiredPermission);
}

// React component example
function AdminPanel({ user }) {
  if (!hasPermission(user, 'users:write')) {
    return <div>Access denied</div>;
  }

  return <div>Admin content...</div>;
}
```

## Error Codes

| Code                  | Description                                 |
| --------------------- | ------------------------------------------- |
| `NO_TOKEN`            | Authorization token not provided            |
| `INVALID_TOKEN`       | Token is invalid or malformed               |
| `TOKEN_EXPIRED`       | Token has expired                           |
| `TOKEN_REVOKED`       | Token has been revoked/blacklisted          |
| `INVALID_CREDENTIALS` | Email or password is incorrect              |
| `ACCOUNT_LOCKED`      | Account locked due to failed login attempts |
| `ACCOUNT_DISABLED`    | Account has been disabled                   |
| `EMAIL_EXISTS`        | Email already registered                    |
| `WEAK_PASSWORD`       | Password doesn't meet requirements          |
| `FORBIDDEN`           | Insufficient permissions                    |
| `NOT_FOUND`           | Resource not found                          |
| `DUPLICATE_FIELD`     | Duplicate value for unique field            |

## Environment Variables

See `.env.example` for all configuration options.

Key variables:

- `JWT_ACCESS_SECRET`: Secret for access tokens (change in production!)
- `JWT_REFRESH_SECRET`: Secret for refresh tokens (change in production!)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: PostgreSQL config
- `REDIS_HOST`, `REDIS_PORT`: Redis config
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins

## Production Deployment

### Security Checklist

- [ ] Change `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to strong random values
- [ ] Set `NODE_ENV=production`
- [ ] Use HTTPS/TLS for all connections
- [ ] Configure proper CORS origins (remove wildcards)
- [ ] Set up database connection pooling
- [ ] Enable Redis persistence
- [ ] Set up monitoring and alerting
- [ ] Regular database backups
- [ ] Review and adjust rate limits
- [ ] Consider using RS256 (asymmetric) instead of HS256 for JWT

### Scaling Considerations

- **Horizontal Scaling**: Service is stateless (except Redis). Can run multiple instances behind load balancer.
- **Redis**: Use Redis Cluster or Sentinel for high availability.
- **Database**: Use connection pooling, read replicas for heavy read workloads.
- **CDN**: Consider CDN for static public key distribution.

## Monitoring

Check the `/health` endpoint:

```bash
curl http://localhost:8000/health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2026-01-10T14:30:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

## Default Roles and Permissions

### Roles

- **admin**: Full system access
- **user**: Basic user access
- **manager**: Manager level access

### Permissions

- `users:read` - View user information
- `users:write` - Create and update users
- `users:delete` - Delete users
- `roles:read` - View roles
- `roles:write` - Create and update roles
- `roles:delete` - Delete roles
- `permissions:read` - View permissions
- `permissions:write` - Create and update permissions

### Default Assignments

- **admin** role: All permissions
- **user** role: `users:read`
- New registrations: Automatically assigned **user** role

## Troubleshooting

### Database connection fails

- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database exists: `createdb auth_service`
- Run migrations: `npm run db:setup`

### Redis connection fails

- Verify Redis is running: `redis-cli ping`
- Check Redis configuration in `.env`

### Token verification fails

- Check JWT secrets match between auth service and client app
- Verify token hasn't expired
- Check if token is blacklisted (after logout)

### CORS errors

- Add client app origin to `ALLOWED_ORIGINS` in `.env`
- Restart server after changing `.env`

## Support

For issues and questions, please refer to the project repository.
