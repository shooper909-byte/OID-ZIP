@minLength(3)
param environment string
param location string
@minLength(3)
param resourcePrefix string
param acaSubnetId string
param postgresSubnetId string
param postgresPrivateDnsZoneId string
param logAnalyticsWorkspaceId string
param postgresSkuName string
param postgresStorageGb int
param postgresBackupRetentionDays int
@secure()
param postgresAdminPassword string
param documentContainerName string
param tags object

var suffix = toLower(uniqueString(resourceGroup().id, environment))
var postgresServerName = '${resourcePrefix}-${environment}-pg-${suffix}'
var postgresDatabaseName = 'oid'
var storageAccountName = take(toLower(replace('${resourcePrefix}${environment}doc${suffix}', '-', '')), 24)
var keyVaultName = take(toLower('${resourcePrefix}-${environment}-kv-${suffix}'), 24)

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: postgresServerName
  location: location
  tags: tags
  sku: {
    name: postgresSkuName
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: 'oid_bootstrap_admin'
    administratorLoginPassword: postgresAdminPassword
    version: '17'
    availabilityZone: '1'
    backup: {
      backupRetentionDays: postgresBackupRetentionDays
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    network: {
      delegatedSubnetResourceId: postgresSubnetId
      privateDnsZoneArmResourceId: postgresPrivateDnsZoneId
      publicNetworkAccess: 'Disabled'
    }
    storage: {
      autoGrow: 'Disabled'
      storageSizeGB: postgresStorageGb
      tier: 'P4'
    }
    authConfig: {
      activeDirectoryAuth: 'Disabled'
      passwordAuth: 'Enabled'
    }
  }
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  name: postgresDatabaseName
  parent: postgres
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

resource requireTls 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2024-08-01' = {
  name: 'require_secure_transport'
  parent: postgres
  properties: {
    source: 'user-override'
    value: 'on'
  }
}

resource minTls 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2024-08-01' = {
  name: 'ssl_min_protocol_version'
  parent: postgres
  properties: {
    source: 'user-override'
    value: 'TLSv1.2'
  }
}

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  // resourcePrefix/environment have explicit minimum lengths; take()/replace() obscures that proof from the compiler.
  #disable-next-line BCP334
  name: storageAccountName
  location: location
  tags: tags
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    allowCrossTenantReplication: false
    allowSharedKeyAccess: false
    defaultToOAuthAuthentication: true
    minimumTlsVersion: 'TLS1_2'
    publicNetworkAccess: 'Enabled'
    supportsHttpsTrafficOnly: true
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Deny'
      ipRules: []
      virtualNetworkRules: [
        {
          action: 'Allow'
          id: acaSubnetId
        }
      ]
    }
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  name: 'default'
  parent: storage
  properties: {
    changeFeed: {
      enabled: true
      retentionInDays: 35
    }
    containerDeleteRetentionPolicy: {
      enabled: true
      days: 35
    }
    deleteRetentionPolicy: {
      enabled: true
      allowPermanentDelete: false
      days: 35
    }
    isVersioningEnabled: true
  }
}

resource documents 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  name: documentContainerName
  parent: blobService
  properties: {
    publicAccess: 'None'
    defaultEncryptionScope: '$account-encryption-key'
    denyEncryptionScopeOverride: true
    immutableStorageWithVersioning: {
      enabled: true
    }
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enablePurgeProtection: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Deny'
      ipRules: []
      virtualNetworkRules: [
        {
          id: acaSubnetId
          ignoreMissingVnetServiceEndpoint: false
        }
      ]
    }
    sku: {
      family: 'A'
      name: 'standard'
    }
  }
}

resource postgresDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'send-to-oid-log-analytics'
  scope: postgres
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      { categoryGroup: 'allLogs', enabled: true }
    ]
    metrics: [
      { category: 'AllMetrics', enabled: true }
    ]
  }
}

resource keyVaultDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'send-to-oid-log-analytics'
  scope: keyVault
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      { categoryGroup: 'allLogs', enabled: true }
    ]
    metrics: [
      { category: 'AllMetrics', enabled: true }
    ]
  }
}

resource blobDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'send-to-oid-log-analytics'
  scope: blobService
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      { categoryGroup: 'allLogs', enabled: true }
    ]
    metrics: [
      { category: 'AllMetrics', enabled: true }
    ]
  }
}

output postgresServerName string = postgres.name
output postgresHost string = postgres.properties.fullyQualifiedDomainName
output postgresDatabaseName string = database.name
output storageAccountName string = storage.name
output blobServiceUrl string = storage.properties.primaryEndpoints.blob
output keyVaultName string = keyVault.name
output keyVaultUri string = keyVault.properties.vaultUri
