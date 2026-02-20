import fs from 'fs/promises';
import path from 'path';

const STORE_PATH = path.join(process.cwd(), 'waitlist_store.json');

type Entry = { email: string; ip?: string; userAgent?: string; createdAt: string };

async function readStore(): Promise<Entry[]> {
  try {
    const txt = await fs.readFile(STORE_PATH, 'utf-8');
    return JSON.parse(txt) as Entry[];
  } catch (e) {
    return [];
  }
}

async function writeStore(entries: Entry[]) {
  await fs.writeFile(STORE_PATH, JSON.stringify(entries, null, 2), 'utf-8');
}

export async function existsEmail(email: string) {
  const entries = await readStore();
  return entries.some(e => e.email.toLowerCase() === email.toLowerCase());
}

export async function addEntry(email: string, ip?: string, userAgent?: string) {
  const entries = await readStore();
  const now = new Date().toISOString();
  const entry: Entry = { email, ip, userAgent, createdAt: now };
  entries.push(entry);
  await writeStore(entries);
  return entry;
}
