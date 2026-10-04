# OID owner access recovery: Entra object-ID authorization (2026-10-04)

## Root cause

Staging runs Easy Auth → `identity-bridge` → OID (`OID_IDENTITY_MODE=trusted-proxy`). Microsoft sign-in succeeded and the bridge forwarded the request, but OID authorized **only by email** (`User.email == x-oid-user-email`). No OID `User` row existed for Shelby, so every request threw `UNAUTHORIZED:USER_INACTIVE_OR_UNKNOWN`. That rendered the generic "OID could not confirm an approved session with required MFA" page. It had three problems:

* The `OID-AUTH-401-…` reference was a fresh random UUID generated at render time, so it correlated with nothing on the server.
* "Return to sign in" linked to `/login`, the internal-token form. That form cannot create a session in trusted-proxy mode (`POST /api/v1/session` → `SSO_LOGIN_REQUIRED`), and no `OID_INTERNAL_ACCESS_TOKEN` is deployed. This is the loop.
* There was no path to create the first owner, so OID had a circular dependency.

Shelby is a B2B guest (`labs_oligopolypeptides.com#EXT#@…`). The bridge took whichever of `preferred_username`/`email`/`upn` came first, so the `#EXT#` UPN could also be chosen as the "email".

## Fix (this release)

| Layer | Change |
|---|---|
| `scripts/azure-identity-bridge.mjs` | Extracts the immutable object ID (`oid` claim or `X-MS-CLIENT-PRINCIPAL-ID`), tenant, audience (`OID_ALLOWED_AUDIENCES`), groups, and MFA (`amr` ∈ mfa/ngcmfa/fido). It never uses a `#EXT#` UPN as the email. Each request gets a server-minted `x-oid-auth-ref`. Denials log `BRIDGE_AUTH_DECISION` with `NO_PRINCIPAL` / `WRONG_TENANT` / `WRONG_AUDIENCE` / `MFA_CLAIM_MISSING` and the same reference shown to the user. |
| `lib/auth/entra.ts` (new) | Looks the user up by `User.authProviderId = <object ID>`. Email is only used once, to link a pre-existing unlinked record. Reason codes: `NO_PRINCIPAL`, `UNTRUSTED_IDENTITY_PROXY`, `WRONG_TENANT`, `MFA_CLAIM_MISSING`, `GROUP_MISSING`, `LOCAL_USER_MISSING`, `LOCAL_USER_DISABLED`, `LOCAL_USER_NO_ROLE`, `SESSION_CREATION_FAILED`, logged as `AUTH_DECISION` with the user's reference. |
| Owner bootstrap | Applies only when all of these hold: the object ID is in `OID_OWNER_BOOTSTRAP_OBJECT_IDS`, the tenant matches `OID_ALLOWED_TENANT_ID`, MFA is proven, and `OID_OWNER_BOOTSTRAP_GROUP_ID` is in the groups claim. If no record exists, it creates the user as ACTIVE with `OID_OWNER_BOOTSTRAP_ROLE` (FOUNDER). It writes `CREATE` + `PERMISSION_CHANGE` + `LOGIN` audit rows. It never applies to any other identity, and it never revives an owner record an admin has disabled. |
| `app/_components/AccessDenied.tsx` | Shows the bridge reference, so the browser code matches the server log line. In SSO mode the action is "Sign out and try again" (`/.auth/logout`), not the token form. It no longer logs on render: Next.js pre-renders that boundary on every request. |
| `app/login/page.tsx` | In trusted-proxy production it redirects to `/command-center`, so the token form is never shown. |
| `AuthorizedShell` | Shows the signed-in email and a **Sign out** link (`/.auth/logout`). |
| `infra/` | Adds the env vars above. `ownerBootstrapObjectIds = ['bab63204-7cb9-465d-a074-56124afeaa98']` in `oid-staging.local.bicepparam`. |
| `ops/identity/bootstrap-owner.sql` | Idempotent manual fallback that creates or links Shelby's record directly in PostgreSQL. |

No secrets were added. Every value above is a public identifier: tenant, client, group, or object ID.

## Deploy to staging (requires Azure access to subscription `94e34b9c-…`)

From `oid-app/`:

```bash
RG=oid-staging-rg; APP=oid-staging-app-qgvnukjcy7jwk; ACR=oidstagingacrqgvnukjcy7jwk
TAG=auth-objectid-2026-10-04
az acr build -r $ACR -t oid-application:$TAG --target runtime .
IMG=$ACR.azurecr.io/oid-application:$TAG

# 1) Bridge first. The new bridge only adds headers, so the old app keeps working.
az containerapp update -g $RG -n $APP --container-name identity-bridge --image $IMG \
  --set-env-vars OID_ALLOWED_AUDIENCES=3374f580-d9d4-4d42-8e44-cbcc95fa6317,api://3374f580-d9d4-4d42-8e44-cbcc95fa6317
# 2) App
az containerapp update -g $RG -n $APP --container-name oid --image $IMG \
  --set-env-vars OID_ALLOWED_TENANT_ID=595ff05a-ce72-406d-82ff-e3f924d7f0e1 \
    OID_OWNER_BOOTSTRAP_OBJECT_IDS=bab63204-7cb9-465d-a074-56124afeaa98 \
    OID_OWNER_BOOTSTRAP_GROUP_ID=da7ae7e7-0bb3-4bdf-a411-75726b97b418 \
    OID_OWNER_BOOTSTRAP_ROLE=FOUNDER
```

No schema migration is needed: `User.authProviderId` already exists. Do **not** rerun the full Bicep deployment just for this. It re-writes the Key Vault DB and proxy secrets from the deployer's environment.

Optional: if you want Shelby's record in place before her first login, or the deploy is delayed, run `ops/identity/bootstrap-owner.sql` with the migration role.

## Verify

1. `curl -s https://oid-staging-app-qgvnukjcy7jwk.jollyfield-2bcf5822.eastus2.azurecontainerapps.io/api/v1/health/ready` → ok.
2. Shelby, in a private window: open `https://oid-staging-app-qgvnukjcy7jwk.jollyfield-2bcf5822.eastus2.azurecontainerapps.io/command-center`, then complete Microsoft sign-in and MFA. Expected: the Command Center dashboard, with her email and **Sign out** in the sidebar.
3. Refresh: the dashboard stays. Sign out, then sign back in: the dashboard appears with no DB change.
4. Logs (Log Analytics):
   `ContainerAppConsoleLogs_CL | where Log_s has "OWNER_BOOTSTRAP" or Log_s has "AUTH_DECISION" or Log_s has "BRIDGE_AUTH_DECISION" | project TimeGenerated, Log_s`
   Any `OID-AUTH-401-XXXXXXXXXXXX` a user reports: `| where Log_s has "XXXXXXXXXXXX"` shows the exact reason code.
5. A non-pilot or unknown account is blocked. Easy Auth blocks it if it is not in the pilot group. Otherwise OID returns 401 `LOCAL_USER_MISSING` and creates no record.

## Break-glass / internal token

The "Internal access" token page is the UI for `OID_IDENTITY_MODE=internal-token`, the pre-Entra pilot mode. In staging (trusted-proxy) it was never usable: no `OID_INTERNAL_ACCESS_TOKEN` is configured, and the session API refuses token logins in this mode. It was not intended break-glass. This release hides it in SSO mode, so **break-glass remains disabled**. Emergency access stays with the Entra emergency-admin accounts and the SQL fallback above, per `ACCESS_CONTROL_RUNBOOK.md`.

## After Shelby is in

You can leave `OID_OWNER_BOOTSTRAP_OBJECT_IDS` set, because it is a no-op once her record exists. Or clear it to close the bootstrap path entirely. Further users are provisioned from inside OID by role, as before. A legacy email-only record is linked to the object ID automatically on that user's first sign-in.
