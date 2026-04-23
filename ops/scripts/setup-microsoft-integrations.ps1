param(
  [Parameter(Mandatory = $true)]
  [string]$TenantId,
  [Parameter(Mandatory = $true)]
  [string]$BaseUrl,
  [Parameter(Mandatory = $true)]
  [string]$OrganizerEmail,
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
    [string[]]$RedirectUris
  )

  if ($DryRun) {
    Write-Action "DRY RUN: would create app '$DisplayName'."
    return @{
      appId = "dryrun-app-id-$DisplayName"
      secret = "dryrun-secret-$DisplayName"
    }
  }

  $app = az ad app create --display-name $DisplayName --sign-in-audience AzureADMyOrg --web-redirect-uris $RedirectUris | ConvertFrom-Json
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

$normalizedBase = $BaseUrl.TrimEnd("/")
$msCallback = "$normalizedBase/api/auth/microsoft/callback"

Write-Action "Using callback: $msCallback"
Write-Action "Creating Microsoft SSO app (delegated permissions)."
$sso = New-AppWithSecret -DisplayName "EthicFlow SSO" -RedirectUris @($msCallback)
Set-ApiPermissions -AppId $sso.appId -PermissionIds @(
  "e1fe6dd8-ba31-4d61-89e7-88639da4683d=Scope", # User.Read
  "14dad69e-099b-42c9-810b-d002981feec1=Scope", # profile
  "64a6cdd6-aab1-4aaf-94b8-3cc8405e90d0=Scope", # email
  "37f7f235-527c-4136-accd-4a02d197296e=Scope"  # openid
)

Write-Action "Creating Microsoft Calendar app (application permission)."
$calendar = New-AppWithSecret -DisplayName "EthicFlow Calendar" -RedirectUris @()
Set-ApiPermissions -AppId $calendar.appId -PermissionIds @(
  "ef54d2bf-783f-4e0f-bca1-3210c0444d99=Role" # Calendars.ReadWrite (Application)
)

Write-Action "Creating Microsoft Mail app (application permission)."
$mail = New-AppWithSecret -DisplayName "EthicFlow Mail" -RedirectUris @()
Set-ApiPermissions -AppId $mail.appId -PermissionIds @(
  "b633e1c5-b582-4048-a93e-9f11b44c7e96=Role" # Mail.Send (Application)
)

Write-Host ""
Write-Host "# Paste into production .env"
Write-Host "AUTH_PROVIDER=microsoft"
Write-Host "EMAIL_PROVIDER=microsoft"
Write-Host "CALENDAR_PROVIDER=microsoft"
Write-Host "MICROSOFT_AUTH_CLIENT_ID=$($sso.appId)"
Write-Host "MICROSOFT_AUTH_CLIENT_SECRET=$($sso.secret)"
Write-Host "MICROSOFT_AUTH_TENANT_ID=$TenantId"
Write-Host "MICROSOFT_AUTH_REDIRECT_URI=$msCallback"
Write-Host "MICROSOFT_CALENDAR_CLIENT_ID=$($calendar.appId)"
Write-Host "MICROSOFT_CALENDAR_CLIENT_SECRET=$($calendar.secret)"
Write-Host "MICROSOFT_CALENDAR_TENANT_ID=$TenantId"
Write-Host "MICROSOFT_CALENDAR_ORGANIZER_EMAIL=$OrganizerEmail"
Write-Host "MICROSOFT_MAIL_CLIENT_ID=$($mail.appId)"
Write-Host "MICROSOFT_MAIL_CLIENT_SECRET=$($mail.secret)"
Write-Host "MICROSOFT_MAIL_TENANT_ID=$TenantId"
