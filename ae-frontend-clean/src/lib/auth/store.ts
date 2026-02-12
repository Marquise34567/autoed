/**
 * Simple in-memory auth store (demo/stub)
 * TODO: Replace with real database when auth is finalized
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: number;
}

const STORE_FILE = path.join(process.cwd(), 'tmp', 'auth_users.json');

async function ensureStore() {
  try {
    await fs.access(STORE_FILE);
  } catch {
    await fs.mkdir(path.dirname(STORE_FILE), { recursive: true });
    await fs.writeFile(STORE_FILE, JSON.stringify({}));
  }
}

export async function getUser(email: string): Promise<StoredUser | null> {
  try {
    await ensureStore();
    const data = await fs.readFile(STORE_FILE, 'utf-8');
    const users: Record<string, StoredUser> = JSON.parse(data);
    return users[email] || null;
  } catch {
    return null;
  }
}

export async function createUser(
  email: string,
  passwordHash: string
): Promise<StoredUser> {
  await ensureStore();
  const data = await fs.readFile(STORE_FILE, 'utf-8');
  const users: Record<string, StoredUser> = JSON.parse(data);

  const newUser: StoredUser = {
    id: crypto.randomUUID(),
    email,
    passwordHash,
    createdAt: Math.floor(Date.now() / 1000),
  };

  users[email] = newUser;
  await fs.writeFile(STORE_FILE, JSON.stringify(users, null, 2));

  return newUser;
}

/**
 * Hash a password using a simple algorithm
 * TODO: Use bcrypt in production
 */
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

/**
 * Generate a session token
 * TODO: Use JWT or similar in production
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
