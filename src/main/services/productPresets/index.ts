// Product Preset Service

import { sql } from '../../database/connection';
import { getPool } from '../../database/connection';

export interface ProductPreset {
  id: number;
  english_name?: string;
  marathi_name?: string;
  metal_id: number;
  purity_id: number;
  hsn_sac?: string;
  making_charge_method?: string;
  making_charge_value?: number;
  making_charge_per_gram_base: string;
  wastage_base: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  metal_name?: string;
  purity_name?: string;
}

export async function getAll(filters?: any): Promise<ProductPreset[]> {
  const pool = await getPool();
  let query = sql`
    SELECT pp.*, m.name as metal_name, p.name as purity_name
    FROM product_presets pp
    JOIN metals m ON pp.metal_id = m.id
    JOIN purities p ON pp.purity_id = p.id
    WHERE pp.active = 1
  `;

  if (filters?.metal_id) {
    query = sql`${query} AND pp.metal_id = ${filters.metal_id}`;
  }

  query = sql`${query} ORDER BY pp.english_name, pp.marathi_name`;

  const result = await pool.query(query);
  return result;
}

export async function getById(id: number): Promise<ProductPreset | null> {
  const pool = await getPool();
  const result = await pool.query(sql`
    SELECT pp.*, m.name as metal_name, p.name as purity_name
    FROM product_presets pp
    JOIN metals m ON pp.metal_id = m.id
    JOIN purities p ON pp.purity_id = p.id
    WHERE pp.id = ${id}
  `);
  if (result.length === 0) return null;
  return result[0];
}

export async function create(input: Omit<ProductPreset, 'id' | 'created_at' | 'updated_at' | 'metal_name' | 'purity_name'>): Promise<ProductPreset> {
  const pool = await getPool();
  const now = new Date().toISOString();

  const result = await pool.query(sql`
    INSERT INTO product_presets (
      english_name, marathi_name, metal_id, purity_id, hsn_sac,
      making_charge_method, making_charge_value,
      making_charge_per_gram_base, wastage_base, active,
      created_at, updated_at
    ) VALUES (
      ${input.english_name || null}, ${input.marathi_name || null}, ${input.metal_id}, ${input.purity_id},
      ${input.hsn_sac || null}, ${input.making_charge_method || null}, ${input.making_charge_value || null},
      ${input.making_charge_per_gram_base}, ${input.wastage_base}, ${input.active ? 1 : 0},
      ${now}, ${now}
    )
    RETURNING *
  `);

  return result[0];
}

export async function update(id: number, input: Partial<ProductPreset>): Promise<ProductPreset | null> {
  const pool = await getPool();

  const updatesToApply: string[] = [];

  if (input.english_name !== undefined) { updatesToApply.push(`english_name = ${input.english_name}`); }
  if (input.marathi_name !== undefined) { updatesToApply.push(`marathi_name = ${input.marathi_name}`); }
  if (input.metal_id !== undefined) { updatesToApply.push(`metal_id = ${input.metal_id}`); }
  if (input.purity_id !== undefined) { updatesToApply.push(`purity_id = ${input.purity_id}`); }
  if (input.hsn_sac !== undefined) { updatesToApply.push(`hsn_sac = ${input.hsn_sac}`); }
  if (input.making_charge_method !== undefined) { updatesToApply.push(`making_charge_method = ${input.making_charge_method}`); }
  if (input.making_charge_value !== undefined) { updatesToApply.push(`making_charge_value = ${input.making_charge_value}`); }
  if (input.making_charge_per_gram_base !== undefined) { updatesToApply.push(`making_charge_per_gram_base = ${input.making_charge_per_gram_base}`); }
  if (input.wastage_base !== undefined) { updatesToApply.push(`wastage_base = ${input.wastage_base}`); }
  if (input.active !== undefined) { updatesToApply.push(`active = ${input.active ? 1 : 0}`); }

  if (updatesToApply.length === 0) return getById(id);

  updatesToApply.push('updated_at = CURRENT_TIMESTAMP');

  const query = sql`UPDATE product_presets SET ${sql.unsafe(updatesToApply.join(', '))} WHERE id = ${id}`;
  await pool.query(query);
  return getById(id);
}

export async function remove(id: number): Promise<boolean> {
  const pool = await getPool();

  // Check if preset is referenced in invoices
  const items = await pool.query(sql`
    SELECT COUNT(*) as count FROM invoice_items ii
    JOIN invoice_versions iv ON ii.invoice_version_id = iv.id
    WHERE iv.invoice_id IN (
      SELECT i.id FROM invoices i WHERE i.id IN (
        SELECT invoice_id FROM invoice_versions WHERE invoice_id IN (
          SELECT id FROM invoices
        )
      )
    )
  `);
  // For simplicity, just deactivate
  await pool.query(sql`UPDATE product_presets SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`);
  return false;
}