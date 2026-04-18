import { getFirestore } from "./firestore";
import { newOpaqueToken } from "./oauth";

/**
 * Firestore-backed storage for OAuth 2.1 artefacts: registered clients,
 * authorization codes, and refresh tokens.
 *
 * Collections:
 *   oauth_clients         — registered OAuth clients (from dynamic registration)
 *   oauth_codes           — short-lived authorization codes (single-use)
 *   oauth_refresh_tokens  — longer-lived refresh tokens
 */

const CLIENTS = "oauth_clients";
const CODES = "oauth_codes";
const REFRESH = "oauth_refresh_tokens";

// --- Clients ---

export interface RegisteredClient {
  client_id: string;
  client_name: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
  scope?: string;
  software_id?: string;
  software_version?: string;
  created_at: number;
}

export async function createClient(params: {
  client_name: string;
  redirect_uris: string[];
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: string;
  scope?: string;
  software_id?: string;
  software_version?: string;
}): Promise<RegisteredClient> {
  const client_id = newOpaqueToken(24);
  const client: RegisteredClient = {
    client_id,
    client_name: params.client_name,
    redirect_uris: params.redirect_uris,
    grant_types: params.grant_types ?? ["authorization_code", "refresh_token"],
    response_types: params.response_types ?? ["code"],
    token_endpoint_auth_method: params.token_endpoint_auth_method ?? "none",
    scope: params.scope,
    software_id: params.software_id,
    software_version: params.software_version,
    created_at: Date.now(),
  };
  await getFirestore().collection(CLIENTS).doc(client_id).set(client);
  return client;
}

export async function readClient(client_id: string): Promise<RegisteredClient | null> {
  const doc = await getFirestore().collection(CLIENTS).doc(client_id).get();
  if (!doc.exists) return null;
  return doc.data() as RegisteredClient;
}

// --- Authorization codes ---

export interface StoredCode {
  code: string;
  client_id: string;
  subject: string; // github login of the user
  scopes: string[];
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  expires_at: number;
  used: boolean;
}

const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function createCode(params: {
  client_id: string;
  subject: string;
  scopes: string[];
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
}): Promise<StoredCode> {
  const code = newOpaqueToken(32);
  const doc: StoredCode = {
    code,
    client_id: params.client_id,
    subject: params.subject,
    scopes: params.scopes,
    redirect_uri: params.redirect_uri,
    code_challenge: params.code_challenge,
    code_challenge_method: params.code_challenge_method,
    expires_at: Date.now() + CODE_TTL_MS,
    used: false,
  };
  await getFirestore().collection(CODES).doc(code).set(doc);
  return doc;
}

/**
 * Atomically fetch and consume an authorization code. Returns null if the code
 * doesn't exist, is expired, or has already been used.
 */
export async function consumeCode(code: string): Promise<StoredCode | null> {
  const firestore = getFirestore();
  const ref = firestore.collection(CODES).doc(code);

  let consumed: StoredCode | null = null;
  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const data = snap.data() as StoredCode | undefined;
    if (!data) return;
    if (data.used) return;
    if (data.expires_at < Date.now()) return;

    tx.update(ref, { used: true });
    consumed = data;
  });
  return consumed;
}

// --- Refresh tokens ---

export interface StoredRefreshToken {
  token: string;
  client_id: string;
  subject: string;
  scopes: string[];
  created_at: number;
  expires_at: number;
  revoked: boolean;
}

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function createRefreshToken(params: {
  client_id: string;
  subject: string;
  scopes: string[];
}): Promise<StoredRefreshToken> {
  const token = newOpaqueToken(48);
  const now = Date.now();
  const doc: StoredRefreshToken = {
    token,
    client_id: params.client_id,
    subject: params.subject,
    scopes: params.scopes,
    created_at: now,
    expires_at: now + REFRESH_TTL_MS,
    revoked: false,
  };
  await getFirestore().collection(REFRESH).doc(token).set(doc);
  return doc;
}

/**
 * Rotate a refresh token: verify, revoke the old one, issue a new one.
 * Returns the new token on success, or null if the old token is missing,
 * expired, or already revoked.
 */
export async function rotateRefreshToken(oldToken: string): Promise<StoredRefreshToken | null> {
  const firestore = getFirestore();
  const ref = firestore.collection(REFRESH).doc(oldToken);

  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data() as StoredRefreshToken | undefined;
  if (!data) return null;
  if (data.revoked) return null;
  if (data.expires_at < Date.now()) return null;

  await ref.update({ revoked: true });

  return createRefreshToken({
    client_id: data.client_id,
    subject: data.subject,
    scopes: data.scopes,
  });
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await getFirestore()
    .collection(REFRESH)
    .doc(token)
    .update({ revoked: true })
    .catch(() => {});
}
