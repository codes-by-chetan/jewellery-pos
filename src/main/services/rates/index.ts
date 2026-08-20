// Rate Service

import { sql } from '../../database/connection';
import { getPool } from '../../database/connection';

export interface Rate {
  id: number;
  metal_id: number;
  purity_id: number;
  rate_per_gram: number;
  effective_date: string;
  created_by: number;
  created_at: string;
  metal_name?: string;
  purity_name?: string;
}

export async function getCurrent(): Promise<Rate[]> {
  const pool = await getPool();
  const result = await pool.query(sql`
    SELECT mr.*, m.name as metal_name, p.name as purity_name
    FROM metal_rates mr
    JOIN metals m ON mr.metal_id = m.id
    JOIN purities p ON mr.purity_id = p.id
    WHERE mr.effective_date = (
      SELECT MAX(effective_date) FROM metal_rates mr2
      WHERE mr2.metal_id = mr.metal_id AND mr2.purity_id = mr.purity_id
    )
    AND m.active = 1 AND p.active = 1
    ORDER BY m.name, p.percentage DESC
  `);
  return result;
}

export async function getHistory(metalId: number, purityId: number): Promise<Rate[]> {
  const pool = await getPool();
  const result = await pool.query(sql`
    SELECT mr.*, m.name as metal_name, p.name as purity_name
    FROM metal_rates mr
    JOIN metals m ON mr.metal_id = m.id
    JOIN purities p ON mr.purity_id = p.id
    WHERE mr.metal_id = ${metalId} AND mr.purity_id = ${purityId}
    ORDER BY mr.effective_date DESC
  `);
  return result;
}

export async function setRate(input: {
  metal_id: number;
  purity_id: number;
  rate_per_gram: number;
  effective_date: string;
  created_by: number;
}): Promise<Rate> {
  const pool = await getPool();

  // Upsert rate for the date
  const result = await pool.query(sql`
    INSERT INTO metal_rates (metal_id, purity_id, rate_per_gram, effective_date, created_by)
    VALUES (${input.metal_id}, ${input.purity_id}, ${input.rate_per_gram}, ${input.effective_date}, ${input.created_by})
    ON CONFLICT(metal_id, purity_id, effective_date) DO UPDATE SET
      rate_per_gram = excluded.rate_per_gram,
      created_by = excluded.created_by
    RETURNING *
  `);

  // Log audit
  await pool.query(sql`
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
    VALUES (${input.created_by}, 'RATE_CHANGED', 'metal_rate', ${input.metal_id + '-' + input.purity_id + '-' + input.effective_date}, 'Rate updated')
  `);

  return result[0];
}