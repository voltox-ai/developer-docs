---
title: Security, privacy and compliance
section: Start
order: 5
summary: Security levels L1–L3, authentication per hop (OAuth 2.1, FAPI 2.0, wallee JWT), secrets, data minimisation for card and biometric data, PCI DSS, GDPR/nDSG and SCION.
---

# Security, privacy and compliance

## Security levels

| Level | When | Adds |
|---|---|---|
| **L1 Pilot** | Test only | Secrets outside code, TLS ≥ 1.2, fail-closed results, no card or biometric data in logs |
| **L2 Production** (default) | Live merchants | All mandatory self-assessment items; OAuth 2.1 + PKCE; access tokens ≤ 15 min, rotating refresh tokens; secret rotation ≤ 90 days; webhook signatures; idempotency; monitoring; incident runbook |
| **L3 Regulated / high volume** | Large estates, regulated sectors | **FAPI 2.0**: sender-constrained tokens (DPoP or mTLS), `private_key_jwt` or mTLS client auth, Pushed Authorization Requests; keys in HSM/KMS; yearly penetration test; SBOM and signed releases |

## Authentication per hop

| Hop | Mechanism |
|---|---|
| Device/app → your backend | OAuth 2.1 (Authorization Code + PKCE for people; client credentials with `private_key_jwt`/mTLS for machines). No implicit flow, no password grant, no static keys on devices. |
| Your backend → wallee API v2.0 | Fresh JWT per request, signed with the application user key (vault/KMS, backend only) |
| Your backend / SDK → Voltox | Client ID in app config; Client Secret only server-side or in the SDK's secure configuration — never in web pages |
| AI tools (MCP) → APIs | OAuth with audience-bound tokens; no token passthrough; writes need human confirmation |

## Data minimisation

Never store or log: card numbers, CVC, track data, face images or templates, document images, dates of birth. Store **outcomes, ids and timestamps**. For card recognition use the [surrogate PAN](guides/surrogate-pan.md).

## Card data — PCI DSS

Keep card entry on wallee (terminal, SoftPOS, payment page/iframe). Then your systems stay out of most PCI DSS scope. Never build your own card form or enter card numbers manually.

## Biometric data — GDPR / Swiss nDSG

Face processing is special-category personal data (GDPR Art. 9; sensitive data under the Swiss nDSG). You need explicit consent where required, a data protection impact assessment, retention and deletion rules and processor agreements. Voltox handles the biometric processing; your systems receive results only.

## Mobile and terminal apps

OWASP MASVS L2: release builds without debug, obfuscation, root/emulator detection where payments or biometrics run, certificate validation, no secrets in the APK.

## Network — SCION

SCION is a path-aware internet architecture from ETH Zurich. In Switzerland the **Secure Swiss Finance Network (SSFN)** of SIX and the Swiss National Bank runs on it, and the **Secure ep2 Payment Network (SEPN)** brings it to card-payment services. SCION complements TLS/mTLS — it does not replace it. For most integrators it concerns the terminal provider and acquirer path; large estates (L3) can evaluate SCION connectivity for their own backends.

## Boundaries of the AI Dev MCP

Read-only by default; writes need the skill's BestPracticeKey **and** your confirmation; production writes off by default; no secrets, card data or biometrics accepted; fail-closed code; no certification claims. See [Voltox AI Dev MCP](mcp-in-claude.md).
