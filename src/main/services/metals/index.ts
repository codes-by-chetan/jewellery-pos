// Metal Service

import { sql } from '../../database/connection';
import { getPool } from '../../database/connection';
import { Metal } from '../../../shared/types';

export async function getAll(): Promise<Metal[]> {
  const pool = await getPool();
  const result = await pool.query(sql`SELECT * FROM metals WHERE active = 1 ORDER BY name`);
  return result.map(r => ({
    id: r.id,
    name: r.name,
    code: r.code,
    active: r.active === 1,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export async function create(input: Omit<Metal, 'id' | 'created_at' | 'updated_at'>): Promise<Metal> {
  const pool = await getPool();
  const now = new Date().toISOString();

  const result = await pool.query(sql`
    INSERT INTO metals (name, code, active, created_at, updated_at)
    VALUES (${input.name}, ${input.code.toUpperCase()}, ${input.active ? 1 : 0}, ${now}, ${now})
    RETURNING *
  `);

  const r = result[0];
  return {
    id: r.id,
    name: r.name,
    code: r.code,
    active: r.active === 1,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export async function update(id: number, input: Partial<Metal>): Promise<Metal | null> {
  const pool = await getPool();

  const updatesToApply: string[] = [];

  if (input.name !== undefined) { updatesToApply.push(`name = ${input.name}`); }
  if (input.code !== undefined) { updatesToApply.push(`code = ${input.code.toUpperCase()}`); }
  if (input.active !== undefined) { updatesToApply.push(`active = ${input.active ? 1 : 0}`); }

  if (updatesToApply.length === 0) return getById(id);

  updatesToApply.push('updated_at = CURRENT_TIMESTAMP');

  const query = sql`UPDATE metals SET ${sql.unsafe(updatesToApply.join(', '))} WHERE id = ${id}`;
  await pool.query(query);
  return getById(id);
}

export async function getById(id: number): Promise<Metal | null> {
  const pool = await getPool();
  const result = await pool.query(sql`SELECT * FROM metals WHERE id = ${id}`);
  if (result.length === 0) return null;
  const r = result[0];
  return {
    id: r.id,
    name: r.name,
    code: r.code,
    active: r.active === 1,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export async function remove(id: number): Promise<boolean> {
  const pool = await getPool();

  // Check if metal is referenced
  const purities = await pool.query(sql`SELECT COUNT(*) as count FROM purities WHERE metal_id = ${id}`);
  if (purities[0].count > 0) {
    // Don't delete, just deactivate
    await pool.query(sql`UPDATE metals SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`);
    return false;
  }

  await pool.query(sql`DELETE FROM metals WHERE id = ${id}`);
  return true;
}