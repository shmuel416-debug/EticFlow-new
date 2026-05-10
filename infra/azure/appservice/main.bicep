// EthicFlow Azure App Service baseline (single-tenant friendly).
// Deploys two Linux App Services (web + api), PostgreSQL Flexible Server (private),
// Storage/File Shares, Key Vault, ACR, and observability resources.

targetScope = 'resourceGroup'

@description('Deployment location for all resources.')
param location string = resourceGroup().location

@description('Short environment suffix, e.g. prod, staging.')
param environmentName string = 'prod'

@description('App Service plan name.')
param appServicePlanName string = 'asp-ethicflow-prod'

@description('Backend App Service name (must be globally unique in azurewebsites.net).')
param apiAppName string = 'app-ethicflow-api-prod'

@description('Frontend App Service name (must be globally unique in azurewebsites.net).')
param webAppName string = 'app-ethicflow-web-prod'

@description('Container registry name (must be globally unique).')
param acrName string = 'acrethicflowprod'

@description('Backend image repository name inside ACR.')
param apiImageName string = 'ethicflow-api'

@description('Frontend image repository name inside ACR.')
param webImageName string = 'ethicflow-web'

@description('Container image tag to deploy.')
param imageTag string = 'latest'

@description('PostgreSQL Flexible Server name (must be globally unique).')
param postgresServerName string = 'pg-ethicflow-prod'

@description('PostgreSQL admin username.')
param postgresAdminLogin string = 'ethicflowadmin'

@secure()
@description('PostgreSQL admin password.')
param postgresAdminPassword string

@description('Application database name.')
param postgresDatabaseName string = 'ethicflow'

@description('Storage account name for uploads (3-24 lowercase letters/numbers).')
param storageAccountName string = 'stethicflowprod01'

@description('Key Vault name.')
param keyVaultName string = 'kv-ethicflow-prod'

@description('Log Analytics workspace name.')
param logAnalyticsName string = 'law-ethicflow-prod'

@description('Application Insights resource name.')
param appInsightsName string = 'appi-ethicflow-prod'

@description('Virtual network name.')
param vnetName string = 'vnet-ethicflow-prod'

@description('Frontend public origin used for backend CORS and redirects.')
param frontendOrigin string = 'https://ethics.example.ac.il'

@description('Organizer mailbox used by Microsoft Calendar provider.')
param organizerEmail string = 'ethics@example.ac.il'

var tags = {
  project: 'EthicFlow'
  env: environmentName
}

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  tags: tags
  properties: {
    retentionInDays: 30
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  tags: tags
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    publicNetworkAccess: 'Enabled'
  }
}

resource uploadsShare 'Microsoft.Storage/storageAccounts/fileServices/shares@2023-05-01' = {
  name: '${storage.name}/default/uploads'
  properties: {
    accessTier: 'TransactionOptimized'
    enabledProtocols: 'SMB'
  }
}

resource generatedShare 'Microsoft.Storage/storageAccounts/fileServices/shares@2023-05-01' = {
  name: '${storage.name}/default/generated'
  properties: {
    accessTier: 'TransactionOptimized'
    enabledProtocols: 'SMB'
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enabledForTemplateDeployment: true
    softDeleteRetentionInDays: 90
    publicNetworkAccess: 'Enabled'
  }
}

resource dbUrlSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: '${keyVault.name}/database-url'
  properties: {
    value: 'postgresql://${postgresAdminLogin}:${postgresAdminPassword}@${postgresServer.name}.postgres.database.azure.com:5432/${postgresDatabaseName}?sslmode=require'
  }
}

resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: acrName
  location: location
  tags: tags
  sku: {
    name: 'Standard'
  }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Enabled'
  }
}

resource vnet 'Microsoft.Network/virtualNetworks@2023-11-01' = {
  name: vnetName
  location: location
  tags: tags
  properties: {
    addressSpace: {
      addressPrefixes: [
        '10.30.0.0/16'
      ]
    }
    subnets: [
      {
        name: 'appsvc-integration'
        properties: {
          addressPrefix: '10.30.1.0/24'
          delegations: [
            {
              name: 'delegation-appservice'
              properties: {
                serviceName: 'Microsoft.Web/serverFarms'
              }
            }
          ]
        }
      }
      {
        name: 'postgres-delegated'
        properties: {
          addressPrefix: '10.30.2.0/24'
          delegations: [
            {
              name: 'delegation-postgres'
              properties: {
                serviceName: 'Microsoft.DBforPostgreSQL/flexibleServers'
              }
            }
          ]
        }
      }
    ]
  }
}

resource postgresPrivateDns 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: 'privatelink.postgres.database.azure.com'
  location: 'global'
  tags: tags
}

resource postgresDnsLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  name: '${postgresPrivateDns.name}/link-${vnet.name}'
  location: 'global'
  properties: {
    registrationEnabled: false
    virtualNetwork: {
      id: vnet.id
    }
  }
}

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: postgresServerName
  location: location
  tags: tags
  sku: {
    name: 'Standard_D2s_v3'
    tier: 'GeneralPurpose'
  }
  properties: {
    administratorLogin: postgresAdminLogin
    administratorLoginPassword: postgresAdminPassword
    version: '16'
    network: {
      delegatedSubnetResourceId: '${vnet.id}/subnets/postgres-delegated'
      privateDnsZoneArmResourceId: postgresPrivateDns.id
      publicNetworkAccess: 'Disabled'
    }
    storage: {
      storageSizeGB: 128
    }
    highAvailability: {
      mode: 'Disabled'
    }
    backup: {
      backupRetentionDays: 14
      geoRedundantBackup: 'Disabled'
    }
  }
  dependsOn: [
    postgresDnsLink
  ]
}

resource postgresDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  name: '${postgresServer.name}/${postgresDatabaseName}'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  tags: tags
  sku: {
    name: 'P0v3'
    tier: 'PremiumV3'
    capacity: 1
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource apiApp 'Microsoft.Web/sites@2023-12-01' = {
  name: apiAppName
  location: location
  tags: tags
  kind: 'app,linux,container'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOCKER|${acr.properties.loginServer}/${apiImageName}:${imageTag}'
      acrUseManagedIdentityCreds: true
      alwaysOn: true
      healthCheckPath: '/api/health'
      http20Enabled: true
      minimumTlsVersion: '1.2'
      ftpsState: 'Disabled'
      appSettings: [
        {
          name: 'WEBSITES_PORT'
          value: '3000'
        }
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'PORT'
          value: '3000'
        }
        {
          name: 'PUPPETEER_SKIP_DOWNLOAD'
          value: 'true'
        }
        {
          name: 'PUPPETEER_EXECUTABLE_PATH'
          value: '/usr/bin/chromium-browser'
        }
        {
          name: 'FRONTEND_URL'
          value: frontendOrigin
        }
        {
          name: 'DATABASE_URL'
          value: '@Microsoft.KeyVault(SecretUri=${dbUrlSecret.properties.secretUriWithVersion})'
        }
        {
          name: 'AUTH_PROVIDER'
          value: 'microsoft'
        }
        {
          name: 'EMAIL_PROVIDER'
          value: 'microsoft'
        }
        {
          name: 'CALENDAR_PROVIDER'
          value: 'microsoft'
        }
        {
          name: 'STORAGE_PROVIDER'
          value: 'local'
        }
        {
          name: 'MICROSOFT_AUTH_TENANT_ID'
          value: subscription().tenantId
        }
        {
          name: 'MICROSOFT_CALENDAR_TENANT_ID'
          value: subscription().tenantId
        }
        {
          name: 'MICROSOFT_MAIL_TENANT_ID'
          value: subscription().tenantId
        }
        {
          name: 'MICROSOFT_CALENDAR_ORGANIZER_EMAIL'
          value: organizerEmail
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
      ]
      cors: {
        allowedOrigins: [
          frontendOrigin
        ]
        supportCredentials: true
      }
    }
  }
}

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: webAppName
  location: location
  tags: tags
  kind: 'app,linux,container'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOCKER|${acr.properties.loginServer}/${webImageName}:${imageTag}'
      acrUseManagedIdentityCreds: true
      alwaysOn: true
      http20Enabled: true
      minimumTlsVersion: '1.2'
      ftpsState: 'Disabled'
      appSettings: [
        {
          name: 'WEBSITES_PORT'
          value: '80'
        }
        {
          name: 'BACKEND_URL'
          value: 'https://${apiAppName}.azurewebsites.net'
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
      ]
    }
  }
}

resource apiStorageMounts 'Microsoft.Web/sites/config@2023-12-01' = {
  name: '${apiApp.name}/azurestorageaccounts'
  properties: {
    uploads: {
      type: 'AzureFiles'
      accountName: storage.name
      shareName: 'uploads'
      accessKey: listKeys(storage.id, storage.apiVersion).keys[0].value
      mountPath: '/app/uploads'
    }
    generated: {
      type: 'AzureFiles'
      accountName: storage.name
      shareName: 'generated'
      accessKey: listKeys(storage.id, storage.apiVersion).keys[0].value
      mountPath: '/app/generated'
    }
  }
}

resource apiVnetIntegration 'Microsoft.Web/sites/networkConfig@2023-12-01' = {
  name: '${apiApp.name}/virtualNetwork'
  properties: {
    subnetResourceId: '${vnet.id}/subnets/appsvc-integration'
    swiftSupported: true
  }
}

resource acrPullRoleApi 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acr.id, apiApp.id, 'AcrPull')
  scope: acr
  properties: {
    principalId: apiApp.identity.principalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
    principalType: 'ServicePrincipal'
  }
}

resource acrPullRoleWeb 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acr.id, webApp.id, 'AcrPull')
  scope: acr
  properties: {
    principalId: webApp.identity.principalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
    principalType: 'ServicePrincipal'
  }
}

resource keyVaultSecretsUserApi 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, apiApp.id, 'KeyVaultSecretsUser')
  scope: keyVault
  properties: {
    principalId: apiApp.identity.principalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalType: 'ServicePrincipal'
  }
}

output apiDefaultHostname string = apiApp.properties.defaultHostName
output webDefaultHostname string = webApp.properties.defaultHostName
output acrLoginServer string = acr.properties.loginServer
output keyVaultUri string = keyVault.properties.vaultUri
output postgresFqdn string = postgresServer.properties.fullyQualifiedDomainName
output databaseUrlSecretName string = dbUrlSecret.name
