import request from 'supertest';
import { app, closeConnections } from '../app.js';

afterAll(async () => {
  await closeConnections();
});

describe('Authentication Endpoints', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const uniqueUsername = `testuser_${Date.now()}`;
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `${uniqueUsername}@test.com`,
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data.email).toBe(`${uniqueUsername}@test.com`);
    });

    it('should fail with invalid email format', async () => {
      const response = await request(app).post('/api/auth/register').send({
        username: 'testuser',
        email: 'invalid-email',
        password: 'TestPassword123!',
      });

      expect(response.status).toBe(400);
    });

    it('should fail with weak password', async () => {
      const response = await request(app).post('/api/auth/register').send({
        username: 'testuser',
        email: 'test@test.com',
        password: '123',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      // First create a user
      const uniqueUsername = `logintest_${Date.now()}`;
      await request(app)
        .post('/api/auth/register')
        .send({
          email: `${uniqueUsername}@test.com`,
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User',
        });

      // Then try to login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: `${uniqueUsername}@test.com`,
          password: 'TestPassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user).toHaveProperty('email');
    });

    it('should fail with incorrect password', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@test.com',
        password: 'wrongpassword',
      });

      expect(response.status).toBe(401);
    });

    it('should fail with non-existent user', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'nonexistentuser999@test.com',
        password: 'TestPassword123!',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should refresh access token with valid refresh token', async () => {
      // Register and get tokens
      const uniqueUsername = `refreshtest_${Date.now()}`;
      await request(app)
        .post('/api/auth/register')
        .send({
          email: `${uniqueUsername}@test.com`,
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User',
        });

      // Login to get tokens
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: `${uniqueUsername}@test.com`,
          password: 'TestPassword123!',
        });

      const refreshToken = loginResponse.body.data.refreshToken;

      // Use refresh token to get new access token
      const response = await request(app).post('/api/auth/refresh-token').send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with valid refresh token', async () => {
      // Register and get tokens
      const uniqueUsername = `logouttest_${Date.now()}`;
      await request(app)
        .post('/api/auth/register')
        .send({
          email: `${uniqueUsername}@test.com`,
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User',
        });

      // Login to get tokens
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: `${uniqueUsername}@test.com`,
          password: 'TestPassword123!',
        });

      const refreshToken = loginResponse.body.data.refreshToken;
      const accessToken = loginResponse.body.data.accessToken;

      // Logout
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should get current user profile with valid token', async () => {
      // Register and login
      const uniqueUsername = `metest_${Date.now()}`;
      await request(app)
        .post('/api/auth/register')
        .send({
          email: `${uniqueUsername}@test.com`,
          password: 'TestPassword123!',
          firstName: 'John',
          lastName: 'Doe',
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: `${uniqueUsername}@test.com`,
          password: 'TestPassword123!',
        });

      const accessToken = loginResponse.body.data.accessToken;

      // Get current user
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('email', `${uniqueUsername}@test.com`);
      expect(response.body.data).toHaveProperty('firstName', 'John');
      expect(response.body.data).toHaveProperty('lastName', 'Doe');
      expect(response.body.data).toHaveProperty('roles');
      expect(response.body.data).toHaveProperty('permissions');
      expect(response.body.data).toHaveProperty('isActive', true);
    });

    it('should fail without authentication token', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should fail with expired/blacklisted token', async () => {
      // Register, login, and logout
      const uniqueUsername = `expiredtest_${Date.now()}`;
      await request(app)
        .post('/api/auth/register')
        .send({
          email: `${uniqueUsername}@test.com`,
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User',
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: `${uniqueUsername}@test.com`,
          password: 'TestPassword123!',
        });

      const accessToken = loginResponse.body.data.accessToken;
      const refreshToken = loginResponse.body.data.refreshToken;

      // Logout to blacklist the token
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });

      // Try to use the blacklisted token
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(401);
    });
  });
});
