<#
.SYNOPSIS
  EthicFlow hybrid Microsoft integrations setup.

.DESCRIPTION
  Provisions the SSO App in the current (login/users) tenant and wires the
  Mail and Calendar Apps that JCT IT pre-created in a different tenant
  (e.g. jct.ac.il for ethicscommittee@jct.ac.il branding).

  Steps performed:
    1. Verify the currently active az session matches -SsoTenantId.
    2. Create or reuse the "EthicFlow SSO" App registration in the SSO
       tenant (delegated User.Read/profile/email/openid).
    3. Generate (or rotate) the SSO client secret.
    4. Write the SSO + Mail + Calendar client secrets to Azure Key Vault.
    5. Apply the public IDs and tenant IDs to the API App Service so the
       runtime knows which tenant to call for each capability.

  This script REPLACES the legacy single-tenant variant. Prior versions
  created Mail and Calendar Apps locally; that is no longer permitted
  because the mailbox lives in the JCT IT-controlled tenant.

  Required Azure permissions:
    * Application Developer in the SSO tenant (PIM-eligible is fine).
    * Contributor on the resource group hosting the API App + Key Vault.
    * Key Vault Secrets Officer (or higher) on the target Key Vault.

.PARAMETER SsoTenantId
  Tenant ID where the SSO App will be created. Must match the tenant of
  the currently active az session (e.g. acad.jct.ac.il tenant).

.PARAMETER ApiBaseUrl
  Public API base URL used for the SSO redirect URI
  (e.g. https://api.ethics.jct.ac.il).

.PARAMETER FrontendLogoutUrl
  Optional. Front-channel logout URL registered on the SSO App.
  Defaults to "$ApiBaseUrl/login".

.PARAMETER MailClientId
  Mail App registration's Application (client) ID, provided by JCT IT
  (lives in jct.ac.il tenant, restricted to ethicscommittee mailbox).

.PARAMETER MailClientSecret
  Mail App client secret value, provided by JCT IT.

.PARAMETER MailTenantId
  Tenant ID where the Mail App was created (usually jct.ac.il's tenant).

.PARAMETER CalendarClientId
  Calendar App registration's Application (client) ID, provided by JCT IT.

.PARAMETER CalendarClientSecret
  Calendar App client secret value, provided by JCT IT.

.PARAMETER CalendarTenantId
  Tenant ID where the Calendar App was created.

.PARAMETER OrganizerEmail
  Mailbox used as Calendar organizer (e.g. ethicscommittee@jct.ac.il).

.PARAMETER ResourceGroupName
  Azure RG containing the API App Service and the Key Vault.

.PARAMETER ApiAppName
  API App Service name to receive the public ID/tenant settings.

.PARAMETER KeyVaultName
  Key Vault name where client secrets will be written.

.PARAMETER SecretPrefix
  Prefix for Key Vault secret names. Must match the value used by
  set-azure-api-keyvault-settings.ps1. Default: "ethicflow-prod".

.PARAMETER SsoAppId
  Optional. If provided, skips SSO App creation and rotates the secret
  on the existing App instead. Used for re-runs or rotations.

.PARAMETER SkipApiSettings
  Switch. If set, only writes secrets to Key Vault and does NOT update
  App Service settings. Useful when the App Service is owned by another
  pipeline and runtime settings are applied separately.

.PARAMETER DryRun
  Switch. Prints actions without making any Azure changes.

.EXAMPLE
  pwsh ./ops/scripts/setup-microsoft-integrations.ps1 `
    -SsoTenantId "7b410031-6333-4080-9e61-afdbd57b3bd9" `
    -ApiBaseUrl "https://api.ethics.jct.ac.il" `
    -MailClientId "<from-IT>" `
    -MailClientSecret "<from-IT>" `
    -MailTenantId "<jct-tenant-id>" `
    -CalendarClientId "<from-IT>" `
    -CalendarClientSecret "<from-IT>" `
    -CalendarTenantId "<jct-tenant-id>" `
    -OrganizerEmail "ethicscommittee@jct.ac.il" `
    -ResourceGroupName "RG-ethics-net" `
    -ApiAppName "app-ethics-net-api" `
    -KeyVaultName "kv-ethics-net"
#>
param(
  [Parameter(Mandatory = $true)] [string]$SsoTenantId,
  [Parameter(Mandatory = $true)] [string]$ApiBaseUrl,
  [Parameter(Mandatory = $false)] [string]$FrontendLogoutUrl,

  [Parameter(Mandatory = $true)] [string]$MailClientId,
  [Parameter(Mandatory = $true)] [string]$MailClientSecret,
  [Parameter(Mandatory = $true)] [string]$MailTenantId,

  [Parameter(Mandatory = $true)] [string]$CalendarClientId,
  [Parameter(Mandatory = $true)] [string]$CalendarClientSecret,
  [Parameter(Mandatory = $true)] [string]$CalendarTenantId,

  [Parameter(Mandatory = $true)] [string]$OrganizerEmail,

  [Parameter(Mandatory = $true)] [string]$ResourceGroupName,
  [Parameter(Mandatory = $true)] [string]$ApiAppName,
  [Parameter(Mandatory = $true)] [string]$KeyVaultName,

  [Parameter(Mandatory = $false)] [string]$SecretPrefix = "ethicflow-prod",
  [Parameter(Mandatory = $false)] [string]$SsoAppId,
  [switch]$SkipApiSettings,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# Microsoft Graph constants for delegated SSO permissions.
$GraphResourceId = "00000003-0000-0000-c000-000000000000"
$DelegatedScopes = @(
  "e1fe6dd8-ba31-4d61-89e7-88639da4683d=Scope", # User.Read
  "14dad69e-099b-42c9-810b-d002981feec1=Scope", # profile
  "64a6cdd6-aab1-4aaf-94b8-3cc8405e90d0=Scope", # email
  "37f7f235-527c-4136-accd-4a02d197296e=Scope"  # openid
)

function Write-Action {
  <#
  .SYNOPSIS
    Logs a high-visibility action line to the console.
  #>
  param([string]$Message)
  Write-Host "[EthicFlow/Phase3] $Message" -ForegroundColor Cyan
}

function Assert-AzTenant {
  <#
  .SYNOPSIS
    Verifies that the currently logged-in az session targets the expected tenant.
  .PARAMETER ExpectedTenantId
    Tenant ID the SSO App should be created under.
  #>
  param([string]$ExpectedTenantId)

  if ($DryRun) {
    Write-Action "DRY RUN: would verify active az tenant equals '$ExpectedTenantId'."
    return
  }

  $current = az account show --query "tenantId" -o tsv
  if ($LASTEXITCODE -ne 0 -or -not $current) {
    throw "az account show failed; run 'az login --tenant $ExpectedTenantId' first."
  }
  if ($current -ne $ExpectedTenantId) {
    throw "Active tenant '$current' does not match expected SSO tenant '$ExpectedTenantId'. Run 'az login --tenant $ExpectedTenantId'."
  }
  Write-Action "Active tenant confirmed: $current."
}

function New-OrReuseSsoApp {
  <#
  .SYNOPSIS
    Creates the EthicFlow SSO App registration or reuses an existing one.
  .PARAMETER DisplayName
    App display name (e.g. "EthicFlow SSO").
  .PARAMETER RedirectUri
    Single web redirect URI for the SSO callback.
  .PARAMETER LogoutUrl
    Front-channel logout URL.
  .PARAMETER ExistingAppId
    Optional. If provided, skips creation and reuses this App.
  .OUTPUTS
    Hashtable with keys 'appId' and 'secret'.
  #>
  param(
    [string]$DisplayName,
    [string]$RedirectUri,
    [string]$LogoutUrl,
    [string]$ExistingAppId
  )

  if ($DryRun) {
    Write-Action "DRY RUN: would create/reuse SSO App '$DisplayName' with redirect '$RedirectUri'."
    return @{ appId = "dryrun-sso-app-id"; secret = "dryrun-sso-secret" }
  }

  $appId = $ExistingAppId
  if (-not $appId) {
    Write-Action "Creating SSO App '$DisplayName'."
    $created = az ad app create `
      --display-name $DisplayName `
      --sign-in-audience AzureADMyOrg `
      --web-redirect-uris $RedirectUri | ConvertFrom-Json
    $appId = $created.appId
    Write-Action "Created App with appId=$appId."
  } else {
    Write-Action "Reusing existing SSO App appId=$appId."
    az ad app update --id $appId --web-redirect-uris $RedirectUri | Out-Null
  }

  if ($LogoutUrl) {
    az ad app update --id $appId --web-logout-url $LogoutUrl | Out-Null
  }

  Write-Action "Adding delegated Graph scopes (User.Read, profile, email, openid)."
  foreach ($scope in $DelegatedScopes) {
    az ad app permission add --id $appId --api $GraphResourceId --api-permissions $scope | Out-Null
  }
  az ad app permission admin-consent --id $appId | Out-Null

  Write-Action "Generating client secret (24-month expiry)."
  $secret = az ad app credential reset `
    --id $appId `
    --append `
    --display-name "ethicflow-sso-prod" `
    --years 2 | ConvertFrom-Json

  return @{ appId = $appId; secret = $secret.password }
}

function Set-KeyVaultSecret {
  <#
  .SYNOPSIS
    Stores a single secret value in Azure Key Vault under the given name.
  #>
  param(
    [string]$VaultName,
    [string]$SecretName,
    [string]$SecretValue
  )

  if ($DryRun) {
    Write-Action "DRY RUN: would set Key Vault secret '$SecretName' in '$VaultName'."
    return
  }
  az keyvault secret set --vault-name $VaultName --name $SecretName --value $SecretValue | Out-Null
  Write-Action "Wrote Key Vault secret: $SecretName."
}

function Set-ApiPublicSettings {
  <#
  .SYNOPSIS
    Applies the non-secret IDs and tenant IDs to the API App Service.
  .DESCRIPTION
    Bicep sets these to subscription().tenantId by default, which is correct
    for SSO but wrong for Mail/Calendar in the hybrid setup. This explicitly
    overrides those keys with the values supplied for each integration.
  #>
  param(
    [string]$RgName,
    [string]$AppName,
    [hashtable]$Settings
  )

  $kvPairs = @()
  foreach ($entry in $Settings.GetEnumerator()) {
    $kvPairs += "$($entry.Key)=$($entry.Value)"
  }

  if ($DryRun) {
    Write-Action "DRY RUN: would set $($kvPairs.Count) appSettings on $AppName."
    foreach ($pair in $kvPairs) { Write-Host "  $pair" }
    return
  }

  Write-Action "Applying public IDs/tenants to App Service '$AppName'."
  az webapp config appsettings set `
    --resource-group $RgName `
    --name $AppName `
    --settings $kvPairs | Out-Null
}

# ---------- Main ----------

Assert-AzTenant -ExpectedTenantId $SsoTenantId

$normalizedBase = $ApiBaseUrl.TrimEnd("/")
$ssoCallback = "$normalizedBase/api/auth/microsoft/callback"
$resolvedLogoutUrl = if ([string]::IsNullOrWhiteSpace($FrontendLogoutUrl)) {
  "$normalizedBase/login"
} else {
  $FrontendLogoutUrl.TrimEnd("/")
}

Write-Action "SSO callback: $ssoCallback"
Write-Action "Front-channel logout: $resolvedLogoutUrl"
Write-Action "Mail tenant: $MailTenantId | Calendar tenant: $CalendarTenantId"

$sso = New-OrReuseSsoApp `
  -DisplayName "EthicFlow SSO" `
  -RedirectUri $ssoCallback `
  -LogoutUrl $resolvedLogoutUrl `
  -ExistingAppId $SsoAppId

# Persist all three client secrets in Key Vault. Secret names match the
# references used by set-azure-api-keyvault-settings.ps1.
Set-KeyVaultSecret -VaultName $KeyVaultName -SecretName "$SecretPrefix-microsoft-auth-client-secret"     -SecretValue $sso.secret
Set-KeyVaultSecret -VaultName $KeyVaultName -SecretName "$SecretPrefix-microsoft-calendar-client-secret" -SecretValue $CalendarClientSecret
Set-KeyVaultSecret -VaultName $KeyVaultName -SecretName "$SecretPrefix-microsoft-mail-client-secret"     -SecretValue $MailClientSecret

if (-not $SkipApiSettings) {
  $publicSettings = [ordered]@{
    MICROSOFT_AUTH_CLIENT_ID            = $sso.appId
    MICROSOFT_AUTH_TENANT_ID            = $SsoTenantId
    MICROSOFT_AUTH_REDIRECT_URI         = $ssoCallback
    MICROSOFT_CALENDAR_CLIENT_ID        = $CalendarClientId
    MICROSOFT_CALENDAR_TENANT_ID        = $CalendarTenantId
    MICROSOFT_CALENDAR_ORGANIZER_EMAIL  = $OrganizerEmail
    MICROSOFT_MAIL_CLIENT_ID            = $MailClientId
    MICROSOFT_MAIL_TENANT_ID            = $MailTenantId
  }
  Set-ApiPublicSettings -RgName $ResourceGroupName -AppName $ApiAppName -Settings $publicSettings
}

Write-Host ""
Write-Host "=== Phase 3 setup summary ===" -ForegroundColor Green
Write-Host "SSO App ID:               $($sso.appId)"
Write-Host "SSO Tenant ID:            $SsoTenantId"
Write-Host "Mail App ID (from IT):    $MailClientId"
Write-Host "Mail Tenant (from IT):    $MailTenantId"
Write-Host "Calendar App ID (from IT):$CalendarClientId"
Write-Host "Calendar Tenant (from IT):$CalendarTenantId"
Write-Host ""
Write-Host "Key Vault secrets written under prefix '$SecretPrefix':"
Write-Host "  $SecretPrefix-microsoft-auth-client-secret"
Write-Host "  $SecretPrefix-microsoft-calendar-client-secret"
Write-Host "  $SecretPrefix-microsoft-mail-client-secret"
Write-Host ""
if ($SkipApiSettings) {
  Write-Host "API App Service settings were NOT modified (-SkipApiSettings)."
} else {
  Write-Host "API App Service '$ApiAppName' updated with public IDs and tenant IDs."
  Write-Host "Next: run set-azure-api-keyvault-settings.ps1 to wire Key Vault references."
}
