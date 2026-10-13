---
title: Vending and MDB
section: Guides
order: 5
summary: Age-restricted vending, micro markets, kiosks and self-checkout with wallee unattended terminals, MDB cashless sessions and Voltox age gates — including the Swiss UVM approval.
source: wallee terminal documentation, wallee LTI documentation, MDB/ICP practice
---

# Vending and MDB

Unattended sales of age-restricted goods (tobacco, alcohol, energy drinks…) need three things to work together: a **Voltox age gate**, a **wallee unattended terminal** and the **machine controller (VMC)**.

## Topologies

| Topology | Description |
|---|---|
| **MDB cashless** | The wallee unattended terminal is the cashless device on the MDB bus; the VMC is the master. The age gate runs before the vend is approved. |
| **LTI** | The machine controller talks to the terminal over the LAN (reservation, AdaptAmount, CancelReservation). |
| **ATI kiosk** | An Android kiosk app runs the Voltox SDK (`deviceType = VendingMachine`) and the payment on the same device. |

## Age gate placement

Before the vend is approved — never after. Options: the Voltox Android SDK on the machine screen; a phone hand-off via QR when the machine has no suitable camera; **tap first** recognition via [surrogate PAN](surrogate-pan.md) to skip the gate for known, verified cards (within your legal rules).

## Money flow: double commit

1. Reservation/authorisation of the maximum amount
2. Dispense
3. Completion with the **effective amount** (AdaptAmount on LTI)
4. Vend failure → cancel the reservation / reverse — never convert card credit to cash
5. Deliver only after card removal

## Power failure and recovery

Persist everything needed to recover. After restart: reverse incomplete transactions, submit delivered ones, then resume. Align the VMC session timeout with the age flow and payment time.

## Swiss UVM approval

1. wallee terminal self-assessment (UAT items) and wallee pre-check of the machine
2. Machine check together with the terminal by an EFT/POS engineering company (privacy shield, mounting height, receipts, log files, security)
3. Go-live via the acquirer process

## Don'ts

| Don't | Do |
|---|---|
| Approve the vend before the age gate | Age gate, then vend |
| Charge the reserved maximum | Complete with the effective amount |
| Dispense with the card still inserted | After card removal |
| Lose state on power cut | Persist and recover |
| External USB NFC reader for ID chips | Android NFC, or QR hand-off |
