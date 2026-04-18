import { randomBytes } from "crypto";
import { BASE_URL } from "./constants";

/**
 * Minimal GitHub OAuth client for identifying the current user.
 *
 * We use GitHub only as an upstream identity provider for Adam's MCP server.
 * The `read:user` scope is sufficient to retrieve the authenticated user's
 * login, which we then match against the allowlist.
 */

export const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
export const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
export const GITHUB_USER_URL = "https://api.github.com/user";

export const GITHUB_CALLBACK_PATH = "/api/oauth/callback/github";

export function githubCallbackUrl(): string {
  return `${BASE_URL}${GITHUB_CALLBACK_PATH}`;
}

function clientCredentials(): { id: string; secret: string } {
  const id = process.env.GITHUB_OAUTH_CLIENT_ID;
  const secret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error(
      "GitHub OAuth is not configured: set GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET."
    );
  }
  return { id, secret };
}

export function newOAuthState(): string {
  return randomBytes(24).toString("hex");
}

export function buildAuthorizeUrl(state: string): string {
  const { id } = clientCredentials();
  const url = new URL(GITHUB_AUTHORIZE_URL);
  url.searchParams.set("client_id", id);
  url.searchParams.set("redirect_uri", githubCallbackUrl());
  url.searchParams.set("scope", "read:user");
  url.searchParams.set("state", state);
  url.searchParams.set("allow_signup", "false");
  return url.toString();
}

interface TokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const { id, secret } = clientCredentials();
  const body = new URLSearchParams({
    client_id: id,
    client_secret: secret,
    code,
    redirect_uri: githubCallbackUrl(),
  });

  const res = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "ad-nav-oauth",
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`GitHub token exchange failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as TokenResponse;
  if (data.error || !data.access_token) {
    throw new Error(
      `GitHub token exchange error: ${data.error ?? "missing access_token"}${
        data.error_description ? ` (${data.error_description})` : ""
      }`
    );
  }

  return data.access_token;
}

export interface GitHubUser {
  login: string;
  id: number;
  name: string | null;
  email: string | null;
}

export async function fetchGithubUser(accessToken: string): Promise<GitHubUser> {
  const res = await fetch(GITHUB_USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "ad-nav-oauth",
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub /user fetch failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as GitHubUser;
  if (!data.login) {
    throw new Error("GitHub /user response missing login");
  }
  return data;
}
