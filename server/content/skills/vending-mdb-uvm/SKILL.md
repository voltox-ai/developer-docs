---
name: vending-mdb-uvm
description: Unattended integrations — vending machines, micro markets, kiosks, self-checkout, EV — with wallee unattended terminals, MDB cashless sessions and Voltox age gates. Use when code controls dispensing, vend sessions, reservations, power-failure recovery or prepares the Swiss vending machine (UVM) approval.
---

# Vending, MDB and unattended (UVM)

**TRIGGER WHEN:** a machine sells or releases goods without staff and takes card payments or age checks.

**SYMPTOMS:** "vending", "Automat", "VMC", "MDB", "vend request/approved/success/failure", "cashless device", "dispense", "micro market", "kiosk", "self-checkout", "EV charging", `deviceType = VendingMachine`, "UVM approval".

## Decision workflow
1. **Topology.** wallee unattended terminal as MDB cashless device (terminal is the cashless slave on the bus; the VMC is master), or LTI from the machine controller, or ATI in an Android kiosk app.
2. **Age gate placement.** Before the vend is approved. Options: Voltox Android SDK on the machine screen (`deviceType = VendingMachine`); phone hand-off via QR (S2S) if the machine has no suitable camera; "tap first" recognition via surrogate PAN.
3. **Money flow = double commit.** Reservation/authorisation → dispense → completion with the **effective amount** (AdaptAmount on LTI for vending) → on failure cancel/reverse. Product only after card removal.
4. **Power failure design.** Permanent storage of everything needed to recover; after restart: reverse incomplete, submit delivered (R-038…R-044).
5. **Monitoring & support.** Status polling/push, visible support contact on the machine, brand signalisation, PIN privacy (R-027, R-035–R-037).
6. **Deferred/offline off** unless wallee approves in writing.
7. **Approval.** wallee self-assessment (UAT items) → machine check by an EFT/POS engineering company (Switzerland) → go-live.

## Anti-patterns

| Wrong | Right | Why | Ref |
|---|---|---|---|
| Vend approved before the age gate | Age gate, then vend | Irreversible release | VX-UVM-01 |
| Charging the reserved maximum | Complete with effective amount | Overcharging | R-030, T-059 |
| Dispensing while the card is still inserted | After card removal | Forgotten cards | R-031 |
| Card credit converted to cash on vend failure | Refund card credit | Rule R-070 | R-070 |
| Losing state on power cut | Persist and recover | Payment without product | R-038–R-044 |
| Running the camera and the MDB session timeout unaligned | VMC session timeout > age flow + payment time | Session expires mid-flow | R-082 |
| External USB NFC reader for ID chips | Android NFC only, or `ScanIdOnly`/QR hand-off | SDK uses Android NFC stack | Age SDK |

## Swiss UVM approval (summary)
Two steps: terminal certification (ep2), then certification of the machine together with the terminal by a third-party EFT/POS engineering company (privacy shield, mounting height, receipts, log files, security). wallee guides and pre-checks the machine before the ep2 verification test. The acquirer process applies.
