<#
  EthicFlow Azure baseline deployment helper.
  Deploys Resource Group + Bicep template and validates core resources.
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$SubscriptionId,
  [Parameter(Mandatory = $false)]
  [string]$ResourceGroupName = "rg-ethicflow-prod",
  [Parameter(Mandatory = $false)]
  [string]$Location = "westeurope",
  [Parameter(Mandatory = $false)]
  [string]$TemplateFile = "infra/azure/appservice/main.bicep",
  [Parameter(Mandatory = $false)]
  [string]$ParametersFile = "infra/azure/appservice/parameters.prod.json",
  [switch]$SkipLogin
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "[EthicFlow/Azure] $Message" -ForegroundColor Cyan
}

function Assert-FileExists {
  param([string]$Path)
  if (-not (Test-Path -Path $Path)) {
    throw "Required file not found: $Path"
  }
}

Write-Step "Starting Azure baseline deployment."
Assert-FileExists -Path $TemplateFile
Assert-FileExists -Path $ParametersFile

if (-not $SkipLogin) {
  Write-Step "Signing in to Azure."
  az login | Out-Null
}

Write-Step "Selecting subscription $SubscriptionId."
az account set --subscription $SubscriptionId

Write-Step "Ensuring resource group exists: $ResourceGroupName."
az group create --name $ResourceGroupName --location $Location | Out-Null

Write-Step "Deploying Bicep template."
az deployment group create `
  --resource-group $ResourceGroupName `
  --template-file $TemplateFile `
  --parameters "@$ParametersFile" | Out-Null

Write-Step "Validating core resources."
$expectedTypes = @(
  "Microsoft.Web/serverfarms",
  "Microsoft.Web/sites",
  "Microsoft.ContainerRegistry/registries",
  "Microsoft.DBforPostgreSQL/flexibleServers",
  "Microsoft.KeyVault/vaults",
  "Microsoft.Insights/components"
)

$resourceList = az resource list --resource-group $ResourceGroupName --query "[].type" -o tsv
foreach ($type in $expectedTypes) {
  if ($resourceList -notcontains $type) {
    throw "Missing expected resource type in resource group: $type"
  }
}

Write-Step "Baseline deployment completed successfully."
Write-Host "Next: configure domains and certificates, then deploy staging release."
