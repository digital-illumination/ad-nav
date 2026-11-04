import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { getContainer, readItem, ttlFor } from "./cosmos";

/**
 * User-facing browser session.
 *
 * Session IDs are random 32-byte hex strings. Session data lives in Cosmos DB
 * (container: `sessions`), and the browser holds only the opaque ID in a
 * cookie. This means signout is a Cosmos delete, not a client-side action.
 */

export const SESSION_COOKIE = "adnav_session";
const SESSIONS = "sessions";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export interface Session {
  id: string;
  githubLogin: string;
  createdAt: number;
  expiresAt: number;
}

function newSessionId(): string {
  return randomBytes(32).toString("hex");
}

export async function createSession(githubLogin: string): Promise<Session> {
  const id = newSessionId();
  const now = Date.now();
  const session: Session = {
    id,
    githubLogin,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };

  await getContainer(SESSIONS).items.upsert({
    id,
    githubLogin: session.githubLogin,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    ttl: ttlFor(session.expiresAt),
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, id, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(session.expiresAt),
  });

  return session;
}

export async function readSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const c = cookieStore.get(SESSION_COOKIE);
  if (!c?.value) return null;

  const data = await readItem<{ githubLogin: string; createdAt: number; expiresAt: number }>(
    SESSIONS,
    c.value
  );
  if (!data) return null;
  if (data.expiresAt < Date.now()) {
    // Best-effort cleanup; don't block the caller.
    await getContainer(SESSIONS).item(c.value, c.value).delete().catch(() => {});
    return null;
  }

  return {
    id: c.value,
    githubLogin: data.githubLogin,
    createdAt: data.createdAt,
    expiresAt: data.expiresAt,
  };
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const c = cookieStore.get(SESSION_COOKIE);
  if (c?.value) {
    await getContainer(SESSIONS).item(c.value, c.value).delete().catch(() => {});
  }
  cookieStore.delete(SESSION_COOKIE);
}
