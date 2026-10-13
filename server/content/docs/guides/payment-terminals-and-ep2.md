---
title: Payment terminals and ep2
section: Guides
order: 1
summary: Combine Voltox with wallee ep2 terminals — choose ATI, LTI or CTI, design the flow, recover safely and prepare the wallee acceptance.
source: wallee LTI documentation 2.54, wallee Android Till SDK, wallee terminal documentation, ep2 8.3 (referenced, not reproduced)
---

# Payment terminals and ep2

Voltox runs **before or around** the card payment; the payment itself always runs on a certified **wallee** terminal. This page shows how to combine both in an ep2 market (Switzerland and others) so that the integration is fast, recoverable and ready for the wallee acceptance.

> Voltox is not an ep2 component and does not certify anything. Terminals are certified by the ep2 bodies; your ECR, kiosk or vending integration is accepted by **wallee**.

## 1. Choose the wallee interface

| Interface | Where your code runs | Choose it when | Speed |
|---|---|---|---|
| **ATI** — Android Till SDK (`com.wallee.android.till:sdk`) | Your app **on** the wallee Android terminal | Voltox SDK and payment on the same device (A-series, Android unattended terminals) | Fastest |
| **LTI** — Local Till Interface | ECR / machine controller in the same LAN (TCP, default port 50000, 4-byte length + XML) | ECR or vending controller next to the terminal; full feature set incl. AdaptAmount for vending | Fast |
| **CTI** — Cloud Till Interface | Anywhere; REST long poll or WebSocket via the wallee cloud | No local network path, web-based tills | Slower (cloud round trip) |

Rule of thumb: **ATI** if your Voltox app can run on the terminal, **LTI** for machines and classic ECRs, **CTI** only when there is no local path.

## 2. The flow

```
Customer → [Voltox: age gate / face]  →  [wallee terminal: card payment]  →  deliver / complete
              fail closed                   unique reference, timeouts
```

1. **Age gate first** (if the item is age-restricted): accept only `RESULT_OK && isVerified == true`. Everything else is a refusal.
2. **Start the payment** with a unique reference (`merchantReference` on LTI). Optionally request `panHashVariants` for card recognition (see [Surrogate PAN](surrogate-pan.md)).
3. **Wait longer than the terminal.** Your ECR/machine timeout must be longer than the terminal's maximum transaction time (card read + PIN + host).
4. **Deliver** only after approval; for unattended machines after **card removal**.
5. **Day-end** (final balance) manually and automatically.

## 3. Recover instead of retrying

After a lost connection or a restart, **read the last transaction state first** and then book or reverse automatically. On LTI use `trxSyncNumber`, the last-transaction data and `origTrxSeqCnt` for reversals. On CTI, an HTTP **543** from `performTransaction` means "call again with the same parameters". Never start a second payment for the same purchase.

## 4. Network and device security

- The terminal sits in a **protected network segment**; no inbound internet access to the terminal or the LTI port.
- Remote maintenance of the ECR has no access to the terminal.
- **Deferred/offline authorisation stays off** unless wallee approves it in writing.
- Never enter card numbers manually over LTI.
- wallee Paydroid remains the home app on Android terminals.

## 5. Card-present stored credential (Smile & Pay on wallee)

ep2 defines how a stored credential is established at the terminal (business use case 40: purchase or account verification with cardholder verification). This is the target design for running Smile & Pay payments on wallee — see [Smile & Pay](../products/smile-and-pay.md). The transfer of the terminal credential to a wallee token and the flags for later customer-initiated payments must be **confirmed with wallee**.

## 6. Prepare the wallee acceptance

1. Run the terminal self-assessment (environment **AT** for attended, **UAT** for unattended) — with the AI Dev MCP: `voltox_self_assessment_get kind=terminal`.
2. Collect evidence (logs, receipts, screenshots) for every mandatory item. A mandatory item without evidence counts as **not run**.
3. Hand the result to wallee for the acceptance test. Unattended machines in Switzerland additionally need the machine check (see [Vending and MDB](vending-and-mdb.md)).

## 7. Network trend: SCION

Swiss card-payment traffic is moving to SCION-based networks (SSFN for the Swiss financial market, SEPN for ep2 payment services). This concerns the terminal provider and acquirer path, not your ECR protocol. See [Security, privacy and compliance](../security-privacy-compliance.md).

## Checklist

- [ ] Interface chosen (ATI / LTI / CTI) and documented
- [ ] Age gate fail-closed before the payment
- [ ] Unique reference per payment, duplicates detected
- [ ] ECR timeout > terminal maximum transaction time
- [ ] Automatic recovery after connection loss and power failure
- [ ] Terminal in a protected segment, deferred mode off
- [ ] Final balance manual + automatic
- [ ] Terminal self-assessment complete with evidence
