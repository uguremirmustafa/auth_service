/**
 * Example Client Integration (TypeScript)
 *
 * This file demonstrates how to integrate the auth service with your client applications.
 * You can use this code in your Node.js backend, React frontend, or any other TypeScript application.
 */

import { Request, Response, NextFunction } from 'express';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  permissions: string[];
}

interface VerificationResult {
  valid: boolean;
  user: User;
  expiresAt: string;
}

interface LoginResponse {
  success: boolean;
  data?: {
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  };
  error?: {
    message: string;
    code: string;
  };
}

interface RegisterResponse {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  error?: {
    message: string;
    code: string;
  };
}

// Extend Express Request to include user
// Note: Comment this out in frontend code - only for backend
/*
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
*/

// ============================================================================
// OPTION 1: Server-Side Verification (Recommended for backend services)
// ============================================================================

/**
 * Verify token by calling the auth service
 * Use this in your backend services to validate tokens
 */
async function verifyTokenWithAuthService(token: string): Promise<VerificationResult | null> {
  try {
    const response = await fetch('http://localhost:8000/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      return null;
      (await response.json()) as { data: VerificationResult };
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Express.js Middleware Example
 * Use this in your Express backend
 */
async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.substring(7);
  const verification = await verifyTokenWithAuthService(token);

  if (!verification || !verification.valid) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  req.user = verification.user;
  next();
}

/**
 * Permission Check Middleware
 * Use this to protect routes with specific permissions
 */
function requirePermission(...permissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      _res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const hasPermission = permissions.some((permission) =>
      req.user?.permissions?.includes(permission)
    );

    if (!hasPermission) {
      _res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

// ============================================================================
// FRONTEND INTEGRATION (React/Vue/Angular)
// ============================================================================

/**
 * Authentication Service for Frontend
 * Use this in your React, Vue, or Angular app
 */
class AuthService {
  private baseURL: string;

  constructor(baseURL: string = 'http://localhost:8000') {
    this.baseURL = baseURL;
  }

  /**
   * Register new user
   */
  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<RegisterResponse> {
    const response = await fetch(`${this.baseURL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, firstName, lastName }),
    });

    const data = (await response.json()) as RegisterResponse;
    return data;
  }

  /**
   * Login user and store tokens
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${this.baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = (await response.json()) as LoginResponse;

    if (data.success && data.data) {
      // Store tokens in localStorage
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));
    }

    return data;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();

    if (accessToken) {
      try {
        await fetch(`${this.baseURL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    // Clear local storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseURL}/api/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const data = (await response.json()) as LoginResponse;

    if (data.success && data.data) {
      localStorage.setItem('accessToken', data.data.accessToken);
      return data.data.accessToken;
    }

    throw new Error('Token refresh failed');
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  /**
   * Get current refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  /**
   * Get current user from storage
   */
  getCurrentUser(): User | null {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Check if user has permission
   */
  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    return user?.permissions?.includes(permission) || false;
  }

  /**
   * Check if user has role
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.roles?.includes(role) || false;
  }
}

/**
 * API Client with automatic token refresh
 * Use this for all API calls from your frontend
 */
class APIClient {
  private baseURL: string;
  private authService: AuthService;

  constructor(baseURL: string, authService: AuthService) {
    this.baseURL = baseURL;
    this.authService = authService;
  }

  /**
   * Make authenticated API call with automatic token refresh
   */
  async fetch(endpoint: string, options: RequestInit = {}): Promise<globalThis.Response> {
    const token = this.authService.getAccessToken();

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    };

    let response = await fetch(`${this.baseURL}${endpoint}`, config);

    // If token expired, refresh and retry
    if (response.status === 401) {
      try {
        await this.authService.refreshToken();
        const newToken = this.authService.getAccessToken();

        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${newToken}`,
        };
        response = await fetch(`${this.baseURL}${endpoint}`, config);
      } catch (error) {
        // Refresh failed, redirect to login
        this.authService.logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw error;
      }
    }

    return response;
  }

  async get(endpoint: string): Promise<globalThis.Response> {
    return this.fetch(endpoint, { method: 'GET' });
  }

  async post(endpoint: string, data: unknown): Promise<globalThis.Response> {
    return this.fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint: string, data: unknown): Promise<globalThis.Response> {
    return this.fetch(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint: string): Promise<globalThis.Response> {
    return this.fetch(endpoint, { method: 'DELETE' });
  }
}

// Export for use in other files
export {
  verifyTokenWithAuthService,
  authMiddleware,
  requirePermission,
  AuthService,
  APIClient,
  User,
  VerificationResult,
  LoginResponse,
  RegisterResponse,
};
