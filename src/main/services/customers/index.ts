// Customer Service

import { sql } from '../../database/connection';
import { getPool } from '../../database/connection';
import { Customer } from '../../../shared/types';

export async function getAll(filters?: any): Promise<Customer[]> {
  const pool = await getPool();
  let query = sql`SELECT * FROM customers WHERE 1=1`;

  if (filters?.search) {
    query = sql`${query} AND (name LIKE ${'%' + filters.search + '%'} OR mobile LIKE ${'%' + filters.search + '%'})`;
  }

  query = sql`${query} ORDER BY created_at DESC`;

  if (filters?.limit) {
    query = sql`${query} LIMIT ${filters.limit}`;
    if (filters?.offset) {
      query = sql`${query} OFFSET ${filters.offset}`;
    }
  }

  const result = await pool.query(query);
  return result.map(r => ({
    id: r.id,
    name: r.name,
    mobile: r.mobile,
    address: r.address,
    birth_date: r.birth_date,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export async function getById(id: number): Promise<Customer | null> {
  const pool = await getPool();
  const result = await pool.query(sql`SELECT * FROM customers WHERE id = ${id}`);
  if (result.length === 0) return null;
  const r = result[0];
  return {
    id: r.id,
    name: r.name,
    mobile: r.mobile,
    address: r.address,
    birth_date: r.birth_date,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export async function create(input: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> {
  const pool = await getPool();
  const now = new Date().toISOString();

  const result = await pool.query(sql`
    INSERT INTO customers (name, mobile, address, birth_date, created_at, updated_at)
    VALUES (${input.name}, ${input.mobile || null}, ${input.address || null}, ${input.birth_date || null}, ${now}, ${now})
    RETURNING *
  `);

  const r = result[0];
  return {
    id: r.id,
    name: r.name,
    mobile: r.mobile,
    address: r.address,
    birth_date: r.birth_date,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export async function update(id: number, input: Partial<Customer>): Promise<Customer | null> {
  const pool = await getPool();

  const updatesToApply: string[] = [];

  if (input.name !== undefined) { updatesToApply.push(`name = ${input.name}`); }
  if (input.mobile !== undefined) { updatesToApply.push(`mobile = ${input.mobile}`); }
  if (input.address !== undefined) { updatesToApply.push(`address = ${input.address}`); }
  if (input.birth_date !== undefined) { updatesToApply.push(`birth_date = ${input.birth_date}`); }

  if (updatesToApply.length === 0) return getById(id);

  updatesToApply.push('updated_at = CURRENT_TIMESTAMP');

  const query = sql`UPDATE customers SET ${sql.unsafe(updatesToApply.join(', '))} WHERE id = ${id}`;
  await pool.query(query);
  return getById(id);
}

export async function remove(id: number): Promise<boolean> {
  const pool = await getPool();

  // Check if customer has invoices
  const invoices = await pool.query(sql`SELECT COUNT(*) as count FROM invoices WHERE customer_id = ${id}`);
  if (invoices[0].count > 0) {
    // Don't delete, just could mark as inactive if we had that field
    // For now, prevent deletion
    return false;
  }

  await pool.query(sql`DELETE FROM customers WHERE id = ${id}`);
  return true;
}

export async function search(query: string): Promise<Customer[]> {
  const pool = await getPool();
  const result = await pool.query(sql`
    SELECT * FROM customers
    WHERE name LIKE ${'%' + query + '%'} OR mobile LIKE ${'%' + query + '%'} OR CAST(id AS TEXT) LIKE ${'%' + query + '%'}
    ORDER BY created_at DESC
    LIMIT 20
  `);

  return result.map(r => ({
    id: r.id,
    name: r.name,
    mobile: r.mobile,
    address: r.address,
    birth_date: r.birth_date,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}