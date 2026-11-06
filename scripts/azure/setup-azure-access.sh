#!/usr/bin/env bash
# One-time Azure access setup for ad-nav: the GitHub Actions deploy identity
# and the runtime identity's registry pull right.
# Run by Adam, once, after the `ad-nav` Container App exists. Idempotent.
#
# Creates, on the PicoPouch pattern (`id-picopouch-ci`):
#   - user-assigned identity `id-adnav-ci` in di-website (UK South)
#   - a federated credential trusting this repository's `main` branch only
#   - AcrPush on the shared registry `digitalillumination`
#   - Contributor on the `ad-nav` Container App only (not the resource
#     group, which also holds the DI site's resources)
#   - Reader on the `di-website-env` environment, so `az containerapp update`
#     can read the environment the app lives in
#   - AcrPull on the registry for the app's runtime identity `di-website-app`
#   - GitHub repository variables AZURE_CLIENT_ID, AZURE_TENANT_ID and
#     AZURE_SUBSCRIPTION_ID (ids, not secrets; no GitHub secret is created)
#
# No new monthly cost: identities and role assignments are free.
# Never changes the default az account: every az call names the subscription.
#
# Usage:
#   bash scripts/azure/setup-azure-access.sh

set -euo pipefail

SUB="Digital Illumination"
RG="di-website"
ID_NAME="id-adnav-ci"
APP="ad-nav"
REPO="digital-illumination/ad-nav"

if ! az identity show -n "$ID_NAME" -g "$RG" --subscription "$SUB" --output none 2>/dev/null; then
  az identity create -n "$ID_NAME" -g "$RG" -l uksouth --subscription "$SUB" --output none
  echo "identity $ID_NAME created"
else
  echo "identity $ID_NAME already present"
fi

if ! az identity federated-credential show --identity-name "$ID_NAME" -g "$RG" --subscription "$SUB" \
     -n github-ad-nav-main --output none 2>/dev/null; then
  az identity federated-credential create --identity-name "$ID_NAME" -g "$RG" --subscription "$SUB" \
    -n github-ad-nav-main \
    --issuer https://token.actions.githubusercontent.com \
    --subject "repo:${REPO}:ref:refs/heads/main" \
    --audiences api://AzureADTokenExchange --output none
  echo "federated credential for main created"
else
  echo "federated credential already present"
fi

PRINCIPAL=$(az identity show -n "$ID_NAME" -g "$RG" --subscription "$SUB" --query principalId -o tsv)
CLIENT_ID=$(az identity show -n "$ID_NAME" -g "$RG" --subscription "$SUB" --query clientId -o tsv)
ACR_ID=$(az acr show -n digitalillumination --subscription "$SUB" --query id -o tsv)
APP_ID=$(az containerapp show -n "$APP" -g "$RG" --subscription "$SUB" --query id -o tsv)
ENV_ID=$(az containerapp env show -n di-website-env -g "$RG" --subscription "$SUB" --query id -o tsv)

grant() {
  local role=$1 scope=$2
  if [ -n "$(az role assignment list --assignee-object-id "$PRINCIPAL" --role "$role" --scope "$scope" \
        --subscription "$SUB" --query "[].id" -o tsv)" ]; then
    echo "$role already present"
  else
    # A new identity can take a few seconds to appear to the role service.
    for i in 1 2 3 4 5 6; do
      if az role assignment create --assignee-object-id "$PRINCIPAL" --assignee-principal-type ServicePrincipal \
           --role "$role" --scope "$scope" --subscription "$SUB" --output none 2>/dev/null; then
        echo "$role granted"
        return
      fi
      sleep 10
    done
    echo "could not grant $role; re-run in a minute" >&2
    exit 1
  fi
}
grant AcrPush "$ACR_ID"
grant Contributor "$APP_ID"
grant Reader "$ENV_ID"

# The app runs as the existing identity `di-website-app`, which can read Key
# Vault and Cosmos DB but had no pull right on the registry.
PRINCIPAL=$(az identity show -n di-website-app -g "$RG" --subscription "$SUB" --query principalId -o tsv)
grant AcrPull "$ACR_ID"

gh variable set AZURE_CLIENT_ID --repo "$REPO" --body "$CLIENT_ID"
gh variable set AZURE_TENANT_ID --repo "$REPO" --body "$(az account show --subscription "$SUB" --query tenantId -o tsv)"
gh variable set AZURE_SUBSCRIPTION_ID --repo "$REPO" --body "$(az account show --subscription "$SUB" --query id -o tsv)"
echo "GitHub variables set. Done."
