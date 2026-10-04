targetScope = 'subscription'

@description('Subscription that must be selected before deployment. This is checked by the operator before any create command.')
param expectedSubscriptionId string

@allowed(['staging'])
param environment string = 'staging'

@description('Azure region selected after checking service and SKU availability in the target subscription.')
param location string = 'eastus2'

@minLength(3)
@maxLength(18)
param resourcePrefix string = 'oid'

param resourceGroupName string = '${resourcePrefix}-${environment}-rg'
param pilotHostname string = ''
param expectedPilotUsers int = 3
param postgresSkuName string = 'Standard_B1ms'
param postgresStorageGb int = 32
param postgresBackupRetentionDays int = 35
param logRetentionDays int = 30
param logDailyQuotaGb int = 1
param documentContainerName string = 'oid-documents'
param deployApplication bool = false
param deployMigrationJob bool = false
@allowed(['controlled-product-staging'])
param oidDataMode string
@description('Existing application managed-identity principal ID for drift-free application-only what-if. Leave empty when creating the identity.')
param existingApplicationPrincipalId string = ''
@description('Reuse the already deployed foundation, data, budget, and diagnostics without redeclaring them during an application-only deployment.')
param reuseExistingFoundationData bool = false
param applicationImage string = 'invalid.invalid/oid-application:approval-required'
param migrationImage string = 'invalid.invalid/oid-migration:approval-required'
param entraTenantId string
param entraClientId string
param entraAllowedGroupObjectIds array
param administratorObjectIds array
@description('Entra object IDs approved to have a missing OID user created with the owner role on first verified sign-in. Identifiers only; never secrets.')
param ownerBootstrapObjectIds array = []

var applicationIdentityReady = entraClientId != '00000000-0000-0000-0000-000000000000' && length(entraAllowedGroupObjectIds) > 0
var applicationImagesReady = contains(applicationImage, '@sha256:') && contains(migrationImage, '@sha256:') && !startsWith(applicationImage, 'invalid.invalid/') && !startsWith(migrationImage, 'invalid.invalid/')
var suffix = toLower(uniqueString(resourceGroup.id, environment))
var existingManagedEnvironmentName = '${resourcePrefix}-${environment}-cae-${suffix}'
var existingPostgresServerName = '${resourcePrefix}-${environment}-pg-${suffix}'
var existingStorageAccountName = take(toLower(replace('${resourcePrefix}${environment}doc${suffix}', '-', '')), 24)
var existingKeyVaultName = take(toLower('${resourcePrefix}-${environment}-kv-${suffix}'), 24)

@description('Monthly Azure resource-group budget in USD. The pilot default is the approved Azure-consumption ceiling; Entra licensing is not assumed.')
@minValue(1)
param azureResourceBudgetUsd int = 55

@description('First day of the budget month. Azure requires the first day of a month.')
param budgetStartDate string = utcNow('yyyy-MM-01')

@description('Company-controlled addresses that receive every budget notification. Never use a UHV address.')
@minLength(1)
param budgetContactEmails array

@secure()
param postgresAdminPassword string

@secure()
param postgresRuntimePassword string

@secure()
param postgresMigrationPassword string

@secure()
param oidTrustedProxySecret string

param tags object = {
  application: 'OID'
  environment: environment
  dataScope: 'synthetic-internal-pilot-only'
  managedBy: 'Bicep'
  costCenter: 'OID-PILOT'
}

resource resourceGroup 'Microsoft.Resources/resourceGroups@2024-11-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

module costManagement 'modules/cost-management.bicep' = if (!reuseExistingFoundationData) {
  name: 'oid-${environment}-cost-management'
  scope: resourceGroup
  params: {
    budgetName: '${resourcePrefix}-${environment}-monthly-budget'
    budgetAmountUsd: azureResourceBudgetUsd
    budgetStartDate: budgetStartDate
    contactEmails: budgetContactEmails
  }
}

module foundation 'modules/foundation.bicep' = if (!reuseExistingFoundationData) {
  name: 'oid-${environment}-foundation'
  scope: resourceGroup
  params: {
    environment: environment
    location: location
    resourcePrefix: resourcePrefix
    logRetentionDays: logRetentionDays
    logDailyQuotaGb: logDailyQuotaGb
    tags: tags
  }
}

module data 'modules/data.bicep' = if (!reuseExistingFoundationData) {
  name: 'oid-${environment}-data'
  scope: resourceGroup
  params: {
    environment: environment
    location: location
    resourcePrefix: resourcePrefix
    acaSubnetId: foundation!.outputs.acaSubnetId
    postgresSubnetId: foundation!.outputs.postgresSubnetId
    postgresPrivateDnsZoneId: foundation!.outputs.postgresPrivateDnsZoneId
    logAnalyticsWorkspaceId: foundation!.outputs.logAnalyticsWorkspaceId
    postgresSkuName: postgresSkuName
    postgresStorageGb: postgresStorageGb
    postgresBackupRetentionDays: postgresBackupRetentionDays
    postgresAdminPassword: postgresAdminPassword
    documentContainerName: documentContainerName
    tags: tags
  }
}

module application 'modules/application.bicep' = if (deployApplication) {
  name: 'oid-${environment}-application'
  scope: resourceGroup
  params: {
    environment: environment
    location: location
    resourcePrefix: resourcePrefix
    managedEnvironmentName: reuseExistingFoundationData ? existingManagedEnvironmentName : foundation!.outputs.managedEnvironmentName
    keyVaultName: reuseExistingFoundationData ? existingKeyVaultName : data!.outputs.keyVaultName
    storageAccountName: reuseExistingFoundationData ? existingStorageAccountName : data!.outputs.storageAccountName
    blobServiceUrl: reuseExistingFoundationData ? 'https://${existingStorageAccountName}.blob.${az.environment().suffixes.storage}' : data!.outputs.blobServiceUrl
    documentContainerName: documentContainerName
    postgresHost: reuseExistingFoundationData ? '${existingPostgresServerName}.postgres.database.azure.com' : data!.outputs.postgresHost
    postgresDatabaseName: reuseExistingFoundationData ? 'oid' : data!.outputs.postgresDatabaseName
    postgresAdminPassword: postgresAdminPassword
    postgresRuntimePassword: postgresRuntimePassword
    postgresMigrationPassword: postgresMigrationPassword
    oidTrustedProxySecret: oidTrustedProxySecret
    entraTenantId: entraTenantId
    entraClientId: entraClientId
    entraAllowedGroupObjectIds: entraAllowedGroupObjectIds
    ownerBootstrapObjectIds: ownerBootstrapObjectIds
    pilotHostname: pilotHostname
    applicationImage: applicationImage
    migrationImage: migrationImage
    deployMigrationJob: deployMigrationJob
    oidDataMode: oidDataMode
    existingApplicationPrincipalId: existingApplicationPrincipalId
    tags: tags
  }
}

output deploymentMode string = deployApplication ? 'foundation-data-and-application' : 'foundation-and-data-only'
output expectedSubscriptionMatches bool = subscription().subscriptionId == expectedSubscriptionId
output resourceGroupId string = resourceGroup.id
output managedEnvironmentName string = reuseExistingFoundationData ? existingManagedEnvironmentName : foundation!.outputs.managedEnvironmentName
output postgresServerName string = reuseExistingFoundationData ? existingPostgresServerName : data!.outputs.postgresServerName
output storageAccountName string = reuseExistingFoundationData ? existingStorageAccountName : data!.outputs.storageAccountName
output keyVaultName string = reuseExistingFoundationData ? existingKeyVaultName : data!.outputs.keyVaultName
output containerRegistryName string = deployApplication ? application!.outputs.containerRegistryName : 'not-created'
output containerAppName string = deployApplication ? application!.outputs.containerAppName : 'not-created'
output containerAppFqdn string = deployApplication ? application!.outputs.containerAppFqdn : 'not-created'
output pilotHostnameConfigured bool = deployApplication && !empty(pilotHostname)
output applicationIdentityConfigured bool = !deployApplication || applicationIdentityReady
output applicationImagesPinned bool = !deployApplication || applicationImagesReady
output migrationConfigurationValid bool = !deployMigrationJob || deployApplication
output expectedPilotUsers int = expectedPilotUsers
output administratorIdentitiesConfigured bool = length(administratorObjectIds) > 0
output monthlyAzureBudgetUsd int = azureResourceBudgetUsd
output budgetNotificationsConfigured bool = length(budgetContactEmails) > 0
