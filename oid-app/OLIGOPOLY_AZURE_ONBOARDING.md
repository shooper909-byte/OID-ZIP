# OligoPoly Company-Owned Azure Onboarding

Status: plan only — no account, tenant, subscription, billing instrument, identity, license, DNS record, or Azure resource has been created or changed.

The Azure Free Account application was declined as ineligible. Plan exclusively for a company-controlled **Pay-As-You-Go subscription with zero promotional credits**. Do not include credits, trials, sponsorships, or university benefits in affordability decisions.

## Permanent boundary

**UHV AZURE STATUS: PROHIBITED FOR OID**  
**Reason: University authorization was denied.**

Never sign OID tooling into the UHV tenant, select its subscription, use its promotional credit, invite the UHV identity as an OID administrator, store OligoPoly information there, or deploy any OID component there. Do not attempt to transfer the UHV subscription or credit. OID must start clean in an OligoPoly-controlled Microsoft environment.

## Target outcome

Create one company-controlled Microsoft Entra workforce tenant and one company-billed Azure subscription for synthetic-only `OID-STAGING`. Preserve the existing Lean Azure Pilot target of approximately **$30–$75/month**. Reserve a separate future subscription and environment boundary for `OID-PRODUCTION`; do not create production infrastructure during onboarding.

Microsoft 365 is **not required** to create or operate a Microsoft Entra tenant, Azure subscription, Azure RBAC, managed identities, or OID. Microsoft Entra ID Free with security defaults can bootstrap identity protection. If OID requires scoped Conditional Access that guarantees MFA for its enterprise application, purchase only the necessary standalone Entra ID P1 licenses after a separate cost approval; a Microsoft 365 bundle is optional, not a prerequisite.

## SHELBY MUST DO

These steps require a human to accept Microsoft agreements, prove identity, supply company billing information, control authentication devices, and make ownership decisions. Codex must not perform them automatically.

### 1. Establish a company-controlled bootstrap identity

1. Choose an OligoPoly-controlled mailbox that Shelby can retain independently of any school, employer, contractor, or personal ISP. Preferred form: `azure-admin@<OligoPoly-owned-domain>` or another dedicated company mailbox.
2. Confirm OligoPoly controls mailbox recovery, the domain registrar account, and at least two recovery methods. Do not use a UHV address as the username, recovery address, MFA method, or billing contact.
3. Open a private browser window, sign out of all Microsoft/UHV accounts, and go directly to [Azure account options](https://azure.microsoft.com/en-us/pricing/purchase-options/azure-account).
4. Select the company-controlled identity. If Microsoft offers an account picker, verify no UHV account or directory is selected. If Microsoft cannot create/use the company identity without joining UHV, stop and contact Microsoft sales/support; do not continue in the university directory.

The bootstrap mailbox may be hosted by any suitable provider. Hosting email in Microsoft 365 is not required.

### 2. Create the company billing relationship and Azure subscription

1. From the Azure account signup, enter the legal company/contact information for OligoPoly Laboratories and a company-controlled telephone number.
2. Use a company-authorized payment method and billing address. Do not use a university payment method or UHV promotional entitlement.
3. Review the Microsoft agreement and confirm the offer is company-controlled Pay-As-You-Go. Assume every metered service is billable from first use.
4. Create only the initial Azure account/subscription—do not create services. A subscription/billing account can exist with no deployed resources.
5. In [Azure portal](https://portal.azure.com), search **Cost Management + Billing**. Open **Billing scopes** or **Switch scope**, select the new company billing account, and verify:
   - Legal/billing contact is OligoPoly-controlled.
   - Shelby can view payment methods, invoices, and billing access.
   - The subscription appears under the company billing scope.
   - No UHV billing account, directory, sponsorship, or credit is linked.
6. Search **Subscriptions**, open the new subscription, and rename it `OID-STAGING` or `OligoPoly-OID-STAGING`. Record the subscription and billing identifiers only in the approved private administrative register; do not paste them into public documents.

Do not assume or rely on any promotional credit. The declined free-account application is not part of the OID cost plan.

### 3. Establish or verify the OligoPoly Entra workforce tenant

The clean Azure signup may create the home directory automatically. Verify before creating another tenant:

1. In Azure portal, select the account/avatar, then **Switch directory**.
2. Select only the directory whose organization is OligoPoly. Search **Microsoft Entra ID** and open **Overview**.
3. Verify the tenant display name is `OligoPoly Laboratories` (or the approved legal variant), the initial domain is an OligoPoly-specific `*.onmicrosoft.com` name, and Shelby's bootstrap identity is in that tenant as a member—not a guest.
4. Open **Entra ID → Roles and administrators → Global Administrator** and verify a company-controlled bootstrap identity holds the role.
5. If the signup did not create an independent tenant, follow Microsoft's portal path: **Microsoft Entra ID → Overview → Manage tenants → Create → Microsoft Entra ID → Configuration**. Choose organization name `OligoPoly Laboratories` and an OligoPoly-specific initial domain. Review carefully before **Create**.

Microsoft currently limits new Workforce tenant creation to qualifying paid customers/Microsoft Customer Agreement permissions. If **Microsoft Entra ID** creation is unavailable, do not fall back to UHV. Use the clean company Azure signup path or contact Microsoft support for a company tenant. See [Create a Microsoft Entra tenant](https://learn.microsoft.com/en-us/entra/fundamentals/create-new-tenant).

### 4. Secure the primary administrator

1. In [Microsoft Entra admin center](https://entra.microsoft.com), go to **Entra ID → Users → New user → Create new user**.
2. Create a dedicated cloud-only administrative identity such as `shelby.azure-admin@<tenant>.onmicrosoft.com`. Do not use it for email or routine browsing.
3. Assign **Global Administrator** only for bootstrap activities. Keep Shelby's ordinary company user unprivileged for daily work.
4. Register phishing-resistant authentication where practical (passkey/FIDO2 security key) plus an independent recovery method. Never use the UHV mailbox or device as the only recovery dependency.
5. In Azure portal, open **Subscriptions → OID-STAGING → Access control (IAM) → Add → Add role assignment → Privileged administrator roles → Owner**. Assign the dedicated company administrator. Review the scope as the single staging subscription.
6. Keep no more than three subscription Owners. Global Administrator and Azure subscription Owner are separate control planes; verify both deliberately.

### 5. Create emergency access administrators

Microsoft recommends **two or more**, not one:

1. Create two cloud-only accounts using the tenant's `*.onmicrosoft.com` domain, for example `emergency-admin-01` and `emergency-admin-02`.
2. Assign each permanent active **Global Administrator** solely for break-glass recovery.
3. Register separate FIDO2 security keys/passkeys that do not depend on Shelby's normal phone, mailbox, or federated identity.
4. Store credentials/keys in separate secure physical locations accessible only under the incident-response procedure.
5. Exclude the emergency accounts from Conditional Access policies that could lock them out, while protecting them with phishing-resistant authentication.
6. Alert on every sign-in, prohibit routine use, test at least every 90 days, and review every use. Follow [Microsoft emergency access guidance](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/security-emergency-access).

Emergency Entra Global Administrator does not automatically grant an OID application role and must never bypass OID Quality, release, allocation, audit, purchasing, or exception controls.

### 6. Enable MFA baseline

1. In Entra admin center, open **Entra ID → Overview → Properties → Manage security defaults**.
2. Confirm **Security defaults** is enabled for the new tenant during bootstrap. It is intended for Entra ID Free tenants and protects privileged Azure portal activity. See [Security defaults](https://learn.microsoft.com/en-us/entra/fundamentals/security-defaults).
3. Register MFA/passkeys for the primary admin and all pilot users. Test sign-in and recovery before deleting temporary bootstrap credentials.
4. Before OID application activation, decide whether standalone Entra ID P1 is required for a scoped `OID-STAGING-REQUIRE-MFA` Conditional Access policy. Do not purchase licenses until the identity/security owner approves the exact count and monthly cost.

### 7. Establish billing ownership and an independent backup

1. In **Cost Management + Billing**, open the company billing scope and **Access control (IAM)** or the billing-role pane available for the agreement type.
2. Verify Shelby's company admin is Billing account owner/Account administrator or the equivalent highest company billing role.
3. Add one independent, company-authorized backup billing administrator. Do not assign UHV or contractors as the sole backup.
4. Confirm invoices, payment-method notifications, security notices, and service-health contacts go to company-controlled addresses.
5. Configure no resource budget manually yet. The reviewed Bicep now defines a $55 resource-group budget with early/critical actual and forecast notifications; it will be created only as part of an explicitly approved staging deployment.

Billing roles and Azure resource roles are distinct. Validate both. See [Azure billing accounts and scopes](https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/view-all-accounts).

### 8. Adopt least-privilege administration

Create or approve these groups/roles after tenant ownership is confirmed:

| Principal | Minimum intended access | Standing access rule |
|---|---|---|
| Primary cloud admin | Entra Global Administrator for bootstrap; later reduce if operationally possible | Separate admin identity; MFA/passkey; no routine application use |
| Emergency admins | Entra Global Administrator | Emergency only; monitored and tested |
| Shelby deployment admin | Azure Owner initially, or Contributor plus Role Based Access Control Administrator where duties require access assignment | `OID-STAGING` subscription only; maximum three Owners |
| Future operators | Contributor at `oid-staging-rg` only | No subscription Owner; no production scope |
| Auditors/reviewers | Reader / Cost Management Reader as required | Read-only |
| OID workload identity | Blob Data Contributor, Key Vault Secrets User, ACR Pull at exact resources | Created by Bicep; no tenant role |

Do not conflate Azure roles with OID roles. OID's Operations, Quality, Commercial, Auditor, and Administrator permissions remain governed by `RBAC_MATRIX.md` and database controls.

### 9. Confirm staging/production separation

- Create/retain only the `OID-STAGING` company subscription during onboarding.
- Use synthetic records and non-sensitive test documents only.
- Reserve names and governance for a future separate `OID-PRODUCTION` subscription. Do not create production resources or connect live integrations.
- Production must have separate resource group(s), Key Vault, managed identities, PostgreSQL, Blob account, Container Apps, monitoring, backups, Entra enterprise application, secrets, budgets, and approvals.
- Never clone staging secrets or synthetic credentials into production.

## CODEX CAN DO AFTERWARD

After Shelby confirms the company tenant/subscription and authorizes read-only inspection, Codex can:

1. Run `az login --tenant <company-tenant>` through Microsoft's normal device/browser flow and confirm the selected account is a member of the OligoPoly tenant.
2. Report tenant/subscription/billing ownership with identifiers redacted.
3. Verify Shelby's Entra and Azure roles, independent administrators, MFA baseline, and billing access evidence.
4. Check provider registration status without registering providers.
5. Check East US service/SKU availability.
6. Populate an uncommitted company staging parameter file with approved identifiers—never secrets.
7. Run Bicep offline build, Azure ARM `validate`, and `what-if`; these do not intentionally create OID resources, but Azure validation behavior and provider requirements will be reviewed before execution.
8. Refresh the $30–$75/month estimate using the company subscription's pricing context.
9. Produce a final pre-provisioning diff and ask Shelby for explicit resource/cost authorization.

The existing portable Bicep package requires new parameter values, identities, and secrets, but no OID architecture redesign.

## DO NOT DO YET

- Do not authenticate Azure CLI, an Entra application, Bicep, or OID against UHV.
- Do not use, transfer, or reference the UHV subscription or $200 credit.
- Do not register Azure resource providers.
- Do not run `az deployment sub create` or create any Azure resource.
- Do not create an Entra OID enterprise application, client credential, managed identity, Key Vault secret, database, storage account, registry, or Container App yet.
- Do not purchase Entra P1, Microsoft 365, support, Defender, Front Door, domains, or any other license/service without explicit cost approval.
- Do not change public DNS. Adding the OligoPoly custom domain to Entra requires a registrar TXT/MX verification record and is deferred. Use company-controlled `*.onmicrosoft.com` cloud-only administrator identities until DNS change is separately approved. See [add a custom domain](https://learn.microsoft.com/en-us/entra/fundamentals/add-custom-domain).
- Do not create `OID-PRODUCTION`, deploy publicly, or connect real OligoPoly/customer/supplier/lab/financial/WooCommerce/document/inventory data.
- Do not weaken OID RBAC, audit immutability, release, allocation, independent testing, or exception controls.

## Shelby completion checklist

- [ ] Company-controlled bootstrap mailbox and recovery methods confirmed.
- [ ] Azure signup/billing agreement owned by OligoPoly, with no UHV link.
- [ ] OligoPoly Entra tenant verified; Shelby is a member and company Global Administrator.
- [ ] `OID-STAGING` subscription appears under the company billing scope.
- [ ] Shelby company admin is subscription Owner/equivalent and billing owner/equivalent.
- [ ] Separate daily user and dedicated admin identity established.
- [ ] At least two cloud-only emergency administrators secured and tested.
- [ ] MFA/security defaults verified; P1 decision deferred or separately approved.
- [ ] Independent backup billing/subscription administrator established.
- [ ] UHV identities, subscription, tenant, and credit are absent.
- [ ] No resources, DNS records, paid licenses, or production environment created.
- [ ] Shelby authorizes Codex to perform read-only company-tenant inspection.

Stop after completing the identity/tenant/subscription ownership evidence. Provisioning remains a separate explicit approval gate.
