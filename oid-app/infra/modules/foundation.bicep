@minLength(3)
param environment string
param location string
@minLength(3)
param resourcePrefix string
param logRetentionDays int
param logDailyQuotaGb int
param tags object

var suffix = toLower(uniqueString(resourceGroup().id, environment))
var vnetName = '${resourcePrefix}-${environment}-vnet'
var workspaceName = '${resourcePrefix}-${environment}-law-${suffix}'
var appInsightsName = '${resourcePrefix}-${environment}-appi-${suffix}'
var environmentName = '${resourcePrefix}-${environment}-cae-${suffix}'

resource vnet 'Microsoft.Network/virtualNetworks@2024-05-01' = {
  name: vnetName
  location: location
  tags: tags
  properties: {
    addressSpace: {
      addressPrefixes: ['10.40.0.0/20']
    }
    subnets: [
      {
        name: 'container-apps'
        properties: {
          addressPrefix: '10.40.0.0/23'
          delegations: [
            {
              name: 'Microsoft.App.environments'
              properties: {
                serviceName: 'Microsoft.App/environments'
              }
            }
          ]
          serviceEndpoints: [
            { service: 'Microsoft.KeyVault' }
            { service: 'Microsoft.Storage' }
          ]
          privateEndpointNetworkPolicies: 'Enabled'
        }
      }
      {
        name: 'postgresql'
        properties: {
          addressPrefix: '10.40.8.0/28'
          delegations: [
            {
              name: 'Microsoft.DBforPostgreSQL.flexibleServers'
              properties: {
                serviceName: 'Microsoft.DBforPostgreSQL/flexibleServers'
              }
            }
          ]
          privateEndpointNetworkPolicies: 'Enabled'
        }
      }
    ]
  }
}

resource acaSubnet 'Microsoft.Network/virtualNetworks/subnets@2024-05-01' existing = {
  name: 'container-apps'
  parent: vnet
}

resource postgresSubnet 'Microsoft.Network/virtualNetworks/subnets@2024-05-01' existing = {
  name: 'postgresql'
  parent: vnet
}

resource postgresPrivateDns 'Microsoft.Network/privateDnsZones@2024-06-01' = {
  name: '${resourcePrefix}.${environment}.postgres.database.azure.com'
  location: 'global'
  tags: tags
}

resource postgresDnsLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2024-06-01' = {
  name: '${vnetName}-link'
  parent: postgresPrivateDns
  location: 'global'
  properties: {
    registrationEnabled: false
    virtualNetwork: {
      id: vnet.id
    }
  }
}

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: workspaceName
  location: location
  tags: tags
  properties: {
    retentionInDays: logRetentionDays
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
    sku: {
      name: 'PerGB2018'
    }
    workspaceCapping: {
      dailyQuotaGb: logDailyQuotaGb
    }
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
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
    DisableIpMasking: false
    IngestionMode: 'LogAnalytics'
  }
}

resource managedEnvironment 'Microsoft.App/managedEnvironments@2025-01-01' = {
  name: environmentName
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
    peerAuthentication: {
      mtls: {
        enabled: true
      }
    }
    peerTrafficConfiguration: {
      encryption: {
        enabled: true
      }
    }
    vnetConfiguration: {
      infrastructureSubnetId: acaSubnet.id
      internal: false
    }
    zoneRedundant: false
  }
}

output acaSubnetId string = acaSubnet.id
output postgresSubnetId string = postgresSubnet.id
output postgresPrivateDnsZoneId string = postgresPrivateDns.id
output logAnalyticsWorkspaceId string = logAnalytics.id
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output managedEnvironmentName string = managedEnvironment.name
