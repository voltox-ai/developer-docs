---
title: Testing and go-live
section: Guides
order: 6
summary: Test environment, test cards, performance budget, the two hard self-assessments and the go-live sequence with Voltox and wallee.
---

# Testing and go-live

## 1. Test environment

- Use **test** credentials from the Voltox dashboard and a **wallee test space / test terminal**. Never test with live credentials or real cards.
- Use only public test card numbers. Never paste real card numbers, secrets or face images into tickets, chats or AI tools.
- Voltox developer mode is for test builds only; release builds must have it off.

## 2. Performance budget (p95)

| Step | Budget |
|---|---|
| SDK screen visible | ≤ 500 ms |
| Face → age decision | ≤ 3 s |
| Face → Smile & Pay `onPaid` | ≤ 5 s |
| Card tap → surrogate PAN | ≤ 1 s |
| Card tap → payment result | ≤ 3 s |
| Your server call | ≤ 800 ms |
| Webhook → final state | ≤ 2 s |
| Device ready after boot | ≤ 30 s |

Measure in your test runs and attach the numbers as evidence.

## 3. The two hard self-assessments

| Catalogue | For | Basis |
|---|---|---|
| **Terminal** (AT / UAT) | Attended POS, kiosks, vending, SoftPOS | wallee ep2 integration self-assessment, extended with Voltox, surrogate PAN and device-security items |
| **API** (L1 / L2 / L3) | E-commerce, apps, backends, cloud | OAuth 2.1 / FAPI 2.0, wallee JWT v2.0, webhooks, idempotency, PCI DSS 4.0.1, GDPR/nDSG, performance, observability, supply chain |

Rules that make them hard:
- **Mandatory** items must be *passed with evidence* or *waived in writing*.
- A passed item **without evidence counts as not run**.
- Any failed mandatory item → **NOT ACCEPTABLE (failed)**; any open one → **NOT ACCEPTABLE (open)**.
- L3 turns FAPI-grade controls (sender-constrained tokens, `private_key_jwt`/mTLS, PAR, HSM/KMS) into mandatory items.

With the AI Dev MCP: `voltox_self_assessment_get` → work through the items → `voltox_self_assessment_evaluate` returns status and a Markdown report.

## 4. Go-live sequence

1. Automatic review of your code (`voltox_review_integration`) — no blocking findings
2. Self-assessment(s) **ACCEPTABLE**
3. wallee acceptance test (terminal integrations) / machine check (Swiss vending)
4. Switch Voltox and wallee to **live** credentials (vault, rotation plan)
5. Pilot with a small number of devices, monitor error rates and the performance budget
6. Roll out
