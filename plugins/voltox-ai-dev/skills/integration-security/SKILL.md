---
name: integration-security
description: Security baseline for every Voltox × wallee integration — security levels L1–L3, OAuth 2.1 / FAPI 2.0, JWT request signing, secrets, TLS, webhooks, idempotency, logging, mobile hardening, PCI DSS scope, biometric data protection and SCION network options. Use when designing auth, storing credentials, exposing or calling APIs, hardening apps or devices, or answering "is this secure?".
---

# Integration security baseline

**TRIGGER WHEN:** anything authenticates, stores or transmits credentials, card-related data or biometric results; any API, webhook, app or device is exposed; or someone asks whether a design is secure.

**SYMPTOMS:** "client secret", "API key", "token", "OAuth", "JWT", "TLS", "certificate", "webhook", "retry", "idempotent", "log", "PCI", "GDPR", "nDSG", "biometric", "root/jailbreak", "SCION".

## Security levels (choose one per integration; default L2)

| Level | When | Must have (in addition to the lower level) |
|---|---|---|
| **L1 Pilot** | Test environment, few devices, no live money | Secrets outside code; TLS ≥ 1.2; fail-closed results; no PAN/biometrics in logs |
| **L2 Production** | Live merchants | Everything in the API and terminal self-assessments marked *mandatory*; OAuth 2.1 with PKCE for user-facing auth; short-lived tokens (≤ 15 min access, rotating refresh); secret rotation ≤ 90 days; webhook signature verification; idempotency; monitoring and alerting; incident runbook |
| **L3 Regulated / high volume** | Large estates, regulated sectors, cross-border | **FAPI 2.0 Security Profile** for own APIs: sender-constrained tokens (DPoP or mTLS), `private_key_jwt` or mTLS client authentication, Pushed Authorization Requests; HSM/KMS-held keys; external penetration test before go-live and yearly; 24/7 alerting; SBOM and signed releases |

## Decision workflow
1. **Pick the level.** Write it into the blueprint.
2. **Identity and auth per hop:**
   - Device/app → your backend: OAuth 2.1 (Authorization Code + PKCE for users; client credentials with `private_key_jwt`/mTLS for machines). No ROPC, no implicit flow, no long-lived static API keys on devices.
   - Your backend → wallee API v2.0: per-request JWT signed with the application user key (held in a vault/KMS on the backend only).
   - Your backend → Voltox: Client ID/Secret only on servers or in the SDK's secure configuration; never in web pages.
   - MCP/AI tools → APIs: OAuth with audience-bound tokens (resource indicators); **no token passthrough**.
3. **Transport:** TLS 1.3 preferred (≥ 1.2 with strong suites), HSTS on web, certificate validation always on; LTI only inside a protected LAN segment.
4. **Secrets:** vault/KMS, per environment, least privilege, rotation, never in source control, CI logs or crash reports; secret scanning in CI.
5. **Data minimisation:** no PAN, CVC, track data, face or document images, dates of birth in your systems or logs. Store outcomes, ids and timestamps only.
6. **Webhooks:** verify signatures, enforce HTTPS, check freshness/replay, process idempotently, read the entity from the API.
7. **Idempotency and retries:** unique reference per operation; exponential backoff with jitter; retry only idempotent operations; recover state before any retry of a payment.
8. **Mobile/terminal apps:** OWASP MASVS L2; release builds without debug; obfuscation; root/jailbreak and emulator detection where payments or biometrics run; certificate validation; no secrets in the APK.
9. **Logging & monitoring:** structured logs with correlation ids, no personal data; alerts on error rates, latency (performance budget) and auth failures.
10. **Supply chain:** pinned dependencies, lockfiles, SBOM, dependency scanning; signed releases.
11. **Privacy:** biometric processing is special-category data (GDPR Art. 9, Swiss nDSG); explicit consent, DPIA, retention and deletion, processor agreements.
12. **Network option — SCION:** see [references/scion.md](references/scion.md).

## Anti-patterns

| Wrong | Right | Why |
|---|---|---|
| Static API key in a terminal/app | Short-lived tokens issued by your backend | Extraction from devices |
| `verify=false` / trust-all certificates | Always validate certificates | MITM |
| Logging full requests/responses | Redacted structured logs | Secret and data leaks |
| Retrying POST payment on timeout | Read state, then decide | Double charge |
| Long-lived OAuth access tokens | ≤ 15 min + rotating refresh tokens | Token theft impact |
| Passing the user's token from MCP to downstream API | Exchange/audience-bound tokens | Confused deputy |
| Storing face images "for audit" | Store outcome + id only | Biometric data minimisation |
| "We use SCION, so TLS is optional" | SCION + TLS/mTLS | Different layers |

## References
- [references/standards.md](references/standards.md) — the standards behind this baseline.
- [references/scion.md](references/scion.md) — SCION, SSFN and SEPN for payment connectivity.
