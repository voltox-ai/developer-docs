# SCION for payment connectivity

## What SCION is
SCION is an internet architecture developed at ETH Zurich. Independently operated networks interconnect with cryptographically authenticated path segments; senders choose and control the paths their data takes, can avoid networks or jurisdictions, and fail over between several active paths. It runs alongside the public internet; gateways at the network edge let organisations adopt it without changing applications.

## Where it is used in Swiss payments
| Network | Operator / members | Purpose | Status (public sources) |
|---|---|---|---|
| **SSFN** — Secure Swiss Finance Network | SNB and SIX | Connectivity to SIC (RTGS) and SIX infrastructure services | Launched 2021; replaced Finance IPNet for SIC by end of June 2024; > 100 participants |
| **SEPN** — Secure EFTPOS Network | Worldline with the SEPN Association (founding members include TeCo ep2, Verband Elektronischer Zahlungsverkehr, Swiss Payment Association), technology partner Anapaya | Exchange of cashless payment data (ep2 POS and ATM services) independently of the public internet; access requires certification | First services live August 2025; SBB and Coop among early users |

## What it means for a Voltox × wallee integration
- **Terminal ↔ acquirer path:** handled by the terminal provider and acquirer. Ask wallee for its SEPN/SCION roadmap; nothing changes in your ECR protocol.
- **Your backend ↔ wallee/Voltox APIs:** today over the public internet with TLS. A SCION gateway (e.g. cloud marketplace offerings) can add path control and resilience for critical estates, if the counterpart offers SCION connectivity.
- **Assessment:** item `API-NET-04` (optional) records SCION readiness; it never replaces TLS/mTLS.

## Boundaries
- SCION secures *routing and availability*, not application data: keep TLS/mTLS and application-level signatures.
- SEPN participation requires certification; you cannot simply "connect".
- Don't claim SCION protection for a path you don't control end to end.

Sources: SNB Economic Note 2026-07; SIX SSFN product page; SCION Association; Netzwoche 17.10.2025 (SEPN).
