# Access Control Runbook

## Provision

Require a ticket naming person, manager, business need, requested OID role, expiry if temporary, and data/quality owner approval. Verify the person in the identity provider, create one OID user with normalized verified email, assign the minimum role, require MFA, and audit the assignment. Test only the expected read/write actions and required denials.

## Change

Role changes require the same approval as new access. Record previous/new roles as `PERMISSION_CHANGE`. Prevent toxic combinations: System Admin plus Quality Admin, Auditor plus write role, and AI Assistant plus any human authority. Founder is never a convenience role.

## Disable and revoke

For departure or incident: disable IdP sign-in, revoke provider sessions/tokens, set OID user inactive, remove role assignments, revoke matching OID `AuthSession` records, terminate proxy sessions, rotate shared secrets if exposure is possible, and verify the next request is denied. OID stores only SHA-256 session-token hashes; logout sets `revokedAt` and records a `LOGOUT` audit event. Preserve audit history; do not delete the user. Emergency revocation is immediate and approval may be documented retrospectively.

## Review

Quarterly, export active users/roles, reconcile with employment/contract status and tickets, review last login/Founder use/dormancy, recertify with managers and quality/data owners, remove excess access, and retain evidence. Review break-glass accounts separately and alert on every use.

## Break glass

Two named accounts, out-of-band credentials, phishing-resistant MFA, no routine use, and immediate alerting. Use requires incident/ticket ID and post-use review. Break glass may repair identity access but cannot bypass database or quality controls.

## Pilot revocation acceptance

Locally proven: inactive OID user denial, individual session revocation, logout, replay rejection, and global internal-token rotation. Before pilot also prove: disabled provider user denied, provider sessions revoked within the approved maximum, removed role denied server-side, direct application endpoint denied, and provider/OID audit events correlated. Production access is blocked until this external IdP test passes.
