@minLength(3)
param environment string
param location string
@minLength(3)
param resourcePrefix string
param managedEnvironmentName string
param keyVaultName string
param storageAccountName string
param blobServiceUrl string
param documentContainerName string
param postgresHost string
param postgresDatabaseName string
@secure()
param postgresAdminPassword string
@secure()
param postgresRuntimePassword string
@secure()
param postgresMigrationPassword string
@secure()
param oidTrustedProxySecret string
param entraTenantId string
param entraClientId string
param entraAllowedGroupObjectIds array
param pilotHostname string
param applicationImage string
param migrationImage string
param deployMigrationJob bool
@allowed(['controlled-product-staging'])
param oidDataMode string
param existingApplicationPrincipalId string
param tags object

var suffix = toLower(uniqueString(resourceGroup().id, environment))
var identityName = '${resourcePrefix}-${environment}-app-mi-${suffix}'
var registryName = take(toLower(replace('${resourcePrefix}${environment}acr${suffix}', '-', '')), 50)
var appName = '${resourcePrefix}-${environment}-app-${suffix}'
var migrationJobName = '${resourcePrefix}-${environment}-migrate-${suffix}'
// A custom pilot hostname is intentionally required before activation. The placeholder
// makes a premature application deployment fail closed at the origin check.
var allowedOrigin = empty(pilotHostname) ? 'https://invalid.invalid' : 'https://${pilotHostname}'
var runtimeDatabaseUrl = 'postgresql://oid_runtime:${uriComponent(postgresRuntimePassword)}@${postgresHost}:5432/${postgresDatabaseName}?schema=public&sslmode=require'
var migrationDatabaseUrl = 'postgresql://oid_migration:${uriComponent(postgresMigrationPassword)}@${postgresHost}:5432/${postgresDatabaseName}?schema=public&sslmode=require'
var applicationPrincipalId = empty(existingApplicationPrincipalId) ? identity.properties.principalId : existingApplicationPrincipalId

resource managedEnvironment 'Microsoft.App/managedEnvironments@2025-01-01' existing = {
  name: managedEnvironmentName
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: identityName
  location: location
  tags: tags
}

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  // resourcePrefix/environment have explicit minimum lengths; take()/replace() obscures that proof from the compiler.
  #disable-next-line BCP334
  name: registryName
}

resource blobRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, identity.id, 'Storage Blob Data Contributor')
  scope: storage
  properties: {
    principalId: applicationPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
  }
}

resource acrPullRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, identity.id, 'AcrPull')
  scope: registry
  properties: {
    principalId: applicationPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
  }
}

resource postgresAdminSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'postgres-bootstrap-admin-password'
  parent: keyVault
  properties: { value: postgresAdminPassword }
}

resource runtimeDatabaseSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'oid-runtime-database-url'
  parent: keyVault
  properties: { value: runtimeDatabaseUrl }
}

resource migrationDatabaseSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'oid-migration-database-url'
  parent: keyVault
  properties: { value: migrationDatabaseUrl }
}

resource proxySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'oid-trusted-proxy-secret'
  parent: keyVault
  properties: { value: oidTrustedProxySecret }
}

resource entraSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' existing = {
  name: 'entra-oid-client-secret'
  parent: keyVault
}

resource runtimeDatabaseSecretRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(runtimeDatabaseSecret.id, identity.id, 'Key Vault Secrets User')
  scope: runtimeDatabaseSecret
  properties: {
    principalId: applicationPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
  }
}

resource proxySecretRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(proxySecret.id, identity.id, 'Key Vault Secrets User')
  scope: proxySecret
  properties: {
    principalId: applicationPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
  }
}

resource entraSecretRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(entraSecret.id, identity.id, 'Key Vault Secrets User')
  scope: entraSecret
  properties: {
    principalId: applicationPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
  }
}

resource containerApp 'Microsoft.App/containerApps@2025-01-01' = {
  name: appName
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identity.id}': {}
    }
  }
  properties: {
    environmentId: managedEnvironment.id
    workloadProfileName: 'Consumption'
    configuration: {
      activeRevisionsMode: 'Single'
      maxInactiveRevisions: 3
      ingress: {
        allowInsecure: false
        external: true
        exposedPort: 0
        targetPort: 8080
        transport: 'http'
        traffic: [
          { latestRevision: true, weight: 100 }
        ]
      }
      registries: [
        {
          server: registry.properties.loginServer
          identity: identity.id
          username: ''
          passwordSecretRef: ''
        }
      ]
      secrets: [
        { name: 'database-url', keyVaultUrl: runtimeDatabaseSecret.properties.secretUri, identity: identity.id }
        { name: 'proxy-secret', keyVaultUrl: proxySecret.properties.secretUri, identity: identity.id }
        { name: 'entra-client-secret', keyVaultUrl: entraSecret.properties.secretUri, identity: identity.id }
      ]
    }
    template: {
      containers: [
        {
          name: 'identity-bridge'
          image: applicationImage
          command: ['node']
          args: ['scripts/azure-identity-bridge.mjs']
          env: [
            { name: 'OID_ALLOWED_TENANT_ID', value: entraTenantId }
            { name: 'OID_TRUSTED_PROXY_SECRET', secretRef: 'proxy-secret' }
            { name: 'OID_BRIDGE_LISTEN_PORT', value: '8080' }
            { name: 'OID_BRIDGE_TARGET_PORT', value: '3000' }
          ]
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          probes: [
            {
              type: 'Liveness'
              httpGet: { path: '/api/v1/health/live', port: 8080, scheme: 'HTTP' }
              initialDelaySeconds: 30
              periodSeconds: 30
            }
          ]
        }
        {
          name: 'oid'
          image: applicationImage
          env: [
            { name: 'NODE_ENV', value: 'production' }
            { name: 'PORT', value: '3000' }
            { name: 'DATABASE_URL', secretRef: 'database-url' }
            { name: 'OID_IDENTITY_MODE', value: 'trusted-proxy' }
            { name: 'OID_TRUSTED_PROXY_SECRET', secretRef: 'proxy-secret' }
            { name: 'OID_IDENTITY_EMAIL_HEADER', value: 'x-oid-user-email' }
            { name: 'OID_REQUIRE_MFA', value: 'true' }
            { name: 'OID_DATA_MODE', value: oidDataMode }
            { name: 'OID_ALLOWED_ORIGIN', value: allowedOrigin }
            { name: 'OID_STORAGE_BACKEND', value: 'azure-blob' }
            { name: 'OID_BLOB_SERVICE_URL', value: blobServiceUrl }
            { name: 'OID_BLOB_CONTAINER', value: documentContainerName }
            { name: 'AZURE_CLIENT_ID', value: identity.properties.clientId }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          probes: [
            {
              type: 'Liveness'
              httpGet: { path: '/api/v1/health/live', port: 3000, scheme: 'HTTP' }
              initialDelaySeconds: 30
              periodSeconds: 30
            }
            {
              type: 'Readiness'
              httpGet: { path: '/api/v1/health/ready', port: 3000, scheme: 'HTTP' }
              initialDelaySeconds: 30
              periodSeconds: 15
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 1
        cooldownPeriod: 300
        pollingInterval: 30
        rules: [
          {
            name: 'http-single-replica'
            http: { metadata: { concurrentRequests: '10' } }
          }
        ]
      }
    }
  }
  dependsOn: [blobRole, runtimeDatabaseSecretRole, proxySecretRole, entraSecretRole, acrPullRole]
}

resource authConfig 'Microsoft.App/containerApps/authConfigs@2025-01-01' = {
  name: 'current'
  parent: containerApp
  properties: {
    platform: { enabled: true }
    globalValidation: {
      excludedPaths: ['/api/v1/health/live', '/api/v1/health/ready']
      redirectToProvider: 'azureActiveDirectory'
      unauthenticatedClientAction: 'RedirectToLoginPage'
    }
    httpSettings: {
      requireHttps: true
      routes: { apiPrefix: '/.auth' }
    }
    identityProviders: {
      azureActiveDirectory: {
        enabled: true
        isAutoProvisioned: false
        registration: {
          clientId: entraClientId
          clientSecretSettingName: 'entra-client-secret'
          #disable-next-line no-hardcoded-env-urls
          openIdIssuer: 'https://login.microsoftonline.com/${entraTenantId}/v2.0'
        }
        validation: {
          allowedAudiences: ['api://${entraClientId}', entraClientId]
          defaultAuthorizationPolicy: {
            allowedPrincipals: {
              groups: entraAllowedGroupObjectIds
            }
          }
        }
      }
    }
    login: {
      cookieExpiration: {
        convention: 'FixedTime'
        timeToExpiration: '08:00:00'
      }
      preserveUrlFragmentsForLogins: false
      routes: { logoutEndpoint: '/.auth/logout' }
      tokenStore: { enabled: false }
    }
  }
}

resource migrationJob 'Microsoft.App/jobs@2025-01-01' = if (deployMigrationJob) {
  name: migrationJobName
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${identity.id}': {} }
  }
  properties: {
    environmentId: managedEnvironment.id
    configuration: {
      replicaRetryLimit: 0
      replicaTimeout: 1800
      triggerType: 'Manual'
      manualTriggerConfig: {
        parallelism: 1
        replicaCompletionCount: 1
      }
      registries: [
        { server: registry.properties.loginServer, identity: identity.id }
      ]
      secrets: [
        { name: 'migration-database-url', keyVaultUrl: migrationDatabaseSecret.properties.secretUri, identity: identity.id }
      ]
    }
    template: {
      containers: [
        {
          name: 'migrate'
          image: migrationImage
          env: [
            { name: 'NODE_ENV', value: 'production' }
            { name: 'DATABASE_URL', secretRef: 'migration-database-url' }
          ]
          resources: { cpu: json('0.5'), memory: '1Gi' }
        }
      ]
    }
  }
}

output containerRegistryName string = registry.name
output managedIdentityName string = identity.name
output containerAppName string = containerApp.name
output containerAppFqdn string = containerApp.properties.configuration.ingress.fqdn
output migrationJobName string = deployMigrationJob ? migrationJob.name : 'not-created'
