# Production Identity Plan

## Recommendation

Use Microsoft Entra ID as the identity provider with OIDC, Conditional Access MFA, and an identity-aware proxy in the same private application environment. Only that proxy may reach OID. It must remove any inbound identity headers, validate the Entra issuer/audience/signature/nonce, require MFA, then inject a configured email header plus a high-entropy proxy secret. OID's `trusted-proxy` adapter independently verifies the shared secret, MFA assertion, active database user, and assigned database roles on every request.

The adapter is present, but no external identity service is configured or validated. The internal-token mode is limited to single-user emergency development/pilot bootstrap and is not acceptable for multi-user production.

Microsoft documents Conditional Access authentication strengths for restricting acceptable MFA combinations and managed identity for secretless Azure resource access: [authentication strengths](https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-strength-how-it-works), [managed identities](https://learn.microsoft.com/en-us/azure/container-apps/managed-identity).

## Required configuration

| Variable | Purpose |
|---|---|
| `OID_IDENTITY_MODE=trusted-proxy` | Enables production identity adapter |
| `OID_TRUSTED_PROXY_SECRET` | At least 32 random characters, stored in managed secret store, rotated |
| `OID_IDENTITY_EMAIL_HEADER` | Proxy-injected normalized email header |
| `OID_REQUIRE_MFA=true` | Rejects identity assertions lacking MFA |
| `OID_ALLOWED_ORIGIN=https://...` | Exact HTTPS origin for CSRF checks |
| `DATABASE_URL` | Least-privilege runtime connection with TLS |
| `OID_STORAGE_ROOT` | Private absolute storage mount; object adapter is deployment work |

Provider-side values still required: tenant ID, application/client ID, exact redirect URI, issuer/authority, logout URI, group identifiers, and Conditional Access policy. They must be created only after owner approval.

## Lifecycle

1. Provision the user in Entra and OID with `status=ACTIVE`; match the normalized verified email.
2. Assign the least-privilege OID role after manager/data-owner approval. Do not map arbitrary token role text directly to OID privileges.
3. Require MFA through Conditional Access. Test the actual MFA claim/assertion path before pilot.
4. Disable access by disabling Entra sign-in and setting OID user status inactive. Remove OID role assignments.
5. Revoke Entra sessions/tokens, rotate the proxy secret if compromise is suspected, and restart OID replicas to invalidate internal sessions.
6. Audit provisioning, role change, disablement, failed login, and revocation. Review access quarterly and before pilot expansion.

## Sessions

Production SSO session lifetime, idle timeout, sign-in frequency, and revocation behavior are owned by Entra/proxy policy. OID must use secure, HTTP-only, SameSite=Lax cookies at the proxy and never expose provider tokens to browser JavaScript. Logout must terminate the proxy session and redirect through provider logout where appropriate. Current internal-token browser sessions are opaque random values stored only as SHA-256 hashes, secure, HTTP-only, SameSite=Strict, time-bounded, checked against active-user status, and individually revocable. They do not contain the master token. Production SSO still replaces this bootstrap path before multi-user use.

## Break glass

Maintain two named, cloud-only break-glass administrators protected by strong phishing-resistant credentials, monitored on every use, excluded only from policies necessary to recover access, and forbidden for routine operations. Break-glass restores identity administration; it does not bypass OID release, independent-test, audit, or allocation controls. Procedure activation and credentials require Shelby/security-owner approval and an out-of-band vault.

## Acceptance test

Before pilot: successful MFA login; absent/false MFA denied; forged header denied; direct app access denied; inactive user denied; role removal effective on next request; session revocation proven; proxy-secret rotation proven; failed events visible; two-person break-glass drill documented.
