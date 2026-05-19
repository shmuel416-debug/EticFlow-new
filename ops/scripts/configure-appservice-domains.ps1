<#
  EthicFlow App Service domain + managed certificate helper.
  Prints asuid verification values and can bind hostnames/certificates after DNS is ready.
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$ResourceGroupName,
  [Parameter(Mandatory = $true)]
  [string]$WebAppName,
  [Parameter(Mandatory = $true)]
  [string]$ApiAppName,
  [Parameter(Mandatory = $true)]
  [string]$WebHostname,
  [Parameter(Mandatory = $true)]
  [string]$ApiHostname,
  [switch]$ApplyBindings
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "[EthicFlow/Azure] $Message" -ForegroundColor Cyan
}

function Get-VerificationId {
  param([string]$AppName)
  return az webapp show --resource-group $ResourceGroupName --name $AppName --query customDomainVerificationId -o tsv
}

function Ensure-HostnameAndCertificate {
  param(
    [string]$AppName,
    [string]$Hostname
  )

  Write-Step "Adding hostname $Hostname to $AppName."
  az webapp config hostname add --resource-group $ResourceGroupName --webapp-name $AppName --hostname $Hostname | Out-Null

  Write-Step "Creating managed certificate for $Hostname."
  az webapp config ssl create --resource-group $ResourceGroupName --name $AppName --hostname $Hostname | Out-Null

  $thumbprint = az webapp config ssl list --resource-group $ResourceGroupName --query "[?hostname=='$Hostname'].thumbprint | [0]" -o tsv
  if ([string]::IsNullOrWhiteSpace($thumbprint)) {
    throw "Unable to resolve certificate thumbprint for $Hostname."
  }

  Write-Step "Binding certificate to $Hostname."
  az webapp config ssl bind --resource-group $ResourceGroupName --name $AppName --certificate-thumbprint $thumbprint --ssl-type SNI | Out-Null
}

$webAsuid = Get-VerificationId -AppName $WebAppName
$apiAsuid = Get-VerificationId -AppName $ApiAppName

Write-Host ""
Write-Host "Create DNS TXT records before binding:"
Write-Host "asuid.$WebHostname  TXT  $webAsuid"
Write-Host "asuid.$ApiHostname  TXT  $apiAsuid"
Write-Host ""
Write-Host "And CNAME records:"
Write-Host "$WebHostname -> $WebAppName.azurewebsites.net"
Write-Host "$ApiHostname -> $ApiAppName.azurewebsites.net"

if (-not $ApplyBindings) {
  Write-Host ""
  Write-Host "After DNS propagation run again with -ApplyBindings to add hostnames and certificates."
  return
}

Ensure-HostnameAndCertificate -AppName $WebAppName -Hostname $WebHostname
Ensure-HostnameAndCertificate -AppName $ApiAppName -Hostname $ApiHostname

Write-Step "Domain and TLS configuration completed."
