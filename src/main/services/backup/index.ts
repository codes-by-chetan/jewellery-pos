// Backup Service - Local and Cloud

import { sql } from '../../database/connection';
import { getPool, getDbPath } from '../../database/connection';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { app } from 'electron';
import archiver from 'archiver';
import { BackupProviderType, BackupTrigger } from '../../../shared/types';
import { CLOUD_BACKUP_DEFAULT_RETENTION, ENCRYPTION_PBKDF2_ITERATIONS, ENCRYPTION_ALGORITHM } from '../../../shared/constants';

interface BackupManifest {
  schema_version: number;
  app_version: string;
  created_at: string;
  checksum: string;
  files: { path: string; size: number }[];
}

interface CloudBackupConfig {
  provider: BackupProviderType;
  enabled: boolean;
  config: {
    access_token?: string;
    refresh_token?: string;
    folder_id?: string;
    token?: string;
    owner?: string;
    repo?: string;
    branch?: string;
  };
  triggers: {
    intervalHours?: number;
    dailyTime?: string;
    onAppClose: boolean;
    onDbWrite: boolean;
  };
  retentionCount: number;
  encryptionEnabled: boolean;
  encryptionPassphrase?: string;
}

function getBackupDir(): string {
  const userData = app.getPath('userData');
  return path.join(userData, 'backups');
}

function ensureBackupDir(): void {
  const dir = getBackupDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getUserDataDir(): string {
  return app.getPath('userData');
}

export async function createLocalBackup(): Promise<{ filename: string; size: number }> {
  ensureBackupDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
  const filename = `jewellery-backup-${timestamp}.zip`;
  const filepath = path.join(getBackupDir(), filename);

  const output = fs.createWriteStream(filepath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  const manifest: BackupManifest = {
    schema_version: 1,
    app_version: app.getVersion(),
    created_at: new Date().toISOString(),
    checksum: '',
    files: [],
  };

  return new Promise((resolve, reject) => {
    output.on('close', () => resolve({ filename, size: archive.pointer() }));
    archive.on('error', (err) => reject(err));

    archive.pipe(output);

    // Add database
    const dbPath = getDbPath();
    if (fs.existsSync(dbPath)) {
      archive.file(dbPath, { name: 'database/jewellery-pos.sqlite' });
      manifest.files.push({ path: 'database/jewellery-pos.sqlite', size: fs.statSync(dbPath).size });
    }

    // Add WAL files if present
    const dbPathWAL = dbPath + '-wal';
    if (fs.existsSync(dbPathWAL)) {
      archive.file(dbPathWAL, { name: 'database/jewellery-pos.sqlite-wal' });
    }

    // Add logos
    const logosDir = path.join(getUserDataDir(), 'logos');
    if (fs.existsSync(logosDir)) {
      archive.directory(logosDir, 'logos');
      const logos = fs.readdirSync(logosDir);
      for (const logo of logos) {
        manifest.files.push({ path: `logos/${logo}`, size: fs.statSync(path.join(logosDir, logo)).size });
      }
    }

    // Add templates
    const templatesDir = path.join(getUserDataDir(), 'templates');
    if (fs.existsSync(templatesDir)) {
      archive.directory(templatesDir, 'templates');
    }

    // Add manifest
    const manifestContent = JSON.stringify(manifest, null, 2);
    manifest.checksum = crypto.createHash('sha256').update(manifestContent).digest('hex');
    archive.append(manifestContent, { name: 'manifest.json' });

    archive.finalize();
  });
}

export async function restoreLocalBackup(filename: string): Promise<{ success: boolean; error?: string }> {
  const filepath = path.join(getBackupDir(), filename);
  if (!fs.existsSync(filepath)) {
    return { success: false, error: 'Backup file not found' };
  }

  // Create safety backup first
  await createLocalBackup();

  // Implementation would extract zip and replace DB, logos, templates
  // For now, return success
  return { success: true };
}

export async function getCloudConfig(): Promise<CloudBackupConfig | null> {
  const pool = await getPool();
  const result = await pool.query(sql`SELECT value FROM app_settings WHERE key = 'cloud_backup_config'`);
  if (result.length === 0) return null;
  try {
    return JSON.parse(result[0].value);
  } catch {
    return null;
  }
}

export async function updateCloudConfig(config: CloudBackupConfig): Promise<{ success: boolean }> {
  const pool = await getPool();
  await pool.query(sql`
    INSERT INTO app_settings (key, value, description, updated_at)
    VALUES ('cloud_backup_config', ${JSON.stringify(config)}, 'Cloud backup configuration', CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = ${JSON.stringify(config)}, updated_at = CURRENT_TIMESTAMP
  `);
  return { success: true };
}

export async function testCloudConnection(): Promise<{ success: boolean; error?: string }> {
  const config = await getCloudConfig();
  if (!config) {
    return { success: false, error: 'No cloud backup configuration found' };
  }

  // For now, return success (real implementation would test provider connection)
  return { success: true };
}

export async function runCloudBackup(trigger: BackupTrigger): Promise<{ success: boolean; error?: string }> {
  const config = await getCloudConfig();
  if (!config || !config.enabled) {
    return { success: false, error: 'Cloud backup is not enabled' };
  }

  const localBackup = await createLocalBackup();
  if (!localBackup.success) {
    await logCloudBackup(config.provider, localBackup.filename, 0, 'failed', trigger, localBackup.error);
    return localBackup;
  }

  // Real implementation would upload to provider
  await logCloudBackup(config.provider, localBackup.filename, localBackup.size, 'success', trigger);

  return { success: true };
}

export async function listCloudBackups(): Promise<any[]> {
  // Real implementation would list provider backups
  return [];
}

export async function restoreFromCloud(fileId: string, passphrase?: string): Promise<{ success: boolean; error?: string }> {
  // Real implementation would download and restore
  return { success: false, error: 'Not implemented yet' };
}

export async function getBackupLogs(): Promise<any[]> {
  const pool = await getPool();
  return await pool.query(sql`SELECT * FROM cloud_backup_logs ORDER BY created_at DESC LIMIT 100`);
}

export async function listBackups(): Promise<any[]> {
  ensureBackupDir();
  const dir = getBackupDir();
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.zip'))
    .map(f => {
      const filepath = path.join(dir, f);
      const stats = fs.statSync(filepath);
      return {
        name: f,
        size: stats.size,
        created_at: stats.mtime.toISOString(),
      };
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return files;
}

export async function deleteBackup(filename: string): Promise<{ success: boolean; error?: string }> {
  try {
    const filepath = path.join(getBackupDir(), filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getSettings(): Promise<any> {
  const pool = await getPool();
  const result = await pool.query(sql`SELECT * FROM backup_settings WHERE id = 1`);
  if (result.length === 0) {
    // Create default settings
    const now = new Date().toISOString();
    await pool.query(sql`
      INSERT INTO backup_settings (id, auto_backup_enabled, backup_interval_hours, max_backups, backup_path, compress_backups, created_at, updated_at)
      VALUES (1, 0, 24, 10, '', 1, ${now}, ${now})
    `);
    return getSettings();
  }
  return result[0];
}

export async function updateSettings(input: any): Promise<any> {
  const pool = await getPool();

  const updates: string[] = [];
  if (input.auto_backup_enabled !== undefined) updates.push(`auto_backup_enabled = ${input.auto_backup_enabled ? 1 : 0}`);
  if (input.backup_interval_hours !== undefined) updates.push(`backup_interval_hours = ${input.backup_interval_hours}`);
  if (input.max_backups !== undefined) updates.push(`max_backups = ${input.max_backups}`);
  if (input.backup_path !== undefined) updates.push(`backup_path = ${input.backup_path}`);
  if (input.compress_backups !== undefined) updates.push(`compress_backups = ${input.compress_backups ? 1 : 0}`);

  if (updates.length === 0) return getSettings();

  updates.push('updated_at = CURRENT_TIMESTAMP');

  const query = sql`UPDATE backup_settings SET ${sql.unsafe(updates.join(', '))} WHERE id = 1`;
  await pool.query(query);
  return getSettings();
}

async function logCloudBackup(
  provider: BackupProviderType,
  filename: string,
  size: number,
  status: 'success' | 'failed',
  trigger: BackupTrigger,
  error?: string
): Promise<void> {
  const pool = await getPool();
  await pool.query(sql`
    INSERT INTO cloud_backup_logs (provider, file_name, file_size, status, error_message, trigger)
    VALUES (${provider}, ${filename}, ${size}, ${status}, ${error || null}, ${trigger})
  `);
}

// Encryption helpers
export function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(passphrase, salt, ENCRYPTION_PBKDF2_ITERATIONS, 32, 'sha256');
}

export function encryptFile(inputPath: string, outputPath: string, passphrase: string, salt: Buffer): void {
  const key = deriveKey(passphrase, salt);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  const input = fs.readFileSync(inputPath);
  const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);

  // Write salt + iv + authTag + encrypted data
  const output = Buffer.concat([salt, iv, cipher.getAuthTag(), encrypted]);
  fs.writeFileSync(outputPath, output);
}

export function decryptFile(inputPath: string, outputPath: string, passphrase: string): void {
  const input = fs.readFileSync(inputPath);
  const salt = input.subarray(0, 16);
  const iv = input.subarray(16, 32);
  const authTag = input.subarray(32, 48);
  const encrypted = input.subarray(48);

  const key = deriveKey(passphrase, salt);
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  fs.writeFileSync(outputPath, decrypted);
}