import { randomUUID } from "node:crypto";

const SESSION_TTL_MS = Number(process.env.TERMINAL_SESSION_TTL_MS || 30 * 60 * 1000);

/**
 * In-memory registry for free-tier deployment.
 * For multi-instance deployment replace by Redis/Postgres.
 */
export class SessionManager {
  constructor() {
    this.sessions = new Map();
  }

  create(userId) {
    const sessionId = randomUUID();
    const now = Date.now();
    const session = {
      sessionId,
      userId,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
      containerName: `bxf-${userId.slice(0, 8)}-${sessionId.slice(0, 8)}`,
      status: "creating"
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  get(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }
    return session;
  }

  touch(sessionId) {
    const session = this.get(sessionId);
    if (!session) return null;
    session.expiresAt = Date.now() + SESSION_TTL_MS;
    return session;
  }

  close(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.status = "closed";
    this.sessions.delete(sessionId);
  }

  forEach(callback) {
    this.sessions.forEach(callback);
  }
}
