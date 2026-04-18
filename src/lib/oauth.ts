import { createHash, createSecretKey, randomBytes } from "crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { BASE_URL } from "./constants";

/**
 * OAuth 2.1 primitives: JWT signing and verification, PKCE helpers, scope
 * constants. Kept free of Firestore or request dependencies so it's trivially
 * unit-testable and safe to import from anywhere.
 */

// --- Scopes ---

export const SCOPE_CONTEXT_READ = "context:read";
export const SCOPE_CONTEXT_WRITE = "context:write";
export const SUPPORTED_SCOPES = [SCOPE_CONTEXT_READ, SCOPE_CONTEXT_WRITE] as const;

export function parseScopeString(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw.split(/\s+/).filter((s) => s.length > 0);
}

export function filterSupportedScopes(requested: string[]): string[] {
  return requested.filter((s) => (SUPPORTED_SCOPES as readonly string[]).includes(s));
}

// --- JWT ---

export const JWT_ALG = "HS256";
export const JWT_ISSUER = BASE_URL;
export const JWT_AUDIENCE = `${BASE_URL}/api/mcp`;
export const ACCESS_TOKEN_TTL_SECONDS = 3600; // 1 hour

export interface AccessTokenClaims extends JWTPayload {
  scope: string;
  client_id: string;
}

function getJwtKey() {
  const secret = process.env.OAUTH_JWT_SECRET;
  if (!secret) {
    throw new Error("OAUTH_JWT_SECRET is not set.");
  }
  return createSecretKey(Buffer.from(secret, "utf-8"));
}

export async function signAccessToken(params: {
  subject: string;
  clientId: string;
  scopes: string[];
}): Promise<string> {
  return new SignJWT({ scope: params.scopes.join(" "), client_id: params.clientId })
    .setProtectedHeader({ alg: JWT_ALG })
    .setSubject(params.subject)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getJwtKey());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtKey(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    return payload as AccessTokenClaims;
  } catch {
    return null;
  }
}

// --- PKCE ---

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function verifyPkce(codeVerifier: string, storedChallenge: string, method: string): boolean {
  if (method !== "S256") return false;
  if (!codeVerifier || codeVerifier.length < 43 || codeVerifier.length > 128) return false;
  const computed = base64url(createHash("sha256").update(codeVerifier).digest());
  return computed === storedChallenge;
}

// --- Opaque token generation ---

export function newOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

// --- HTML escaping (for consent page) ---

export function htmlEscape(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
