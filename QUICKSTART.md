# Auth Service - Quick Start Guide

## 🚀 What's Built

A production-ready authentication service with:

- JWT-based authentication (access + refresh tokens)
- Role-Based Access Control (RBAC)
- User registration and login
- Token verification for other services
- Password hashing with bcrypt
- Account lockout after failed attempts
- Rate limiting
- Audit logging
- Redis-based token blacklist
- CORS protection

## 📦 Project Structure

```
auth_service/
├── src/
│   ├── config/          # Database, Redis, and app configuration
│   │   ├── index.js     # Main config
│   │   ├── database.js  # PostgreSQL connection
│   │   └── redis.js     # Redis connection
│   ├── middleware/      # Express middleware
│   │   ├── auth.js      # Authentication & authorization
│   │   └── errorHandler.js  # Error handling
│   ├── models/          # Database models
│   │   ├── user.js      # User operations
│   │   ├── refreshToken.js  # Refresh token management
│   │   └── auditLog.js  # Audit logging
│   ├── routes/          # API routes
│   │   ├── auth.js      # Authentication endpoints
│   │   ├── verify.js    # Token verification
│   │   ├── users.js     # User management
│   │   ├── roles.js     # Role management
│   │   └── permissions.js   # Permission management
│   └── utils/           # Utility functions
│       ├── auth.js      # JWT & password utilities
│       └── errors.js    # Error classes
├── examples/            # Integration examples
│   └── client-integration.js  # Frontend & backend examples
├── index.js            # Main server file
├── schema.sql          # Database schema
├── .env                # Environment variables
├── .env.example        # Environment template
├── package.json        # Dependencies
├── README.md           # Full API documentation
├── SETUP.md            # Detailed setup guide
└── index.http          # HTTP test requests
```

## ⚡ Quick Start (3 Steps)

### 1. Create Database & Start Services

```bash
# Create PostgreSQL database
createdb -U postgres auth_service

# Run database migrations
npm run db:setup

# Start Redis (in another terminal)
redis-server

# Start the auth service
npm run dev
```

### 2. Test the Service

```bash
# Check health
curl http://localhost:8000/health

# Register a user
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","firstName":"Test","lastName":"User"}'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

### 3. Integrate with Your Apps

See `examples/client-integration.js` for complete examples.

**Quick Backend Integration:**

```javascript
// Verify tokens from other services
async function verifyToken(token) {
  const response = await fetch('http://localhost:8000/api/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return response.json();
}
```

**Quick Frontend Integration:**

```javascript
// Login
const response = await fetch('http://localhost:8000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

const { accessToken, refreshToken } = (await response.json()).data;

// Use token in requests
fetch('http://your-api.com/api/data', {
  headers: { Authorization: `Bearer ${accessToken}` },
});
```

## 🔐 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get tokens
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - Logout and revoke tokens
- `GET /api/auth/me` - Get current user profile

### Token Verification

- `POST /api/verify` - Verify JWT token (for other services)

### User Management (requires permissions)

- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users/:id/roles` - Assign role to user
- `DELETE /api/users/:id/roles/:roleName` - Remove role

### Role Management (requires permissions)

- `GET /api/roles` - List all roles
- `POST /api/roles` - Create role
- `GET /api/roles/:id` - Get role with permissions
- `POST /api/roles/:id/permissions` - Assign permission
- `DELETE /api/roles/:id/permissions/:permissionId` - Remove permission

### Permission Management (requires permissions)

- `GET /api/permissions` - List all permissions
- `POST /api/permissions` - Create permission

## 🎯 Default Setup

### Roles Created

- **admin** - Full system access
- **user** - Basic user access
- **manager** - Manager level access

### Permissions Created

- `users:read`, `users:write`, `users:delete`
- `roles:read`, `roles:write`, `roles:delete`
- `permissions:read`, `permissions:write`

### Assignments

- New registrations get **user** role automatically
- **admin** role has all permissions
- **user** role has `users:read` permission

## 🔧 Configuration

Key settings in `.env`:

```env
# Server
PORT=8000

# Database (PostgreSQL)
DB_HOST=localhost
DB_NAME=auth_service
DB_USER=postgres
DB_PASSWORD=postgres

# JWT (CHANGE IN PRODUCTION!)
JWT_ACCESS_SECRET=dev-access-secret-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# CORS (add your frontend URLs)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Security
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900000  # 15 minutes in ms
```

## 🛡️ Security Features

1. **Rate Limiting**
   - 100 requests/15min for general API
   - 5 requests/15min for login/register

2. **Account Lockout**
   - Locks account after 5 failed login attempts
   - 15-minute lockout duration

3. **Token Security**
   - Access tokens expire in 15 minutes
   - Refresh tokens expire in 7 days
   - Tokens can be revoked via logout
   - Blacklist stored in Redis

4. **Password Security**
   - Minimum 8 characters required
   - Bcrypt hashing (10 rounds)

5. **Audit Logging**
   - All auth events logged with IP and user agent
   - Failed login attempts tracked

## 📚 Documentation

- **README.md** - Complete API documentation with all endpoints
- **SETUP.md** - Detailed setup guide with troubleshooting
- **examples/client-integration.js** - Code examples for integration
- **index.http** - Test requests (use with REST Client in VS Code)

## 🚀 Next Steps

1. **Assign Admin Role to First User:**

   ```bash
   # After creating your first user, assign admin role
   curl -X POST http://localhost:8000/api/users/1/roles \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"roleName":"admin"}'
   ```

2. **Create Custom Roles & Permissions:**

   ```bash
   # Create a permission
   curl -X POST http://localhost:8000/api/permissions \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"name":"posts:publish","resource":"posts","action":"publish"}'

   # Create a role
   curl -X POST http://localhost:8000/api/roles \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"name":"editor","description":"Content editor"}'
   ```

3. **Integrate with Your Apps:**
   - See `examples/client-integration.js`
   - Add your app URLs to CORS in `.env`
   - Use `/api/verify` endpoint to validate tokens

4. **Production Deployment:**
   - Generate strong JWT secrets
   - Set `NODE_ENV=production`
   - Use HTTPS
   - Configure proper CORS
   - Set up monitoring

## 🧪 Testing

Use `index.http` file in VS Code with REST Client extension, or use curl:

```bash
# Health check
curl http://localhost:8000/health

# Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass123!","firstName":"John","lastName":"Doe"}'

# Login (save the tokens!)
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass123!"}'

# Get profile
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## ⚠️ Important Notes

1. **Change JWT Secrets in Production!**
   - Generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
   - Update in `.env` and never commit to git

2. **Database Must Be Created First**
   - Run `createdb auth_service` before `npm run db:setup`

3. **Redis Must Be Running**
   - Start with `redis-server`
   - Required for token blacklist

4. **CORS Configuration**
   - Add your frontend URLs to `ALLOWED_ORIGINS` in `.env`
   - Restart server after changes

## 🆘 Troubleshooting

**"Connection refused" errors:**

- Ensure PostgreSQL and Redis are running
- Check credentials in `.env`

**"Module not found" errors:**

- Run `npm install`
- Verify Node.js version 20.6+

**CORS errors:**

- Add your URL to `ALLOWED_ORIGINS` in `.env`
- Restart the server

For more help, see **SETUP.md** troubleshooting section.

## 📞 Support

- Full API docs: See `README.md`
- Setup help: See `SETUP.md`
- Code examples: See `examples/client-integration.js`
- Test requests: Use `index.http` in VS Code
