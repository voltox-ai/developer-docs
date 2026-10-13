---
name: wallee-terminal-ep2
description: Integrate payments on wallee ep2 terminals (attended POS and unattended machines) with the Android Till SDK (ATI), Local Till Interface (LTI) or Cloud Till Interface (CTI). Use when code talks to a wallee terminal, handles transaction results, reversals, reservations, day-end, recovery after connection loss, or prepares the wallee/ep2 acceptance.
---

# wallee terminals and ep2

**TRIGGER WHEN:** an ECR, kiosk, vending controller or app starts, monitors, reverses or reconciles card payments on a wallee terminal; or the team prepares wallee acceptance / ep2 conformity.

**SYMPTOMS:** `com.wallee.android.till`, `ApiClient`, `ResponseHandler`, `financialTrxRequest`, `vcs-pos`, port `50000`, `trxSyncNumber`, `merchantReference`, `origTrxSeqCnt`, `transactionRefNumber`, `AdaptAmount`, `CancelReservation`, `BEFinalBalance`, `performTransaction`, HTTP `543`, `terminal-websocket`, "ep2", "TID", "final balance", "Tagesabschluss".

## Pick the interface

| Interface | Runs where | Use when | Speed |
|---|---|---|---|
| **ATI** – Android Till SDK (`com.wallee.android.till:sdk`) | Your app on the wallee Android terminal | Voltox SDK and payment on the same device (A-series, unattended Android terminals) | Fastest, on-device |
| **LTI** – Local Till Interface | ECR/VMC in the same LAN, TCP to the terminal (default port 50000), 4-byte big-endian length + XML | ECR or machine controller next to the terminal; richest feature set; **required for vending features** such as AdaptAmount | Fast (local) |
| **CTI** – Cloud Till Interface | Any network; REST (`create` transaction + `performTransaction` long poll) or WebSocket (STOMP, `wss://app-wallee.com/terminal-websocket`) | No local network path, web-based till | Slower (via cloud); long poll up to ~80 s, HTTP 543 = call again with same parameters |

## Decision workflow
1. **Interface** from the table. Prefer ATI or LTI when speed matters.
2. **Unique reference** on every payment request (`merchantReference` on LTI). Detect duplicates; never charge twice (R-083, T-061).
3. **Timeout chain:** ECR/VM timeout > terminal maximum transaction time (card read + PIN + host) (R-082). Never give up before the terminal.
4. **Recovery after connection loss:** on reconnect, determine the last transaction status and book or reverse automatically (R-076, T-040). On LTI use `trxSyncNumber` and the last-transaction data; reverse with `origTrxSeqCnt`.
5. **Unattended:** reservation → delivery → completion with the effective amount (AdaptAmount on LTI for vending; CancelReservation on failure). Delivery only after card removal. See vending-mdb-uvm.
6. **Card recognition:** request `panHashVariants` on the transaction or use `PanHash` stand-alone (`generatePanToken` is deprecated). See surrogate-pan.
7. **Day-end:** final balance (manual and automatic), submission before shutdown (R-022, T-017, T-066).
8. **Network:** terminal in a protected segment, no inbound internet access to the terminal or LTI port (R-081). Remote maintenance of the ECR has no access to the terminal (R-029).
9. **Deferred/offline:** off unless approved in writing by wallee (R-080).
10. **Receipts:** ep2-conformant layout; QR/e-receipt on printerless devices (R-073).
11. **Acceptance:** complete the wallee ep2 Integration Self-Assessment (`voltox_self_assessment_get kind=terminal`).

## ep2 context you need
- ep2 is an international payment standard made in Switzerland (eft/pos 2000). Terminals are certified; your ECR/VM integration is verified by the terminal provider (wallee) before production. Unattended machines in Switzerland need an additional machine-level check (two steps: terminal certification, then certification together with the machine).
- ep2 8.x makes the HMAC-based surrogate PAN mandatory for terminals; ep2 8.3 adds MPoC/CPoC terminal classes and extends deferred authorisation for contactless/BLE/MIFARE (optional, not used by wallee).
- Card-present stored-credential establishment (ep2 BUC 40): Purchase or Account Verification with cardholder verification and Transaction Reason Code 2. Needed for Smile & Pay on wallee (see voltox-smile-and-pay).
- Network trend: Swiss card-payment traffic is moving to **SEPN**, a SCION-based network for ep2 services (founding members include TeCo ep2). This concerns the terminal provider/acquirer path, not your ECR protocol — see integration-security › SCION.

## Anti-patterns

| Wrong | Right | Why | Ref |
|---|---|---|---|
| ECR timeout shorter than terminal timeout | Longer than terminal max | Late approval → payment without product | R-082, T-062 |
| Retrying a payment blindly after a timeout | Recover last transaction state first | Double charge | R-076, T-040 |
| No unique reference | `merchantReference` per request, duplicate detection | Double charge | R-083, T-061 |
| Purchase before delivery (vending) | Reservation → deliver → complete effective amount | No product without payment and vice versa | R-030, T-059 |
| Delivering before card removal | Deliver after removal | Card left in device | R-031, T-029 |
| `generatePanToken` | `PanHash` / `panHashVariants` | Deprecated | LTI 6.22/6.23 |
| Terminal reachable from the internet | Protected segment, no inbound | Attack surface | R-081 |
| Deferred mode "for speed" | Online authorisation | Merchant bears losses | R-080 |
| Manual PAN entry over LTI | Never | Not PCI compliant over an insecure link | — |
| Third-party home app on the terminal | wallee Paydroid as home app | Recovery after reboot fails | ATI README |
| Long-poll CTI without retry on 543 | Retry with same parameters | Lost result | CTI |

## References
- [references/interfaces.md](references/interfaces.md) — ATI, LTI, CTI details and message list.
- [references/acceptance.md](references/acceptance.md) — wallee/ep2 acceptance process and the requirement families.
