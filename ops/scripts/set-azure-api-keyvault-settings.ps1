<#
  Ethic-Net production API app settings bootstrap.
  Applies non-secret settings and Key Vault references to API App Service.
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$ResourceGroupName,
  [Parameter(Mandatory = $true)]
  [string]$ApiAppName,
  [Parameter(Mandatory = $true)]
  [string]$KeyVaultName,
  [Parameter(Mandatory = $true)]
  [string]$FrontendUrl,
  [Parameter(Mandatory = $true)]
  [string]$ApiBaseUrl,
  [Parameter(Mandatory = $true)]
  [string]$OrganizerEmail,
  [Parameter(Mandatory = $false)]
  [string]$SecretPrefix = "ethic-net-prod"
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "[Ethic-Net/Azure] $Message" -ForegroundColor Cyan
}

function New-KvReference {
  param([string]$SecretName)
  return "@Microsoft.KeyVault(VaultName=$KeyVaultName;SecretName=$SecretName)"
}

$normalizedApiBase = $ApiBaseUrl.TrimEnd("/")

$settings = @(
  "NODE_ENV=production",
  "PORT=3000",
  "WEBSITES_PORT=3000",
  "AUTH_PROVIDER=microsoft",
  "EMAIL_PROVIDER=microsoft",
  "CALENDAR_PROVIDER=microsoft",
  "STORAGE_PROVIDER=local",
  "FRONTEND_URL=$($FrontendUrl.TrimEnd('/'))",
  "MICROSOFT_AUTH_REDIRECT_URI=$normalizedApiBase/api/auth/microsoft/callback",
  "MICROSOFT_CALENDAR_ORGANIZER_EMAIL=$OrganizerEmail",
  "DATABASE_URL=$(New-KvReference -SecretName 'database-url')",
  "JWT_SECRET_CURRENT=$(New-KvReference -SecretName 'jwt-secret-current')",
  "CALENDAR_TOKEN_ENCRYPTION_KEY=$(New-KvReference -SecretName 'calendar-token-encryption-key')",
  "MICROSOFT_AUTH_CLIENT_SECRET=$(New-KvReference -SecretName "$SecretPrefix-microsoft-auth-client-secret")",
  "MICROSOFT_CALENDAR_CLIENT_SECRET=$(New-KvReference -SecretName "$SecretPrefix-microsoft-calendar-client-secret")",
  "MICROSOFT_MAIL_CLIENT_SECRET=$(New-KvReference -SecretName "$SecretPrefix-microsoft-mail-client-secret")"
)

Write-Step "Applying API app settings to $ApiAppName."
az webapp config appsettings set `
  --resource-group $ResourceGroupName `
  --name $ApiAppName `
  --settings $settings | Out-Null

Write-Step "Ensuring health check and always-on are configured."
az webapp config set `
  --resource-group $ResourceGroupName `
  --name $ApiAppName `
  --always-on true `
  --generic-configurations "{'healthCheckPath':'/api/health'}" | Out-Null

Write-Step "API Key Vault references applied successfully."
