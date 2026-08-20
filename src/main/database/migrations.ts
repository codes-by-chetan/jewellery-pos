import { sql } from './connection';
import { getPool } from './connection';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { rawSql } from './raw-sql';

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'database', 'migrations');

export interface MigrationRecord {
  filename: string;
  checksum: string;
  applied_at: string;
}

function getMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
}

function computeChecksum(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function splitStatements(sqlText: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < sqlText.length; i++) {
    const char = sqlText[i];
    const nextChar = sqlText[i + 1];

    if (!inString && (char === '"' || char === "'" || char === '`')) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar && nextChar !== stringChar) {
      inString = false;
      stringChar = '';
    } else if (inString && char === stringChar && nextChar === stringChar) {
      i++;
    }

    current += char;

    if (!inString && char === ';') {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      current = '';
    }
  }

  const trimmed = current.trim();
  if (trimmed.length > 0) {
    statements.push(trimmed);
  }

  return statements;
}

export async function runMigrations(): Promise<void> {
  const pool = await getPool();
  const files = getMigrationFiles();

  // Ensure migrations table exists
  await pool.query(sql`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      checksum TEXT NOT NULL,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get applied migrations
  const applied = await pool.query(sql`SELECT filename, checksum FROM migrations`);
  const appliedMap = new Map(applied.map(r => [r.filename, r.checksum]));

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const checksum = computeChecksum(content);

    if (appliedMap.has(file)) {
      const existingChecksum = appliedMap.get(file);
      if (existingChecksum !== checksum) {
        throw new Error(`Migration ${file} has been modified! Checksum mismatch.`);
      }
      console.log(`Migration ${file} already applied, skipping`);
      continue;
    }

    console.log(`Applying migration: ${file}`);

    const statements = splitStatements(content);
    console.log(`  ${statements.length} statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt.trim().length === 0) continue;
      try {
        await pool.query(rawSql(stmt, []));
        console.log(`  [OK] Statement ${i + 1}/${statements.length}`);
      } catch (stmtError: any) {
        console.error(`  [FAIL] Statement ${i + 1}/${statements.length}:`, stmtError.message);
        console.error(`  SQL: ${stmt.substring(0, 500)}`);
        throw stmtError;
      }
    }

    // Record migration
    await pool.query(sql`
      INSERT INTO migrations (filename, checksum) VALUES (${file}, ${checksum})
    `);

    console.log(`Migration ${file} applied successfully`);
  }

  // Update schema_version in app_settings
  try {
    await pool.query(sql`
      INSERT INTO app_settings (key, value, description) VALUES ('schema_version', ${String(files.length)}, 'Current database schema version')
      ON CONFLICT(key) DO UPDATE SET value = ${String(files.length)}, updated_at = CURRENT_TIMESTAMP
    `);
    console.log(`Schema version updated to ${files.length}`);
  } catch (err: any) {
    console.error('Failed to update schema version:', err.message);
    throw err;
  }
}

export async function getSchemaVersion(): Promise<number> {
  const pool = await getPool();
  const result = await pool.query(sql`SELECT value FROM app_settings WHERE key = 'schema_version'`);
  if (result.length === 0) return 0;
  return parseInt(result[0].value, 10);
}

export async function validateSchemaVersion(expectedVersion: number): Promise<boolean> {
  const current = await getSchemaVersion();
  return current === expectedVersion;
}