param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,
  [Parameter(Mandatory = $true)]
  [string]$BaseUrl,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Write-Action {
  param([string]$Message)
  Write-Host "[EthicFlow/Google] $Message" -ForegroundColor Yellow
}

$normalizedBase = $BaseUrl.TrimEnd("/")
$redirectUri = "$normalizedBase/api/calendar/callback/google"

Write-Action "Project: $ProjectId"
Write-Action "Redirect URI: $redirectUri"

if ($DryRun) {
  Write-Action "DRY RUN: would set gcloud project and enable Calendar API."
} else {
  gcloud config set project $ProjectId | Out-Null
  gcloud services enable calendar-json.googleapis.com | Out-Null
}

Write-Host ""
Write-Host "Manual Google Console steps (required):"
Write-Host "1) APIs & Services -> OAuth consent screen -> configure app name/support email."
Write-Host "2) Scopes: openid, email, profile, https://www.googleapis.com/auth/calendar.events"
Write-Host "3) Credentials -> Create OAuth Client ID -> Web application."
Write-Host "4) Add redirect URI: $redirectUri"
Write-Host ""
Write-Host "# Paste resulting values into production .env"
Write-Host "GOOGLE_CALENDAR_USER_CLIENT_ID=<from_google_console>"
Write-Host "GOOGLE_CALENDAR_USER_CLIENT_SECRET=<from_google_console>"
Write-Host "GOOGLE_CALENDAR_USER_REDIRECT_URI=$redirectUri"
