# Ask OID Security Review

Ask OID is retrieval and answer composition only. It cannot call release, supplier qualification, purchase authorization, allocation, exception closure, role administration, or arbitrary write tools.

Implemented controls:

- `intelligence.query` is required; entity-specific read permission is checked before retrieval.
- Test and exception queries are omitted entirely when the actor lacks those permissions, so unauthorized records never enter context.
- Database selects are field-minimized; supplier security/payment fields and unrelated document content are excluded.
- Evidence references are created only from records retrieved from PostgreSQL. The answer builder rejects unrecognized/generated evidence IDs.
- Independent-test status is retained. Only reviewed, independent PASS evidence can clear the relevant unknown.
- Missing scoped data is reported explicitly as unknown. Conflicting/failed evidence remains visible and is not overwritten by a passing record.
- Every query is recorded; source records are never updated by prompt/result handling.
- AI Assistant is marked nonhuman and has no privileged transaction permission.

Automated adversarial tests cover missing lot permission, scoped-out test/exception evidence, AI release denial at the server route, generated evidence-reference rejection, conflict preservation, and unknown reporting.

Open before any external model integration: approve data classification and prompt-field allowlist; select region/retention/no-training terms; prohibit provider logging where possible; define prompt-injection defenses for uploaded text; add output DLP/redaction; test tenant isolation; document incident deletion; and obtain owner/security/legal approval. Current deterministic local composer does not send data to an external model.
