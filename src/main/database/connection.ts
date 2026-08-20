import sqlite from '@databases/sqlite';
import { ConnectionPool, sql } from '@databases/sqlite';
const connect = sqlite.default || sqlite;
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let pool: ConnectionPool | null = null;

export function getDbPath(): string {
  const userData = app.getPath('userData');
  return path.join(userData, 'jewellery-pos.sqlite');
}

export async function getPool(): Promise<ConnectionPool> {
  if (pool) return pool;

  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  pool = connect(dbPath);

  // Enable WAL mode and foreign keys
  await pool.query(sql`PRAGMA journal_mode = WAL`);
  await pool.query(sql`PRAGMA foreign_keys = ON`);

  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.dispose();
    pool = null;
  }
}

export { sql };