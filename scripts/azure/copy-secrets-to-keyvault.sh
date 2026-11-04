#!/usr/bin/env bash
# Copy ad-nav's six secrets from Google Secret Manager to Azure Key Vault,
# unchanged, without printing any value. Run by Adam, once, from a shell
# signed in to both `gcloud` and `az`.
#
# What it does:
#   1. Gives the signed-in Azure user "Key Vault Secrets Officer" on
#      di-website-kv (Adam is Owner on the subscription but has no data role
#      on this vault). Skipped if already present.
#   2. Pipes each Google secret straight into `az keyvault secret set` through
#      a private temp file (mode 600, removed on exit). Values never reach the
#      terminal, the process list or shell history.
#   3. Compares a SHA-256 of each side and prints only "match" or "MISMATCH".
#      A stray trailing newline would change MCP_WRITE_TOKEN and break every
#      AdamOS /close, so this check matters.
#
# Read-only on Google. Never changes the default az account: every az call
# names the subscription.
#
# Usage:
#   bash scripts/azure/copy-secrets-to-keyvault.sh
#
# Delete this script when the Google project is shut down.

set -euo pipefail

SUB="Digital Illumination"
VAULT="di-website-kv"
RG="di-website"
GCP_PROJECT="ad-nav"

# Google Secret Manager name -> Key Vault name. Key Vault is shared with the
# DI site, so ad-nav's names carry an `adnav-` prefix.
PAIRS=(
  "mcp-write-token:adnav-mcp-write-token"
  "github-token:adnav-github-token"
  "oauth-jwt-secret:adnav-oauth-jwt-secret"
  "github-oauth-client-id:adnav-github-oauth-client-id"
  "github-oauth-client-secret:adnav-github-oauth-client-secret"
  "openai-api-key:adnav-openai-api-key"
)

TMPDIR_SECRETS=$(mktemp -d)
chmod 700 "$TMPDIR_SECRETS"
trap 'rm -rf "$TMPDIR_SECRETS"' EXIT

TENANT=$(az account show --subscription "$SUB" --query tenantId -o tsv)
VAULT_ID=$(az keyvault show --name "$VAULT" --resource-group "$RG" --subscription "$SUB" --query id -o tsv)

# Signed-in user's object id in the DI tenant, read from an access token's
# `oid` claim (the default az tenant may be a client tenant, so `az ad
# signed-in-user show` could answer for the wrong directory).
MY_OID=$(az account get-access-token --tenant "$TENANT" --query accessToken -o tsv |
  python3 -c 'import sys,json,base64; p=sys.stdin.read().split(".")[1]; p+="="*(-len(p)%4); print(json.loads(base64.urlsafe_b64decode(p))["oid"])')

echo "1. Key Vault Secrets Officer on $VAULT for the signed-in user"
if [ -n "$(az role assignment list --scope "$VAULT_ID" --subscription "$SUB" \
      --assignee-object-id "$MY_OID" --role "Key Vault Secrets Officer" --query "[].id" -o tsv)" ]; then
  echo "   already present"
else
  az role assignment create --scope "$VAULT_ID" --subscription "$SUB" \
    --assignee-object-id "$MY_OID" --assignee-principal-type User \
    --role "Key Vault Secrets Officer" --output none
  echo "   granted; waiting for it to take effect"
fi

# Role assignments take a minute or two to reach the vault's data plane.
for i in $(seq 1 30); do
  if az keyvault secret list --vault-name "$VAULT" --subscription "$SUB" --maxresults 1 --output none 2>/dev/null; then
    break
  fi
  [ "$i" = 30 ] && { echo "   vault still refuses the user after 5 minutes; re-run later" >&2; exit 1; }
  sleep 10
done

sha_google() {
  gcloud secrets versions access latest --secret="$1" --project="$GCP_PROJECT" | shasum -a 256 | cut -d' ' -f1
}
sha_azure() {
  az keyvault secret show --vault-name "$VAULT" --subscription "$SUB" --name "$1" --output json |
    python3 -c 'import sys,json,hashlib; print(hashlib.sha256(json.load(sys.stdin)["value"].encode("utf-8")).hexdigest())'
}

echo "2. Copy and verify"
fail=0
for pair in "${PAIRS[@]}"; do
  src=${pair%%:*}
  dst=${pair#*:}
  f="$TMPDIR_SECRETS/$dst"
  gcloud secrets versions access latest --secret="$src" --project="$GCP_PROJECT" > "$f"
  chmod 600 "$f"
  az keyvault secret set --vault-name "$VAULT" --subscription "$SUB" --name "$dst" \
    --file "$f" --encoding utf-8 --content-type "text/plain" --output none
  rm -f "$f"
  if [ "$(sha_google "$src")" = "$(sha_azure "$dst")" ]; then
    echo "   $dst: match"
  else
    echo "   $dst: MISMATCH"
    fail=1
  fi
done

if [ "$fail" = 0 ]; then
  echo "Done: all six secrets are in $VAULT and match Google byte for byte."
else
  echo "At least one secret does not match; tell Carson before going further." >&2
  exit 1
fi
