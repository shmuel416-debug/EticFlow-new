param(
  [Parameter(Mandatory = $true)]
  [string]$TenantId,
  [Parameter(Mandatory = $true)]
  [string]$BaseUrl,
  [Parameter(Mandatory = $true)]
  [string]$OrganizerEmail,
  [Parameter(Mandatory = $false)]
  [string]$FrontendLogoutUrl,
  [Parameter(Mandatory = $false)]
  [string]$KeyVaultName,
  [Parameter(Mandatory = $false)]
  [string]$SecretPrefix = "ethicflow",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Write-Action {
  param([string]$Message)
  Write-Host "[EthicFlow/Azure] $Message" -ForegroundColor Cyan
}

function New-AppWithSecret {
  param(
    [string]$DisplayName,
    [string[]]$RedirectUris,
    [string]$LogoutUrl
  )

  if ($DryRun) {
    Write-Action "DRY RUN: would create app '$DisplayName'."
    return @{
      appId = "dryrun-app-id-$DisplayName"
      secret = "dryrun-secret-$DisplayName"
    }
  }

  $redirectArgs = @()
  if ($RedirectUris -and $RedirectUris.Count -gt 0) {
    $redirectArgs = @("--web-redirect-uris") + $RedirectUris
  }

  $app = az ad app create --display-name $DisplayName --sign-in-audience AzureADMyOrg @redirectArgs | ConvertFrom-Json

  if ($LogoutUrl) {
    az ad app update --id $app.appId --web-logout-url $LogoutUrl | Out-Null
  }

  $secret = az ad app credential reset --id $app.appId --append --display-name "ethicflow-secret" | ConvertFrom-Json
  return @{
    appId = $app.appId
    secret = $secret.password
  }
}

function Set-ApiPermissions {
  param(
    [string]$AppId,
    [string[]]$PermissionIds
  )

  foreach ($permissionId in $PermissionIds) {
    if ($DryRun) {
      Write-Action "DRY RUN: would add Graph permission '$permissionId' to '$AppId'."
      continue
    }
    az ad app permission add --id $AppId --api 00000003-0000-0000-c000-000000000000 --api-permissions $permissionId | Out-Null
  }

  if (-not $DryRun) {
    az ad app permission admin-consent --id $AppId | Out-Null
  }
}

function Set-KeyVaultSecret {
  param(
    [string]$VaultName,
    [string]$SecretName,
    [string]$SecretValue
  )
  if ([string]::IsNullOrWhiteSpace($VaultName)) {
    return
  }
  if ($DryRun) {
    Write-Action "DRY RUN: would set Key Vault secret '$SecretName'."
    return
  }
  az keyvault secret set --vault-name $VaultName --name $SecretName --value $SecretValue | Out-Null
}

$normalizedBase = $BaseUrl.TrimEnd("/")
$msCallback = "$normalizedBase/api/auth/microsoft/callback"
$resolvedLogoutUrl = if ([string]::IsNullOrWhiteSpace($FrontendLogoutUrl)) {
  "$normalizedBase/login"
} else {
  $FrontendLogoutUrl.TrimEnd("/")
}

Write-Action "Using callback: $msCallback"
Write-Action "Using front-channel logout URL: $resolvedLogoutUrl"
Write-Action "Creating Microsoft SSO app (delegated permissions)."
$sso = New-AppWithSecret -DisplayName "EthicFlow SSO" -RedirectUris @($msCallback) -LogoutUrl $resolvedLogoutUrl
Set-ApiPermissions -AppId $sso.appId -PermissionIds @(
  "e1fe6dd8-ba31-4d61-89e7-88639da4683d=Scope", # User.Read
  "14dad69e-099b-42c9-810b-d002981feec1=Scope", # profile
  "64a6cdd6-aab1-4aaf-94b8-3cc8405e90d0=Scope", # email
  "37f7f235-527c-4136-accd-4a02d197296e=Scope"  # openid
)

Write-Action "Creating Microsoft Calendar app (application permission)."
$calendar = New-AppWithSecret -DisplayName "EthicFlow Calendar" -RedirectUris @() -LogoutUrl ""
Set-ApiPermissions -AppId $calendar.appId -PermissionIds @(
  "ef54d2bf-783f-4e0f-bca1-3210c0444d99=Role" # Calendars.ReadWrite (Application)
)

Write-Action "Creating Microsoft Mail app (application permission)."
$mail = New-AppWithSecret -DisplayName "EthicFlow Mail" -RedirectUris @() -LogoutUrl ""
Set-ApiPermissions -AppId $mail.appId -PermissionIds @(
  "b633e1c5-b582-4048-a93e-9f11b44c7e96=Role" # Mail.Send (Application)
)

$envValues = [ordered]@{
  AUTH_PROVIDER = "microsoft"
  EMAIL_PROVIDER = "microsoft"
  CALENDAR_PROVIDER = "microsoft"
  MICROSOFT_AUTH_CLIENT_ID = $sso.appId
  MICROSOFT_AUTH_CLIENT_SECRET = $sso.secret
  MICROSOFT_AUTH_TENANT_ID = $TenantId
  MICROSOFT_AUTH_REDIRECT_URI = $msCallback
  MICROSOFT_CALENDAR_CLIENT_ID = $calendar.appId
  MICROSOFT_CALENDAR_CLIENT_SECRET = $calendar.secret
  MICROSOFT_CALENDAR_TENANT_ID = $TenantId
  MICROSOFT_CALENDAR_ORGANIZER_EMAIL = $OrganizerEmail
  MICROSOFT_MAIL_CLIENT_ID = $mail.appId
  MICROSOFT_MAIL_CLIENT_SECRET = $mail.secret
  MICROSOFT_MAIL_TENANT_ID = $TenantId
}

if (-not [string]::IsNullOrWhiteSpace($KeyVaultName)) {
  Write-Action "Writing generated secrets to Key Vault '$KeyVaultName'."
  Set-KeyVaultSecret -VaultName $KeyVaultName -SecretName "$SecretPrefix-microsoft-auth-client-secret" -SecretValue $sso.secret
  Set-KeyVaultSecret -VaultName $KeyVaultName -SecretName "$SecretPrefix-microsoft-calendar-client-secret" -SecretValue $calendar.secret
  Set-KeyVaultSecret -VaultName $KeyVaultName -SecretName "$SecretPrefix-microsoft-mail-client-secret" -SecretValue $mail.secret
}

Write-Host ""
Write-Host "# Paste into production app settings (single-tenant)"
foreach ($entry in $envValues.GetEnumerator()) {
  if (-not [string]::IsNullOrWhiteSpace($KeyVaultName) -and $entry.Key.EndsWith("_SECRET")) {
    $secretName = switch ($entry.Key) {
      "MICROSOFT_AUTH_CLIENT_SECRET" { "$SecretPrefix-microsoft-auth-client-secret" }
      "MICROSOFT_CALENDAR_CLIENT_SECRET" { "$SecretPrefix-microsoft-calendar-client-secret" }
      "MICROSOFT_MAIL_CLIENT_SECRET" { "$SecretPrefix-microsoft-mail-client-secret" }
      default { "<stored-in-key-vault>" }
    }
    Write-Host "$($entry.Key)=@Microsoft.KeyVault(VaultName=$KeyVaultName;SecretName=$secretName)"
  } else {
    Write-Host "$($entry.Key)=$($entry.Value)"
  }
}

if (-not [string]::IsNullOrWhiteSpace($KeyVaultName)) {
  Write-Host ""
  Write-Host "# Key Vault secret names created"
  Write-Host "$SecretPrefix-microsoft-auth-client-secret"
  Write-Host "$SecretPrefix-microsoft-calendar-client-secret"
  Write-Host "$SecretPrefix-microsoft-mail-client-secret"
}
