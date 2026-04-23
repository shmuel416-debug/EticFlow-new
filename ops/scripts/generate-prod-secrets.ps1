param(
  [Parameter(Mandatory = $true)]
  [string]$FrontendUrl,
  [Parameter(Mandatory = $false)]
  [int]$AuthExchangeTtlMs = 90000,
  [Parameter(Mandatory = $false)]
  [string]$KeyVaultName
)

$ErrorActionPreference = "Stop"

function New-HexSecret {
  param([int]$Length)
  [byte[]]$buffer = New-Object byte[] $Length
  [System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($buffer)
  return -join ($buffer | ForEach-Object { $_.ToString("x2") })
}

function New-Base64Secret {
  param([int]$Length)
  [byte[]]$buffer = New-Object byte[] $Length
  [System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($buffer)
  return [Convert]::ToBase64String($buffer)
}

$jwtSecretCurrent = New-HexSecret -Length 48
$dbPassword = New-Base64Secret -Length 24
$calendarKey = New-HexSecret -Length 32

Write-Host "# Production secret bundle (store in secret manager / Key Vault, not git)"
Write-Host "JWT_SECRET_CURRENT=$jwtSecretCurrent"
Write-Host "JWT_SECRET_PREVIOUS="
Write-Host "JWT_SECRET_VERSION=v1"
Write-Host "DB_PASSWORD=$dbPassword"
Write-Host "CALENDAR_TOKEN_ENCRYPTION_KEY=$calendarKey"
Write-Host "FRONTEND_URL=$($FrontendUrl.TrimEnd('/'))"
Write-Host "AUTH_EXCHANGE_TTL_MS=$AuthExchangeTtlMs"

if ($KeyVaultName) {
  Write-Host "# Writing secrets into Azure Key Vault: $KeyVaultName"
  az keyvault secret set --vault-name $KeyVaultName --name "jwt-secret-current" --value $jwtSecretCurrent | Out-Null
  az keyvault secret set --vault-name $KeyVaultName --name "db-password" --value $dbPassword | Out-Null
  az keyvault secret set --vault-name $KeyVaultName --name "calendar-token-encryption-key" --value $calendarKey | Out-Null
  Write-Host "Key Vault upload complete."
}
