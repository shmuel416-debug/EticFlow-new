<#
  EthicFlow Azure runtime rollback drill.
  Swaps staging->production, validates health, then swaps back.
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$ResourceGroupName,
  [Parameter(Mandatory = $true)]
  [string]$ApiAppName,
  [Parameter(Mandatory = $true)]
  [string]$WebAppName,
  [Parameter(Mandatory = $true)]
  [string]$ApiHealthUrl,
  [Parameter(Mandatory = $false)]
  [int]$WarmupSeconds = 30,
  [switch]$SkipHealthCheck
)

$ErrorActionPreference = "Stop"
$start = Get-Date

function Write-Step {
  param([string]$Message)
  Write-Host "[EthicFlow/Drill] $Message" -ForegroundColor Green
}

function Invoke-Swap {
  param([string]$AppName)
  az webapp deployment slot swap `
    --resource-group $ResourceGroupName `
    --name $AppName `
    --slot staging `
    --target-slot production | Out-Null
}

function Assert-Healthy {
  param([string]$Url)
  $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -Method Get -TimeoutSec 30
  if ($response.StatusCode -ne 200) {
    throw "Health check failed for $Url. Status code: $($response.StatusCode)"
  }
}

Write-Step "Starting rollback drill (forward swap)."
Invoke-Swap -AppName $ApiAppName
Invoke-Swap -AppName $WebAppName

Write-Step "Waiting $WarmupSeconds seconds for warm-up."
Start-Sleep -Seconds $WarmupSeconds

if (-not $SkipHealthCheck) {
  Write-Step "Running health check on production API."
  Assert-Healthy -Url $ApiHealthUrl
}

Write-Step "Swapping back to previous production release."
Invoke-Swap -AppName $ApiAppName
Invoke-Swap -AppName $WebAppName

Write-Step "Waiting $WarmupSeconds seconds after rollback."
Start-Sleep -Seconds $WarmupSeconds

if (-not $SkipHealthCheck) {
  Write-Step "Running post-rollback health check."
  Assert-Healthy -Url $ApiHealthUrl
}

$elapsed = [int]((Get-Date) - $start).TotalSeconds
Write-Step "Rollback drill completed successfully in $elapsed seconds."
