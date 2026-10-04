targetScope = 'resourceGroup'

param budgetName string

@minValue(1)
param budgetAmountUsd int

param budgetStartDate string

@minLength(1)
param contactEmails array

// The $55 default is the approved Azure-consumption ceiling for staging.
// Entra licensing is not assumed; any later license purchase requires separate approval.
resource monthlyBudget 'Microsoft.Consumption/budgets@2024-08-01' = {
  name: budgetName
  properties: {
    amount: budgetAmountUsd
    category: 'Cost'
    timeGrain: 'Monthly'
    timePeriod: {
      startDate: budgetStartDate
    }
    notifications: {
      EarlyActual55Percent: {
        enabled: true
        operator: 'GreaterThanOrEqualTo'
        threshold: 55
        thresholdType: 'Actual'
        contactEmails: contactEmails
        contactGroups: []
        contactRoles: []
        locale: 'en-us'
      }
      EarlyForecast73Percent: {
        enabled: true
        operator: 'GreaterThanOrEqualTo'
        threshold: 73
        thresholdType: 'Forecasted'
        contactEmails: contactEmails
        contactGroups: []
        contactRoles: []
        locale: 'en-us'
      }
      CriticalActual90Percent: {
        enabled: true
        operator: 'GreaterThanOrEqualTo'
        threshold: 90
        thresholdType: 'Actual'
        contactEmails: contactEmails
        contactGroups: []
        contactRoles: []
        locale: 'en-us'
      }
      CriticalForecast95Percent: {
        enabled: true
        operator: 'GreaterThanOrEqualTo'
        threshold: 95
        thresholdType: 'Forecasted'
        contactEmails: contactEmails
        contactGroups: []
        contactRoles: []
        locale: 'en-us'
      }
      AzureResourceCeiling100Percent: {
        enabled: true
        operator: 'GreaterThanOrEqualTo'
        threshold: 100
        thresholdType: 'Actual'
        contactEmails: contactEmails
        contactGroups: []
        contactRoles: []
        locale: 'en-us'
      }
    }
  }
}

output budgetName string = monthlyBudget.name
// Return the approved integer input because ARM normalizes the resource's
// whole-dollar amount to a float (for example, 55.0) at runtime.
output budgetAmountUsd int = budgetAmountUsd
