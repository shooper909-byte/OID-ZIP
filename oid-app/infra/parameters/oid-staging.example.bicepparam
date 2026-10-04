using '../main.bicep'

param expectedSubscriptionId = '00000000-0000-0000-0000-000000000000'
param environment = 'staging'
param location = 'eastus2'
param resourcePrefix = 'oid'
param resourceGroupName = 'oid-staging-rg'
param pilotHostname = ''
param expectedPilotUsers = 3
param postgresSkuName = 'Standard_B1ms'
param postgresStorageGb = 32
param postgresBackupRetentionDays = 35
param logRetentionDays = 30
param logDailyQuotaGb = 1
param documentContainerName = 'oid-documents'
param deployApplication = false
param deployMigrationJob = false
// Fail-closed placeholders. Replace only after an approved image is built, scanned, and pushed.
param applicationImage = 'invalid.invalid/oid-application:approval-required'
param migrationImage = 'invalid.invalid/oid-migration:approval-required'
param entraTenantId = '00000000-0000-0000-0000-000000000000'
param entraClientId = '00000000-0000-0000-0000-000000000000'
param entraAllowedGroupObjectIds = []
param administratorObjectIds = []
param ownerBootstrapObjectIds = []
param azureResourceBudgetUsd = 55
param budgetStartDate = '2026-08-01'
param budgetContactEmails = [readEnvironmentVariable('OID_AZURE_BUDGET_CONTACT_EMAIL')]

// Supply these only through process environment variables at validation/deployment time.
// Never replace them with literal values in a committed file.
param postgresAdminPassword = readEnvironmentVariable('OID_AZURE_POSTGRES_ADMIN_PASSWORD')
param postgresRuntimePassword = readEnvironmentVariable('OID_AZURE_POSTGRES_RUNTIME_PASSWORD')
param postgresMigrationPassword = readEnvironmentVariable('OID_AZURE_POSTGRES_MIGRATION_PASSWORD')
param oidTrustedProxySecret = readEnvironmentVariable('OID_AZURE_TRUSTED_PROXY_SECRET')
