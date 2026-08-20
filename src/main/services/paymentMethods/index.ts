// Payment Methods Service

import { sql } from '../../database/connection';
import { getPool } from '../../database/connection';

export interface PaymentMethod {
  code: string;
  label: string;
  is_custom: boolean;
  sort_order: number;
  active: boolean;
}

export async function getAll(): Promise<PaymentMethod[]> {
  const pool = await getPool();
  const result = await pool.query(sql`
    SELECT * FROM payment_methods WHERE active = 1 ORDER BY sort_order
  `);
  return result.map(r => ({
    code: r.code,
    label: r.label,
    is_custom: r.is_custom === 1,
    sort_order: r.sort_order,
    active: r.active === 1,
  }));
}

export async function create(input: Omit<PaymentMethod, 'code'> & { code: string }): Promise<PaymentMethod> {
  const pool = await getPool();

  const result = await pool.query(sql`
    INSERT INTO payment_methods (code, label, is_custom, sort_order, active)
    VALUES (${input.code.toUpperCase()}, ${input.label}, ${input.is_custom ? 1 : 0}, ${input.sort_order}, ${input.active ? 1 : 0})
    RETURNING *
  `);

  const r = result[0];
  return {
    code: r.code,
    label: r.label,
    is_custom: r.is_custom === 1,
    sort_order: r.sort_order,
    active: r.active === 1,
  };
}

export async function update(code: string, input: Partial<PaymentMethod>): Promise<PaymentMethod | null> {
  const pool = await getPool();

  const updatesToApply: string[] = [];

  if (input.label !== undefined) { updatesToApply.push(`label = ${input.label}`); }
  if (input.is_custom !== undefined) { updatesToApply.push(`is_custom = ${input.is_custom ? 1 : 0}`); }
  if (input.sort_order !== undefined) { updatesToApply.push(`sort_order = ${input.sort_order}`); }
  if (input.active !== undefined) { updatesToApply.push(`active = ${input.active ? 1 : 0}`); }

  if (updatesToApply.length === 0) return getByCode(code);

  const query = sql`UPDATE payment_methods SET ${sql.unsafe(updatesToApply.join(', '))} WHERE code = ${code}`;
  await pool.query(query);
  return getByCode(code);
}

export async function getByCode(code: string): Promise<PaymentMethod | null> {
  const pool = await getPool();
  const result = await pool.query(sql`SELECT * FROM payment_methods WHERE code = ${code}`);
  if (result.length === 0) return null;
  const r = result[0];
  return {
    code: r.code,
    label: r.label,
    is_custom: r.is_custom === 1,
    sort_order: r.sort_order,
    active: r.active === 1,
  };
}

export async function remove(code: string): Promise<boolean> {
  const pool = await getPool();

  // Check if payment method is in use
  const payments = await pool.query(sql`SELECT COUNT(*) as count FROM payments WHERE method = ${code}`);
  if (payments[0].count > 0) {
    // Deactivate instead of delete
    await pool.query(sql`UPDATE payment_methods SET active = 0 WHERE code = ${code}`);
    return false;
  }

  await pool.query(sql`DELETE FROM payment_methods WHERE code = ${code}`);
  return true;
}