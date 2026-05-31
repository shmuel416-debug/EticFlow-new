# Ethic-Net Azure App Service Baseline

This baseline deploys a stable production foundation for Ethic-Net on Azure:

- Linux App Service Plan (PremiumV3)
- Backend App Service (container)
- Frontend App Service (container)
- Azure Container Registry (ACR)
- PostgreSQL Flexible Server (private networking)
- Storage account + Azure File Shares for `uploads` and `generated`
- Key Vault (RBAC mode)
- Log Analytics + Application Insights

## 1) Prerequisites

- Azure subscription with rights to create resource groups and role assignments
- Azure CLI + Bicep:
  - `az version`
  - `az bicep version`
- Logged in and targeting the correct subscription:

```bash
az login
az account set --subscription "<SUBSCRIPTION_ID>"
```

## 2) Deploy infrastructure

```bash
cd infra/azure/appservice
cp parameters.example.json parameters.prod.json
# edit parameters.prod.json values
az group create --name "rg-ethic-net-prod" --location "westeurope"
az deployment group create \
  --resource-group "rg-ethic-net-prod" \
  --template-file "main.bicep" \
  --parameters "@parameters.prod.json"
```

## 3) Build and push images to ACR

```bash
ACR_NAME="acrethic-netprod"
TAG="$(git rev-parse --short HEAD)"

az acr login --name "$ACR_NAME"
docker build -t "$ACR_NAME.azurecr.io/ethic-net-api:$TAG" ./backend
docker build -t "$ACR_NAME.azurecr.io/ethic-net-web:$TAG" ./frontend
docker push "$ACR_NAME.azurecr.io/ethic-net-api:$TAG"
docker push "$ACR_NAME.azurecr.io/ethic-net-web:$TAG"
```

Then update app settings:

- `DOCKER_CUSTOM_IMAGE_NAME` for API and Web (or redeploy via workflow)
- `imageTag` parameter if you redeploy infra from Bicep

## 4) Microsoft integrations (single-tenant)

Run:

```bash
pwsh ./ops/scripts/setup-microsoft-integrations.ps1 \
  -TenantId "<TENANT_GUID>" \
  -BaseUrl "https://api.ethics.<institution>.ac.il" \
  -OrganizerEmail "ethics@<institution>.ac.il" \
  -FrontendLogoutUrl "https://ethics.<institution>.ac.il/login" \
  -KeyVaultName "kv-ethic-net-prod" \
  -SecretPrefix "ethic-net-prod"
```

The script creates:

- `Ethic-Net SSO` (delegated: openid/profile/email/User.Read)
- `Ethic-Net Mail` (application: Mail.Send)
- `Ethic-Net Calendar` (application: Calendars.ReadWrite)

All apps are created as **single-tenant** (`AzureADMyOrg`).

## 5) Post-deploy checklist

- Configure custom domains:
  - `ethics.<institution>.ac.il` -> web app
  - `api.ethics.<institution>.ac.il` -> api app
- Enable Managed Certificates for both domains
- Set deployment slot `staging` for both app services
- Set health check path on API: `/api/health`
- Run smoke checks:
  - `backend/tests/manual/sso-production-smoke.mjs`
  - login via Microsoft from the production login page
- Confirm `database-url` secret exists in Key Vault (created by Bicep), and API app setting `DATABASE_URL` references it.
- Recommended helper scripts:
  - `ops/scripts/configure-appservice-domains.ps1`
  - `ops/scripts/set-azure-api-keyvault-settings.ps1`
  - `ops/scripts/run-azure-slot-rollback-drill.ps1`

## 6) Environment strategy (recommended)

- Use `staging` slots for cloud DEV/UAT validation.
- Keep `production` slot for live traffic only.
- First release of each cycle should run with no auto-swap, then swap manually after approval.

## 7) Notes

- Current backend storage provider is local-only in code. This baseline persists files using mounted Azure File Shares at `/app/uploads` and `/app/generated`.
- Move app secrets to Key Vault references in App Settings before go-live.
