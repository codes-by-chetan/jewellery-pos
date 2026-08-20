// Audit Log Service

import { sql } from '../../database/connection';
import { getPool } from '../../database/connection';
import { AUDIT_LOG_WARNING_THRESHOLD } from '../../../shared/constants';

export interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  entity_type: string;
  entity_id?: string;
  description?: string;
  created_at: string;
  user_name?: string;
}

export async function getLogs(filters: any = {}): Promise<AuditLog[]> {
  const pool = await getPool();
  let query = sql`
    SELECT al.*, u.name as user_name
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE 1=1
  `;

  if (filters.action) {
    query = sql`${query} AND al.action = ${filters.action}`;
  }
  if (filters.entity_type) {
    query = sql`${query} AND al.entity_type = ${filters.entity_type}`;
  }
  if (filters.user_id) {
    query = sql`${query} AND al.user_id = ${filters.user_id}`;
  }
  if (filters.date_from) {
    query = sql`${query} AND al.created_at >= ${filters.date_from}`;
  }
  if (filters.date_to) {
    query = sql`${query} AND al.created_at <= ${filters.date_to}`;
  }

  query = sql`${query} ORDER BY al.created_at DESC`;

  if (filters.limit) {
    query = sql`${query} LIMIT ${filters.limit}`;
  }

  const result = await pool.query(query);
  return result;
}

export async function exportLogs(dateFrom: string, dateTo: string): Promise<string> {
  const logs = await getLogs({ date_from: dateFrom, date_to: dateTo, limit: 100000 });

  // Generate CSV
  const headers = ['ID', 'Date', 'User', 'Action', 'Entity Type', 'Entity ID', 'Description'];
  const rows = logs.map(log => [
    log.id,
    log.created_at,
    log.user_name || 'System',
    log.action,
    log.entity_type,
    log.entity_id || '',
    log.description || '',
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
  return csv;
}

export async function purgeOldLogs(beforeDate: string): Promise<{ success: boolean; deletedCount: number }> {
  const pool = await getPool();
  const result = await pool.query(sql`
    DELETE FROM audit_logs WHERE created_at < ${beforeDate}
  `);

  return { success: true, deletedCount: result.changes || 0 };
}

export async function checkWarningThreshold(): Promise<{ warning: boolean; count: number }> {
  const pool = await getPool();
  const result = await pool.query(sql`SELECT COUNT(*) as count FROM audit_logs`);
  const count = result[0]?.count || 0;

  return {
    warning: count >= AUDIT_LOG_WARNING_THRESHOLD,
    count,
  };
}

export async function log(
  action: string,
  entityType: string,
  entityId: string | number,
  description: string,
  userId?: number
): Promise<void> {
  const pool = await getPool();
  await pool.query(sql`
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
    VALUES (${userId || null}, ${action}, ${entityType}, ${String(entityId)}, ${description})
  `);
}