import bcrypt from 'bcryptjs';
import { sql,getPool } from '../../database/connection';
import { User, Role, Permission } from '../../../shared/types';

const JWT_SECRET_KEY = 'jwt_secret';
const REFRESH_TOKEN_KEY = 'refresh_token_secret';

interface JWTPayload {
  userId: number;
  username: string;
  role: Role;
  permissions: Permission[];
  iat: number;
  exp: number;
}

function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 15 * 60; // 15 minutes

  const fullPayload: JWTPayload = { ...payload, iat: now, exp };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');

  const secret = getSecret(JWT_SECRET_KEY);
  const signature = sign(`${encodedHeader}.${encodedPayload}`, secret);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signature] = parts;
    const secret = getSecret(JWT_SECRET_KEY);
    const expectedSig = sign(`${headerB64}.${payloadB64}`, secret);

    if (signature !== expectedSig) return null;

    const payload: JWTPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

function getSecret(key: string): string {
  // In production, this should be stored securely
  // For now, derive from key + fixed string
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(key + '-jewellery-pos-secret').digest('base64url');
}

function sign(data: string, secret: string): string {
  const crypto = require('crypto');
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

function generateRefreshToken(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('base64url');
}

async function hashRefreshToken(token: string): Promise<string> {
  return bcrypt.hash(token, 12);
}

async function verifyRefreshTokenHash(token: string, hash: string): Promise<boolean> {
  return bcrypt.compare(token, hash);
}

export async function createAdmin(input: {
  name: string;
  username: string;
  password: string;
}): Promise<User> {
  const pool = await getPool();

  const passwordHash = await bcrypt.hash(input.password, 12);

  const result = await pool.query(sql`
    INSERT INTO users (name, username, password_hash, role, active)
    VALUES (${input.name}, ${input.username}, ${passwordHash}, 'ADMIN', 1)
    RETURNING id, name, username, role, active, created_at, updated_at, last_login_at
  `);

  const user = result[0];

  // Log audit
  await pool.query(sql`
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
    VALUES (${user.id}, 'USER_CREATED', 'user', ${String(user.id)}, 'Administrator created')
  `);

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    active: user.active === 1,
    created_at: user.created_at,
    updated_at: user.updated_at,
    last_login_at: user.last_login_at,
  };
}

export async function login(username: string, password: string): Promise<{
  user: User;
  accessToken: string;
  refreshToken: string;
} | null> {
  const pool = await getPool();

  const users = await pool.query(sql`
    SELECT * FROM users WHERE username = ${username} AND active = 1
  `);

  if (users.length === 0) return null;

  const user = users[0];
  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) return null;

  // Get permissions
  const permissions = await pool.query(sql`
    SELECT p.code FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN roles r ON rp.role_id = r.id
    WHERE r.name = ${user.role}
  `);

  const permissionCodes = permissions.map(p => p.code as Permission);

  // Update last login
  await pool.query(sql`
    UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ${user.id}
  `);

  // Create refresh token
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = await hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await pool.query(sql`
    INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at)
    VALUES (${user.id}, ${refreshTokenHash}, ${expiresAt.toISOString()})
  `);

  // Log audit
  await pool.query(sql`
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
    VALUES (${user.id}, 'USER_LOGIN', 'user', ${String(user.id)}, 'User logged in')
  `);

  const accessToken = generateAccessToken({
    userId: user.id,
    username: user.username,
    role: user.role,
    permissions: permissionCodes,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      active: user.active === 1,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login_at: user.last_login_at,
    },
    accessToken,
    refreshToken,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const pool = await getPool();

  // Find session by checking all hashes (inefficient but OK for small scale)
  const sessions = await pool.query(sql`
    SELECT * FROM user_sessions WHERE expires_at > CURRENT_TIMESTAMP
  `);

  for (const session of sessions) {
    if (await verifyRefreshTokenHash(refreshToken, session.refresh_token_hash)) {
      // Rotate refresh token
      const newRefreshToken = generateRefreshToken();
      const newHash = await hashRefreshToken(newRefreshToken);
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await pool.query(sql`
        UPDATE user_sessions
        SET refresh_token_hash = ${newHash}, expires_at = ${newExpiresAt.toISOString()}, last_used_at = CURRENT_TIMESTAMP
        WHERE id = ${session.id}
      `);

      // Get user and permissions
      const users = await pool.query(sql`SELECT * FROM users WHERE id = ${session.user_id} AND active = 1`);
      if (users.length === 0) return null;

      const user = users[0];
      const permissions = await pool.query(sql`
        SELECT p.code FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN roles r ON rp.role_id = r.id
        WHERE r.name = ${user.role}
      `);

      return generateAccessToken({
        userId: user.id,
        username: user.username,
        role: user.role,
        permissions: permissions.map(p => p.code as Permission),
      });
    }
  }

  return null;
}

export async function logout(refreshToken: string): Promise<void> {
  const pool = await getPool();

  const sessions = await pool.query(sql`SELECT * FROM user_sessions WHERE expires_at > CURRENT_TIMESTAMP`);

  for (const session of sessions) {
    if (await verifyRefreshTokenHash(refreshToken, session.refresh_token_hash)) {
      await pool.query(sql`DELETE FROM user_sessions WHERE id = ${session.id}`);

      await pool.query(sql`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
        VALUES (${session.user_id}, 'USER_LOGOUT', 'user', ${String(session.user_id)}, 'User logged out')
      `);
      break;
    }
  }
}

export async function validateAccessToken(token: string): Promise<JWTPayload | null> {
  return verifyAccessToken(token);
}

export async function getUserById(userId: number): Promise<User | null> {
  const pool = await getPool();

  const users = await pool.query(sql`SELECT * FROM users WHERE id = ${userId} AND active = 1`);
  if (users.length === 0) return null;

  const user = users[0];
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    active: user.active === 1,
    created_at: user.created_at,
    updated_at: user.updated_at,
    last_login_at: user.last_login_at,
  };
}

export async function getAllUsers(): Promise<User[]> {
  const pool = await getPool();

  const users = await pool.query(sql`SELECT * FROM users ORDER BY created_at DESC`);
  return users.map(u => ({
    id: u.id,
    name: u.name,
    username: u.username,
    role: u.role,
    active: u.active === 1,
    created_at: u.created_at,
    updated_at: u.updated_at,
    last_login_at: u.last_login_at,
  }));
}

export async function createUser(input: {
  name: string;
  username: string;
  password: string;
  role: Role;
}): Promise<User> {
  const pool = await getPool();

  const passwordHash = await bcrypt.hash(input.password, 12);

  const result = await pool.query(sql`
    INSERT INTO users (name, username, password_hash, role, active)
    VALUES (${input.name}, ${input.username}, ${passwordHash}, ${input.role}, 1)
    RETURNING id, name, username, role, active, created_at, updated_at, last_login_at
  `);

  const user = result[0];

  await pool.query(sql`
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
    VALUES (${user.id}, 'USER_CREATED', 'user', ${String(user.id)}, 'User created')
  `);

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    active: user.active === 1,
    created_at: user.created_at,
    updated_at: user.updated_at,
    last_login_at: user.last_login_at,
  };
}

export async function updateUser(userId: number, updates: Partial<{
  name: string;
  role: Role;
  active: boolean;
  password: string;
}>): Promise<User | null> {
  const pool = await getPool();

  // Build dynamic update query using sql template
  let query = sql`UPDATE users SET `;
  const updatesToApply: string[] = [];

  if (updates.name !== undefined) {
    updatesToApply.push(`name = ${updates.name}`);
  }
  if (updates.role !== undefined) {
    updatesToApply.push(`role = ${updates.role}`);
  }
  if (updates.active !== undefined) {
    updatesToApply.push(`active = ${updates.active ? 1 : 0}`);
  }
  if (updates.password !== undefined) {
    updatesToApply.push(`password_hash = ${await bcrypt.hash(updates.password, 12)}`);
    // Invalidate all refresh tokens on password change
    await pool.query(sql`DELETE FROM user_sessions WHERE user_id = ${userId}`);
  }

  if (updatesToApply.length === 0) return getUserById(userId);

  updatesToApply.push('updated_at = CURRENT_TIMESTAMP');

  // Build the SET clause dynamically
  query = sql`${query} ${sql.unsafe(updatesToApply.join(', '))} WHERE id = ${userId}`;

  await pool.query(query);

  await pool.query(sql`
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
    VALUES (${userId}, 'USER_UPDATED', 'user', ${String(userId)}, 'User updated')
  `);

  return getUserById(userId);
}

export async function deleteUser(userId: number): Promise<boolean> {
  const pool = await getPool();

  // Check if user has activity
  const invoices = await pool.query(sql`SELECT COUNT(*) as count FROM invoices WHERE created_by = ${userId}`);
  if (invoices[0].count > 0) {
    // Don't delete, just disable
    await updateUser(userId, { active: false });
    return false;
  }

  await pool.query(sql`DELETE FROM user_sessions WHERE user_id = ${userId}`);
  await pool.query(sql`DELETE FROM users WHERE id = ${userId}`);

  await pool.query(sql`
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
    VALUES (${userId}, 'USER_DELETED', 'user', ${String(userId)}, 'User deleted')
  `);

  return true;
}