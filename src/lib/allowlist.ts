/**
 * Allowlist of GitHub logins permitted to authenticate against this server.
 *
 * Configured via the `OAUTH_ALLOWLIST` env var: a comma-separated list of
 * GitHub logins (case-insensitive match). Empty or unset = nobody is allowed.
 * This is deliberate: if the server forgets to set an allowlist, it must fail
 * closed, not open.
 */

export function getAllowlist(): string[] {
  const raw = process.env.OAUTH_ALLOWLIST ?? "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

export function isAllowed(githubLogin: string): boolean {
  const list = getAllowlist();
  if (list.length === 0) return false;
  return list.includes(githubLogin.toLowerCase());
}
