# Docker Deployment Guide

## Quick Start

### Development Mode (with Hot-Reload) 🔥

```bash
# Start all services with source code mounted (auto-reload on changes)
npm run docker:dev

# Stop services
npm run docker:dev:down
```

**Development features:**

- 🔥 Hot-reload with tsx watch mode
- 📁 Source code mounted as volume (changes reflect immediately)
- 🚀 No build step required
- 🔍 Full TypeScript support

### Production Mode

#### 1. Set Environment Variables

```bash
# Copy the example env file
cp .env.example .env

# Edit .env and set your JWT secrets
# IMPORTANT: Change these in production!
```

#### 2. Start All Services

```bash
# Build and start all containers
docker-compose up -d
# or
npm run docker:up

# View logs
docker-compose logs -f
# or
npm run docker:logs

# Check status
docker-compose ps
```

### 3. Access the Application

- API: http://localhost:8000
- Health Check: http://localhost:8000/health
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## Docker Commands

### Development

```bash
# Start services
docker-compose up -d

# Rebuild after code changes
docker-compose up -d --build

# View logs
docker-compose logs -f app
docker-compose logs -f postgres
docker-compose logs -f redis

# Stop services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

### Database Management

```bash
# Access PostgreSQL
docker-compose exec postgres psql -U postgres -d auth_service

# Run SQL commands
docker-compose exec postgres psql -U postgres -d auth_service -c "SELECT * FROM users;"

# Backup database
docker-compose exec postgres pg_dump -U postgres auth_service > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres -d auth_service < backup.sql
```

### Redis Management

```bash
# Access Redis CLI
docker-compose exec redis redis-cli

# Monitor Redis commands
docker-compose exec redis redis-cli MONITOR

# Get all keys
docker-compose exec redis redis-cli KEYS '*'
```

### Application Management

```bash
# View application logs
docker-compose logs -f app

# Access application shell
docker-compose exec app sh

# Restart application
docker-compose restart app

# Check application health
curl http://localhost:8000/health
```

## Production Deployment

### 1. Update Environment Variables

```bash
# Set strong JWT secrets
JWT_ACCESS_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64)

# Update .env file with these values
```

### 2. Security Considerations

- Change default PostgreSQL password
- Use secrets management (Docker Secrets, AWS Secrets Manager, etc.)
- Enable SSL/TLS for PostgreSQL
- Use Redis password authentication
- Configure proper CORS origins
- Set up firewall rules
- Use reverse proxy (nginx, traefik)

### 3. Production Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
    secrets:
      - postgres_password

  redis:
    command: redis-server --requirepass ${REDIS_PASSWORD}

  app:
    environment:
      NODE_ENV: production
      REDIS_PASSWORD: ${REDIS_PASSWORD}
    secrets:
      - jwt_access_secret
      - jwt_refresh_secret

secrets:
  postgres_password:
    external: true
  jwt_access_secret:
    external: true
  jwt_refresh_secret:
    external: true
```

## Monitoring

### Health Checks

```bash
# Application health
curl http://localhost:8000/health

# PostgreSQL health
docker-compose exec postgres pg_isready -U postgres

# Redis health
docker-compose exec redis redis-cli ping
```

### Resource Usage

```bash
# View container stats
docker stats

# View specific container
docker stats auth_service
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs app

# Check if ports are in use
netstat -ano | findstr :8000
netstat -ano | findstr :5432
netstat -ano | findstr :6379
```

### Database connection issues

```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U postgres -d auth_service -c "SELECT 1;"
```

### Redis connection issues

```bash
# Verify Redis is running
docker-compose ps redis

# Check Redis logs
docker-compose logs redis

# Test connection
docker-compose exec redis redis-cli ping
```

### Reset Everything

```bash
# Stop containers and remove volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Start fresh
docker-compose up -d --build
```

## Scaling

### Horizontal Scaling

```bash
# Run multiple app instances
docker-compose up -d --scale app=3

# Use with load balancer (nginx, traefik, etc.)
```

### Resource Limits

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

## Backup Strategy

### Automated Backups

```bash
# Create backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T postgres pg_dump -U postgres auth_service > backup_$DATE.sql
```

### Schedule with cron

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/auth_service && ./backup.sh
```
