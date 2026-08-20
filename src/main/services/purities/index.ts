// Purity Service

import { sql } from '../../database/connection';
import { getPool } from '../../database/connection';
import { Purity } from '../../../shared/types';

export async function getAll(metalId?: number): Promise<Purity[]> {
  const pool = await getPool();
  let query = sql`SELECT * FROM purities WHERE active = 1`;

  if (metalId) {
    query = sql`${query} AND metal_id = ${metalId}`;
  }

  query = sql`${query} ORDER BY metal_id, percentage DESC`;

  const result = await pool.query(query);
  return result.map(r => ({
    id: r.id,
    metal_id: r.metal_id,
    name: r.name,
    code: r.code,
    percentage: r.percentage,
    active: r.active === 1,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export async function getByMetal(metalId: number): Promise<Purity[]> {
  return getAll(metalId);
}

export async function create(input: Omit<Purity, 'id' | 'created_at' | 'updated_at'>): Promise<Purity> {
  const pool = await getPool();
  const now = new Date().toISOString();

  const result = await pool.query(sql`
    INSERT INTO purities (metal_id, name, code, percentage, active, created_at, updated_at)
    VALUES (${input.metal_id}, ${input.name}, ${input.code.toUpperCase()}, ${input.percentage}, ${input.active ? 1 : 0}, ${now}, ${now})
    RETURNING *
  `);

  const r = result[0];
  return {
    id: r.id,
    metal_id: r.metal_id,
    name: r.name,
    code: r.code,
    percentage: r.percentage,
    active: r.active === 1,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export async function update(id: number, input: Partial<Purity>): Promise<Purity | null> {
  const pool = await getPool();

  const updatesToApply: string[] = [];

  if (input.metal_id !== undefined) { updatesToApply.push(`metal_id = ${input.metal_id}`); }
  if (input.name !== undefined) { updatesToApply.push(`name = ${input.name}`); }
  if (input.code !== undefined) { updatesToApply.push(`code = ${input.code.toUpperCase()}`); }
  if (input.percentage !== undefined) { updatesToApply.push(`percentage = ${input.percentage}`); }
  if (input.active !== undefined) { updatesToApply.push(`active = ${input.active ? 1 : 0}`); }

  if (updatesToApply.length === 0) return getById(id);

  updatesToApply.push('updated_at = CURRENT_TIMESTAMP');

  const query = sql`UPDATE purities SET ${sql.unsafe(updatesToApply.join(', '))} WHERE id = ${id}`;
  await pool.query(query);
  return getById(id);
}

export async function getById(id: number): Promise<Purity | null> {
  const pool = await getPool();
  const result = await pool.query(sql`SELECT * FROM purities WHERE id = ${id}`);
  if (result.length === 0) return null;
  const r = result[0];
  return {
    id: r.id,
    metal_id: r.metal_id,
    name: r.name,
    code: r.code,
    percentage: r.percentage,
    active: r.active === 1,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export async function remove(id: number): Promise<boolean> {
  const pool = await getPool();

  // Check if purity is referenced
  const rates = await pool.query(sql`SELECT COUNT(*) as count FROM metal_rates WHERE purity_id = ${id}`);
  if (rates[0].count > 0) {
    await pool.query(sql`UPDATE purities SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`);
    return false;
  }

  await pool.query(sql`DELETE FROM purities WHERE id = ${id}`);
  return true;
}