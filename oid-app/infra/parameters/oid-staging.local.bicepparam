using '../main.bicep'

param expectedSubscriptionId = '94e34b9c-250b-4486-9806-9f24f5534e94'
param environment = 'staging'
param location = 'eastus2'
param resourcePrefix = 'oid'
param resourceGroupName = 'oid-staging-rg'
param pilotHostname = 'oid-staging-app-qgvnukjcy7jwk.jollyfield-2bcf5822.eastus2.azurecontainerapps.io'
param expectedPilotUsers = 1
param deployApplication = true
param deployMigrationJob = false
param reuseExistingFoundationData = true
param oidDataMode = 'controlled-product-staging'
param existingApplicationPrincipalId = 'e3cda9db-32ef-49b8-b4d3-f7cbb5169261'
param applicationImage = 'oidstagingacrqgvnukjcy7jwk.azurecr.io/oid-application@sha256:0b50064346e29ef7d5820a41926a6d711c33c855a3b20f5193beaa85f2dfc2b0'
param migrationImage = 'oidstagingacrqgvnukjcy7jwk.azurecr.io/oid-migration@sha256:d80091a0ac49c7e41435b30790812cef0e915c948bae38aa6ecde7dbf2220ed2'
param entraTenantId = '595ff05a-ce72-406d-82ff-e3f924d7f0e1'
param entraClientId = '3374f580-d9d4-4d42-8e44-cbcc95fa6317'
param entraAllowedGroupObjectIds = ['da7ae7e7-0bb3-4bdf-a411-75726b97b418']
param administratorObjectIds = ['bab63204-7cb9-465d-a074-56124afeaa98']
// Approved OID owner (Shelby). Auto-created with FOUNDER on first verified Entra sign-in if missing.
param ownerBootstrapObjectIds = ['bab63204-7cb9-465d-a074-56124afeaa98']
param azureResourceBudgetUsd = 55
param budgetStartDate = '2026-08-01'
param budgetContactEmails = [readEnvironmentVariable('OID_AZURE_BUDGET_CONTACT_EMAIL')]

param postgresAdminPassword = readEnvironmentVariable('OID_AZURE_POSTGRES_ADMIN_PASSWORD')
param postgresRuntimePassword = readEnvironmentVariable('OID_AZURE_POSTGRES_RUNTIME_PASSWORD')
param postgresMigrationPassword = readEnvironmentVariable('OID_AZURE_POSTGRES_MIGRATION_PASSWORD')
param oidTrustedProxySecret = readEnvironmentVariable('OID_AZURE_TRUSTED_PROXY_SECRET')
