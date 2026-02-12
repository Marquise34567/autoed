/**
 * In-memory session store (demo)
 * TODO: Replace with real session store (database, Redis, etc.)
 */

interface Session {
  userId: string;
  expiresAt: number;
}

const sessions = new Map<string, Session>();

export function setSession(token: string, userId: string, expiresAt: number) {
  sessions.set(token, { userId, expiresAt });
}

export function getSessionUser(token: string): string | null {
  const session = sessions.get(token);
  if (!session) return null;

  // Check if expired
  if (session.expiresAt < Math.floor(Date.now() / 1000)) {
    sessions.delete(token);
    return null;
  }

  return session.userId;
}

export function deleteSession(token: string) {
  sessions.delete(token);
}

// Cleanup expired sessions periodically
setInterval(() => {
  const now = Math.floor(Date.now() / 1000);
  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt < now) {
      sessions.delete(token);
    }
  }
}, 60 * 60 * 1000); // Every hour
