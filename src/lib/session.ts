import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { getFirestore } from "./firestore";

/**
 * User-facing browser session.
 *
 * Session IDs are random 32-byte hex strings. Session data lives in Firestore
 * (collection: `sessions`), and the browser holds only the opaque ID in a
 * cookie. This means signout is a Firestore delete, not a client-side action.
 */

export const SESSION_COOKIE = "adnav_session";
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

  await getFirestore().collection("sessions").doc(id).set({
    githubLogin: session.githubLogin,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
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

  const doc = await getFirestore().collection("sessions").doc(c.value).get();
  if (!doc.exists) return null;

  const data = doc.data() as { githubLogin: string; createdAt: number; expiresAt: number } | undefined;
  if (!data) return null;
  if (data.expiresAt < Date.now()) {
    // Best-effort cleanup; don't block the caller.
    await getFirestore().collection("sessions").doc(c.value).delete().catch(() => {});
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
    await getFirestore().collection("sessions").doc(c.value).delete().catch(() => {});
  }
  cookieStore.delete(SESSION_COOKIE);
}
