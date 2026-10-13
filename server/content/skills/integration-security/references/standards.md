# Standards behind the security baseline

| Area | Standard | Use |
|---|---|---|
| Authorisation | OAuth 2.1 (IETF draft consolidating OAuth 2.0 + BCP) | Authorization Code + PKCE only; no implicit/ROPC |
| OAuth security | RFC 9700 — OAuth 2.0 Security Best Current Practice (2025) | Threat mitigations, redirect URI exact match, refresh token rotation |
| High assurance | OpenID FAPI 2.0 Security Profile | L3 profile for financial-grade APIs |
| Sender-constrained tokens | RFC 9449 (DPoP), RFC 8705 (mTLS) | Stolen tokens are useless |
| Client authentication | RFC 7523 (`private_key_jwt`), RFC 8705 | No shared secrets at L3 |
| Pushed authorization | RFC 9126 (PAR) | Integrity of authorization requests |
| Rich authorization | RFC 9396 (RAR) | Fine-grained consent (e.g. per payment) |
| Resource binding | RFC 8707 (Resource Indicators), RFC 9728 (Protected Resource Metadata) | Audience-bound tokens; required by the MCP authorization specification |
| MCP | Model Context Protocol authorization specification | OAuth 2.1 for remote MCP servers, no token passthrough |
| Transport | TLS 1.3 (RFC 8446) | Encryption in transit |
| API security | OWASP API Security Top 10 (2023) | Broken object-level auth, auth, resource consumption, SSRF… |
| Mobile | OWASP MASVS / MASTG | App hardening and testing |
| Cards | PCI DSS v4.0.1; PCI PTS (terminals); PCI MPoC (SoftPOS) | Scope minimisation via hosted card entry and certified devices |
| Cards (ep2) | ep2 Specification 8.3.0 | Terminal behaviour, surrogate PAN, stored credentials (BUC 40) |
| Biometrics/privacy | GDPR (Art. 9, 35 DPIA), Swiss nDSG | Consent, DPIA, minimisation |
| Age (DE) | JMStV / KJM criteria | Closed user groups, age estimation buffer |
| Presentation attacks | ISO/IEC 30107-3 | Liveness testing principles |
| Network | SCION (ETH Zurich), SSFN, SEPN | Path-aware, isolated networks for finance and ep2 |
