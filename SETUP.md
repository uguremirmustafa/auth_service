# Setup Guide

## Prerequisites

Before starting, ensure you have the following installed:

1. **Node.js** (version 20.6 or higher)
   - Check version: `node --version`
   - Download: https://nodejs.org/

2. **PostgreSQL** (version 12 or higher)
   - Check version: `psql --version`
   - Download: https://www.postgresql.org/download/

3. **Redis** (version 6 or higher)
   - Check version: `redis-cli --version`
   - Download: https://redis.io/download

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

The `.env` file is already created with default development settings. Review and update if needed:

```bash
# Edit .env file with your preferred editor
notepad .env  # Windows
# or
nano .env     # Linux/Mac
```

Key settings to review:

- Database credentials (`DB_USER`, `DB_PASSWORD`)
- JWT secrets (must be changed in production!)
- CORS allowed origins

### 3. Start PostgreSQL

**Windows:**

```bash
# PostgreSQL should start automatically after installation
# Check if it's running:
pg_isready
```

**Linux/Mac:**

```bash
sudo service postgresql start
# or
brew services start postgresql  # If installed via Homebrew
```

### 4. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# In PostgreSQL shell, create database:
CREATE DATABASE auth_service;

# Exit PostgreSQL shell
\q
```

**Alternative one-liner:**

```bash
createdb -U postgres auth_service
```

### 5. Run Database Migrations

This will create all tables and insert default roles/permissions:

```bash
npm run db:setup
```

**Expected output:**

```
CREATE TABLE
CREATE TABLE
CREATE TABLE
...
INSERT 0 3
INSERT 0 8
```

If you see errors, verify:

- PostgreSQL is running
- Database exists
- Credentials in `.env` are correct

### 6. Start Redis

**Windows:**

```bash
# If installed as service:
redis-server

# Or start Windows service:
net start Redis
```

**Linux/Mac:**

```bash
redis-server
# or
sudo service redis-server start
# or
brew services start redis  # If installed via Homebrew
```

**Verify Redis is running:**

```bash
redis-cli ping
# Should respond: PONG
```

### 7. Start the Auth Service

```bash
npm run dev
```

**Expected output:**

```
Redis connected successfully
🚀 Auth Service running on port 8000
📝 Environment: development
🔒 CORS enabled for: http://localhost:3000, http://localhost:3001
```

### 8. Test the Service

Open another terminal and test the health endpoint:

```bash
curl http://localhost:8000/health
```

**Expected response:**

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

### 9. Create Your First User

Using curl:

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"AdminPass123!\",\"firstName\":\"Admin\",\"lastName\":\"User\"}"
```

Or use the `index.http` file in VS Code with the REST Client extension.

### 10. Login and Get Tokens

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"AdminPass123!\"}"
```

Save the `accessToken` and `refreshToken` from the response!

### 11. Assign Admin Role

First, get your access token from step 10, then:

```bash
curl -X POST http://localhost:8000/api/users/1/roles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -d "{\"roleName\":\"admin\"}"
```

Now your user has admin permissions!

## Troubleshooting

### "Database connection failed"

**Problem:** Can't connect to PostgreSQL

**Solutions:**

1. Check if PostgreSQL is running: `pg_isready`
2. Verify credentials in `.env` match your PostgreSQL setup
3. Check if database exists: `psql -U postgres -l`
4. Try default password: `postgres`

### "Redis connection error"

**Problem:** Can't connect to Redis

**Solutions:**

1. Check if Redis is running: `redis-cli ping`
2. Start Redis: `redis-server`
3. Check port in `.env` (default: 6379)

### "Module not found"

**Problem:** Node.js can't find modules

**Solutions:**

1. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
2. Verify Node.js version: `node --version` (must be 20.6+)
3. Check if `package.json` has `"type": "module"`

### "Port already in use"

**Problem:** Port 8000 is already taken

**Solutions:**

1. Change `PORT` in `.env` to another port (e.g., 3000)
2. Find and kill process using port 8000:

   ```bash
   # Windows
   netstat -ano | findstr :8000
   taskkill /PID <PID> /F

   # Linux/Mac
   lsof -i :8000
   kill -9 <PID>
   ```

### "JWT secret missing"

**Problem:** JWT secrets not configured

**Solution:**

- Verify `.env` file exists
- Check `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are set
- Restart server after changing `.env`

### "CORS error in browser"

**Problem:** Frontend can't connect due to CORS

**Solution:**

- Add your frontend URL to `ALLOWED_ORIGINS` in `.env`
- Example: `ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001`
- Restart server

## Production Setup

When deploying to production:

1. **Generate Strong Secrets:**

   ```bash
   # Generate random secrets
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

   Use these for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`

2. **Set Environment:**

   ```
   NODE_ENV=production
   ```

3. **Use Environment Variables:**
   - Don't commit `.env` to git
   - Use your hosting platform's environment variable system

4. **Enable SSL/TLS:**
   - Use HTTPS for all connections
   - Consider using a reverse proxy (nginx, Apache)

5. **Configure CORS Properly:**
   - Set specific allowed origins (not wildcards)
   - Remove development URLs

6. **Database Security:**
   - Use strong database password
   - Enable SSL for database connections
   - Limit database access by IP

7. **Redis Security:**
   - Set Redis password
   - Use Redis over TLS if possible
   - Enable Redis persistence

8. **Monitoring:**
   - Set up health check monitoring
   - Configure logging service
   - Set up error alerting

## Next Steps

1. **Integrate with Your Apps:**
   - See [README.md](README.md) for integration examples
   - Test token verification in your client apps

2. **Customize Roles and Permissions:**
   - Create roles specific to your organization
   - Define permissions for your resources
   - Assign roles to users

3. **Configure Password Policies:**
   - Adjust password requirements in code
   - Set password expiration policies
   - Implement password history

4. **Set Up MFA (Optional):**
   - Implement TOTP-based 2FA
   - Add SMS or email verification

5. **Review Security Settings:**
   - Adjust rate limits
   - Configure session timeouts
   - Review audit logging

## Useful Commands

```bash
# Start development server
npm run dev

# Start production server
npm start

# Setup database
npm run db:setup

# Check PostgreSQL status
pg_isready

# Check Redis status
redis-cli ping

# View PostgreSQL tables
psql -U postgres -d auth_service -c "\dt"

# View users in database
psql -U postgres -d auth_service -c "SELECT id, email, is_active FROM users;"

# View roles
psql -U postgres -d auth_service -c "SELECT * FROM roles;"

# Clear Redis cache
redis-cli FLUSHALL
```

## Support

For issues, refer to the [README.md](README.md) documentation or check the troubleshooting section above.
