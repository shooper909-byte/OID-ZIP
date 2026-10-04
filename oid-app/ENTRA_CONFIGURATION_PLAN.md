# Microsoft Entra Configuration Plan — OID Controlled Pilot

Status: plan only; no app registration, enterprise application, group, user, license, or Conditional Access policy has been created or changed.

## Pilot identity boundary

- Single-tenant Entra application (`AzureADMyOrg`) in Shelby's approved company tenant.
- Enterprise-application assignment required; only the approved OID pilot group may sign in.
- Container Apps Easy Auth requires authentication and HTTPS before requests reach the identity bridge.
- The bridge independently verifies the tenant claim, a normalized email/UPN, and an MFA authentication-method claim before injecting OID's signed trusted-proxy headers.
- OID's database user status and OID RBAC remain authoritative for application permissions. Entra access never grants lot release, allocation, supplier approval, purchasing, payment, exception closure, or audit mutation by itself.

## Required Entra objects

| Object | Proposed name | Purpose | Created now? |
|---|---|---|---|
| App registration | `OID-STAGING` | Single-tenant OIDC identity for Container Apps Easy Auth | No |
| Enterprise application | `OID-STAGING` | Assignment enforcement and sign-in/audit surface | No |
| Pilot access group | `OID-STAGING-PILOT-USERS` | Coarse application-entry allowlist | No |
| Emergency operator group | `OID-STAGING-EMERGENCY-ADMINS` | Azure/Entra recovery only; does not bypass OID RBAC | No |
| Conditional Access policy | `OID-STAGING-REQUIRE-MFA` | Require MFA for the pilot enterprise app | No |

## MFA/licensing decision

MFA is mandatory. Preferred enforcement is a scoped Conditional Access policy requiring MFA for the pilot enterprise app and excluding only documented break-glass identities. That normally requires Microsoft Entra ID P1 for each in-scope user; existing Microsoft 365 licensing may already include it. If Shelby chooses Security Defaults instead, a security professional must verify that it provides the required every-user/every-session assurance and that the expected `amr`/authentication-method claim is present. The bridge fails closed when MFA proof is absent.

## Group-to-OID-role mapping

Entra groups are an entry boundary, not the OID authorization database. For 1–3 pilot users, role assignments are entered and reviewed in OID separately under dual-control governance.

| Entra membership | Permitted OID role candidate | OID approval required | Separation rule |
|---|---|---|---|
| Pilot user | Operations, Quality, Commercial, Auditor, or Administrator as approved | Shelby plus Quality/Security owner as applicable | Entra group alone grants no OID role. |
| Emergency administrator | OID Administrator only if separately approved and recorded | Shelby plus Security; time bounded | Cannot perform Quality release merely because it has Azure/Entra admin access. |

All permissions and prohibited combinations remain those in `RBAC_MATRIX.md`. Quality review independence and the prohibition on Operations overriding Quality remain unchanged.

## Configuration sequence

1. Shelby identifies the tenant and confirms whether P1-equivalent licenses already exist for 1–3 pilot users.
2. An authorized Entra administrator creates the single-tenant app and enterprise application with user assignment required.
3. Add only this redirect URI after the staging Container Apps FQDN is known: `https://<staging-fqdn>/.auth/login/aad/callback`. Add the eventual pilot hostname redirect only after DNS approval.
4. Enable ID tokens; create a short-lived client credential and place it directly in Key Vault through the approved secret workflow.
5. Create/approve the pilot group and configure it as the Easy Auth allowed-principals group.
6. Apply MFA policy, session lifetime, sign-in risk, and emergency exclusions after security review.
7. Add one pilot user at a time; verify OID user record is active and assign only the separately approved OID role.
8. Execute positive sign-in, wrong-tenant, non-member, no-MFA, disabled-user, removed-group, expired/revoked session, and header-spoof tests.

## Disablement and revocation

For ordinary offboarding or suspected compromise:

1. Disable the Entra user and revoke Entra refresh tokens/sessions.
2. Remove the user from the OID pilot group.
3. Set the OID user to `INACTIVE` and revoke OID sessions.
4. Review OID audit events, Entra sign-in logs, Container Apps logs, Key Vault access, and Blob access.
5. Validate that an existing browser session and a replayed internal session both fail.

Emergency disablement target is 15 minutes from authorization. A disabled Entra identity and an inactive OID record are both required; neither layer substitutes for the other.

## Emergency administrator

- Two named break-glass identities maximum, cloud-only, phishing-resistant MFA where available, monitored on every sign-in, credentials sealed in the company emergency process.
- Excluded from ordinary Conditional Access only where necessary to prevent lockout; never used for routine work.
- Azure/Entra recovery access does not confer OID Quality, release, allocation, purchasing, payment, or exception-closure authority.
- Every use triggers incident review and credential rotation.

## Evidence required before application deployment

- Tenant ID and enterprise-app export with secrets redacted.
- Assignment-required and allowed-group evidence.
- Conditional Access/MFA policy and license evidence.
- Redirect URI and HTTPS-only evidence.
- Positive MFA sign-in plus all negative tests above.
- Disablement/session-revocation drill with timestamps.
- OID audit evidence showing identity and RBAC decisions.

Reference: [Authentication and authorization in Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/authentication).

