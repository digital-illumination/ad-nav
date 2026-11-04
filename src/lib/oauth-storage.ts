import { clean, cosmosStatus, getContainer, readItem, ttlFor } from "./cosmos";
import { newOpaqueToken } from "./oauth";

/**
 * Cosmos DB storage for OAuth 2.1 artefacts: registered clients,
 * authorization codes, and refresh tokens. Each document's Cosmos `id` (and
 * partition key) is the client id, code or token itself, so every read is a
 * point read. The `id` and Cosmos system fields are stripped on read.
 *
 * Containers:
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
  await getContainer(CLIENTS).items.upsert({ ...client, id: client_id });
  return client;
}

export async function readClient(client_id: string): Promise<RegisteredClient | null> {
  return readItem<RegisteredClient>(CLIENTS, client_id);
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
  await getContainer(CODES).items.upsert({ ...doc, id: code, ttl: ttlFor(doc.expires_at) });
  return doc;
}

/**
 * Atomically fetch and consume an authorization code. Returns null if the code
 * doesn't exist, is expired, or has already been used.
 *
 * One-use under concurrency: the `used: true` write is a replace conditioned
 * on the etag that was read. If another request consumed the code in between,
 * Cosmos answers 412 Precondition Failed and this call returns null, so
 * exactly one caller ever gets the code back.
 */
export async function consumeCode(code: string): Promise<StoredCode | null> {
  const item = getContainer(CODES).item(code, code);

  let resource: Record<string, unknown> | undefined;
  try {
    ({ resource } = await item.read());
  } catch (err) {
    if (cosmosStatus(err) === 404) return null;
    throw err;
  }
  if (!resource) return null;
  const etag = resource._etag as string | undefined;
  const data = clean<StoredCode>(resource);
  if (data.used) return null;
  if (data.expires_at < Date.now()) return null;
  if (!etag) return null;

  try {
    await item.replace(
      { ...resource, used: true },
      { accessCondition: { type: "IfMatch", condition: etag } }
    );
  } catch (err) {
    if (cosmosStatus(err) === 412 || cosmosStatus(err) === 404) return null;
    throw err;
  }
  return data;
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
  await getContainer(REFRESH).items.upsert({ ...doc, id: token, ttl: ttlFor(doc.expires_at) });
  return doc;
}

/**
 * Rotate a refresh token: verify, revoke the old one, issue a new one.
 * Returns the new token on success, or null if the old token is missing,
 * expired, or already revoked.
 *
 * `scopesOverride` replaces the rotated token's scopes instead of carrying
 * the old ones forward. Used by the token endpoint to heal grants that were
 * issued read-only before the default-scope change: clients refresh rather
 * than re-authorise, so without an override a read-only grant would rotate
 * read-only forever.
 */
export async function rotateRefreshToken(
  oldToken: string,
  scopesOverride?: string[]
): Promise<StoredRefreshToken | null> {
  const data = await readItem<StoredRefreshToken>(REFRESH, oldToken);
  if (!data) return null;
  if (data.revoked) return null;
  if (data.expires_at < Date.now()) return null;

  await getContainer(REFRESH)
    .item(oldToken, oldToken)
    .patch([{ op: "set", path: "/revoked", value: true }]);

  return createRefreshToken({
    client_id: data.client_id,
    subject: data.subject,
    scopes: scopesOverride ?? data.scopes,
  });
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await getContainer(REFRESH)
    .item(token, token)
    .patch([{ op: "set", path: "/revoked", value: true }])
    .catch(() => {});
}
