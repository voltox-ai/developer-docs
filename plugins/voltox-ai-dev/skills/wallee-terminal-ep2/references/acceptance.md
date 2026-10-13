# wallee acceptance and ep2 conformity

## What is certified by whom
| Item | Who | Notes |
|---|---|---|
| Terminal hardware/software (ep2 version) | ep2 certification (eftpos Engineering / Registration Authority), terminal vendor, wallee | Listed on ep2.ch |
| Your ECR / vending / kiosk integration with the wallee terminal | **wallee** (terminal provider / TSU) | wallee ep2 Integration Self-Assessment, acceptance test |
| Unattended vending machine in Switzerland | Third-party EFT/POS engineering company together with the acquirer process | Two steps: terminal certification, then machine + terminal (privacy shield, mounting height, receipts, logs, security) |
| Voltox SDK behaviour | Voltox | Not an ep2 component; runs before/around the payment |

The Voltox AI Dev toolset **prepares** you for these steps. It never certifies.

## The wallee ep2 Integration Self-Assessment
Based on the wallee ep2 Integration Self-Assessment V1.0 (18.09.2026), extended for Voltox flows. Retrieve it with `voltox_self_assessment_get` (`kind = terminal`).

- Environments: **AT** attended (POS/ECR), **UAT** unattended (vending, kiosk, self-checkout).
- Obligations: **mandatory** (always), **conditional** (if the function is used, else n/a), **optional** (recommended).
- Results: passed · failed · not run · waived (approved by wallee) · waiver req. · check · n/a. Retest: WA-OK / WA-NOK.
- Calculated status: **failed** if any required item failed; **open** if any required item has no final result; **passed** only when every required item passed or is waived by wallee.

Requirement families: hardware basics (printer, buzzer, communication) · use cases (activation, final balance, purchase, CHF 1'080.00 thousands separator) · brand signalisation · security (no remote access to the terminal, protected network) · product delivery (double commit, card removal) · cardholder support · monitoring · PIN privacy · power failure (no loss, permanent logs, reversal/submission after restart) · accessibility · abort · vend failure · receipts · reprint · recovery · deferred off · timeouts · unique reference · reconciliation · auto recovery · software update window · card brands · operator manual.

Test families: errors (stop, communication loss VM↔terminal and terminal↔acquirer) · power off (terminal, VM) · activation/shutdown · chip/contactless/magstripe/above CVM · logs · card removal · product not available · delivery error · PIN privacy · no payment · status after ECR loss · decline · wrong PIN · CTLS-only above CVM · wallets · soft decline · brand matrix · TWINT · reversal · refund · reservation (lower amount, no delivery) · duplicate request · late approval · network recovery · scheduled reboot · software update · day-end around midnight · reconciliation · amount edge cases · MDB session · VMC reset · cardholder guidance · concurrent access.
