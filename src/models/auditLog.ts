import { query } from '@/config/database.js';

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource: string;
  status: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
  created_at: Date;
}

interface CreateAuditLogParams {
  userId: string | null;
  action: string;
  resource: string;
  status: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export const AuditLogModel = {
  async create({
    userId,
    action,
    resource,
    status,
    ipAddress,
    userAgent,
    metadata,
  }: CreateAuditLogParams): Promise<void> {
    await query(
      `INSERT INTO audit_logs (user_id, action, resource, status, ip_address, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, action, resource, status, ipAddress, userAgent, JSON.stringify(metadata || {})]
    );
  },

  async getByUser(userId: string, limit: number = 50): Promise<AuditLog[]> {
    const result = await query(
      'SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );
    return result.rows;
  },
};
