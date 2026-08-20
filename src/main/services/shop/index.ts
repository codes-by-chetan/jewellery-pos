// Shop Settings Service

import { sql } from '../../database/connection';
import { getPool } from '../../database/connection';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface ShopSettings {
  id: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  state_code?: string;
  logo_filename?: string;
  invoice_footer?: string;
  terms_conditions?: string;
  rounding_mode: 'PER_ITEM' | 'AGGREGATE';
  created_at: string;
  updated_at: string;
}

function getLogosDir(): string {
  const userData = app.getPath('userData');
  return path.join(userData, 'logos');
}

function getDefaultLogoPath(): string {
  return path.join(__dirname, '..', '..', '..', 'assets', 'logos', 'default-jewellery-logo.png');
}

function ensureLogosDir(): void {
  const dir = getLogosDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export async function getSettings(): Promise<ShopSettings | null> {
  const pool = await getPool();
  const result = await pool.query(sql`SELECT * FROM shops WHERE id = 1`);
  if (result.length === 0) {
    // Create default shop record
    const now = new Date().toISOString();
    await pool.query(sql`
      INSERT INTO shops (id, name, rounding_mode, created_at, updated_at)
      VALUES (1, 'My Jewellery Shop', 'PER_ITEM', ${now}, ${now})
    `);
    return getSettings();
  }
  return result[0];
}

export async function updateSettings(input: Partial<ShopSettings>): Promise<ShopSettings | null> {
  const pool = await getPool();

  const allowedFields = [
    'name', 'address', 'city', 'state', 'pincode', 'phone', 'email',
    'gstin', 'pan', 'state_code', 'logo_filename', 'invoice_footer',
    'terms_conditions', 'rounding_mode'
  ];

  const updatesToApply: string[] = [];

  for (const field of allowedFields) {
    const value = input[field as keyof ShopSettings];
    if (value !== undefined) {
      updatesToApply.push(`${field} = ${value}`);
    }
  }

  if (updatesToApply.length === 0) return getSettings();

  updatesToApply.push('updated_at = CURRENT_TIMESTAMP');

  const query = sql`UPDATE shops SET ${sql.unsafe(updatesToApply.join(', '))} WHERE id = 1`;
  await pool.query(query);

  // Log audit
  await pool.query(sql`
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
    VALUES (1, 'SHOP_SETTINGS_UPDATED', 'shop', '1', 'Shop settings updated')
  `);

  return getSettings();
}

export async function uploadLogo(file: { name: string; data: Buffer }): Promise<{ filename: string }> {
  ensureLogosDir();

  // Get current logo versions
  const existing = fs.readdirSync(getLogosDir())
    .filter(f => f.startsWith('logo-v') && f.endsWith('.png'))
    .sort((a, b) => {
      const av = parseInt(a.replace('logo-v', '').replace('.png', ''), 10);
      const bv = parseInt(b.replace('logo-v', '').replace('.png', ''), 10);
      return bv - av;
    });

  const nextVersion = existing.length > 0
    ? parseInt(existing[0].replace('logo-v', '').replace('.png', ''), 10) + 1
    : 1;

  const filename = `logo-v${nextVersion}.png`;
  const filepath = path.join(getLogosDir(), filename);

  fs.writeFileSync(filepath, file.data);

  // Update shop settings with new logo
  await updateSettings({ logo_filename: filename });

  return { filename };
}

export async function getLogoVersions(): Promise<string[]> {
  ensureLogosDir();
  return fs.readdirSync(getLogosDir())
    .filter(f => f.startsWith('logo-v') && f.endsWith('.png'))
    .sort((a, b) => {
      const av = parseInt(a.replace('logo-v', '').replace('.png', ''), 10);
      const bv = parseInt(b.replace('logo-v', '').replace('.png', ''), 10);
      return bv - av;
    });
}

export async function getLogoPath(version: string): Promise<string | null> {
  const filepath = path.join(getLogosDir(), version);
  if (fs.existsSync(filepath)) {
    return filepath;
  }
  // Fallback to default
  const defaultPath = getDefaultLogoPath();
  if (fs.existsSync(defaultPath)) {
    return defaultPath;
  }
  return null;
}