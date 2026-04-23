param(
  [Parameter(Mandatory = $false)]
  [string]$ComposeFiles = "-f docker-compose.yml -f docker-compose.prod.yml",
  [Parameter(Mandatory = $false)]
  [string]$DbService = "db",
  [Parameter(Mandatory = $false)]
  [string]$DbUser = "ethicflow",
  [Parameter(Mandatory = $false)]
  [string]$DbName = "ethicflow",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = "backup-$timestamp.sql"

function Invoke-Step {
  param([string]$Command)
  Write-Host "[Drill] $Command" -ForegroundColor Green
  if (-not $DryRun) {
    Invoke-Expression $Command
  }
}

Invoke-Step "docker compose $ComposeFiles config -q"
Invoke-Step "docker compose $ComposeFiles ps"
Invoke-Step "docker compose $ComposeFiles exec $DbService pg_dump -U $DbUser $DbName > $backupFile"
Invoke-Step "type $backupFile | docker compose $ComposeFiles exec -T $DbService psql -U $DbUser $DbName"
Invoke-Step "docker compose $ComposeFiles down"
Invoke-Step "docker compose $ComposeFiles up -d"

Write-Host ""
Write-Host "[Drill] Completed. Save evidence in docs/ops/drills/ with timestamp $timestamp."
