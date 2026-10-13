# Reference architectures

Each pattern names who decides what. **Voltox decides identity and age. wallee and the acquirer decide payment.** The merchant application decides fulfilment — and only after both say yes.

Status markers used below:
- **Available** — documented in public Voltox or wallee documentation.
- **Confirm with wallee** — technically described in ep2 or wallee material, but availability for your contract and device must be confirmed by wallee before you build on it.

---

## P1 · Attended POS, age-restricted sale (wallee Android terminal)

```
Cashier/ECR ──▶ Merchant app on wallee Android terminal
                  │ 1. VoltoxAgeVerification.start(requiredAge)      (Voltox SDK, on-device)
                  │ 2. isVerified == true ?  no ─▶ stop, no payment
                  │ 3. ApiClient.authorizeTransaction(...)          (wallee Android Till SDK, ATI)
                  │ 4. approved ?           no ─▶ stop
                  ▼ 5. hand over goods, print/QR receipt
```
- Method: Voltox Android SDK + wallee ATI on the same device. Available.
- Alternative: ECR on a PC runs the Voltox web iframe or S2S QR flow; payment via LTI over LAN.
- Speed: initialise the Voltox SDK at app start, keep the ATI `ApiClient` bound.

## P2 · Unattended vending with age gate (wallee unattended terminal + MDB)

```
Customer ─▶ selects product on VMC
VMC ──MDB──▶ wallee cashless device (MDB app, terminal = cashless slave)
              │ A. card tap ─▶ surrogate PAN (panHashVariants)  ─▶ known & age-verified? ─yes─▶ skip to C
              │ B. age check: Voltox on machine screen (Android SDK, deviceType = VendingMachine)
              │    or phone hand-off (S2S QR) when the machine has no suitable camera
              │ C. vend request ─▶ vend approved ─▶ dispense ─▶ vend success / vend failure (auto-reversal)
```
- "Tap first" pattern: read the card once, use the surrogate PAN to recognise returning, already-verified customers, and only start the camera when needed. Card recognition: Available on LTI (`PanHash`, `panHashVariants`); `ep2-hmac.*` variants only on ep2 v8 devices.
- The legal acceptability of "age verified once, bound to card" must be confirmed for each market and product category — see the surrogate-pan skill.
- Delivery is monitored (double commit). See vending-mdb-uvm.

## P3 · Smile & Pay at a kiosk/POS, payments on wallee (ep2 BUC 40 pattern)

```
Enrolment (once, card present):
  wallee terminal: Purchase or Account Verification with cardholder verification,
                   stored-credential establishment (ep2 Transaction Reason Code 2)
  ─▶ wallee token for the stored credential + scheme transaction id     [Confirm with wallee]
  ─▶ surrogate PAN for recognition                                       [Available, LTI]
  ─▶ Voltox enrolment: face + consent + optional PIN

Payment (face, card not presented):
  Kiosk/POS ─▶ Voltox: face match (+PIN, +age if needed) ─▶ match
  Voltox backend ─▶ wallee Web Service API v2.0: transaction with token,
                    flagged as subsequent cardholder-initiated stored-credential payment
                    (ep2: POS Entry Mode 10, Transaction Reason Code 90)               [Confirm with wallee]
  ─▶ approved ─▶ onPaid ─▶ fulfil
```
- ep2 8.3 describes exactly this business use case (Book 16, BUC 40: "Perform a CIT Stored Credential Payment"): the credential may be established on a POS terminal; the transfer from terminal to the e-payment system is not defined by ep2 and must be a proprietary, secure, PCI-approved solution; subsequent payments are card-absent CITs.
- Card-absent means card-not-present scheme rules apply (authentication requirements for EU cards, liability, pricing). Plan this with wallee.
- Today the public Smile & Pay SDK charges through Stripe. The wallee path above is the target design; the change is in the Voltox backend, not in the SDK.

## P4 · SoftPOS (wallee SoftPOS on Android phone or tablet)

```
Merchant app (phone) ─▶ Voltox SDK (front camera: age / face)
                     ─▶ wallee SoftPOS (NFC tap on the same phone)      [Confirm with wallee for your market]
```
- ep2 8.3 defines terminal classes for MPoC/CPoC (CR-528). Ask wallee for the certification status of the SoftPOS build you deploy.
- Do not run camera capture and the NFC tap at the same time; sequence them.

## P5 · E-commerce (web shop or app checkout)

```
Browser ─▶ Voltox web iframe (age check) ─▶ result to parent page
Shop backend ─▶ verify the result server-side (never trust the browser alone)
Shop backend ─▶ wallee Web Service API v2.0: create transaction ─▶ wallee payment page / iframe (hosted card entry)
wallee ─▶ webhook (x-signature, SHA256withECDSA) ─▶ backend reads entity ─▶ fulfil once
```
- Hosted card entry keeps card data out of your systems.
- Webhook payload is only a reference; always read the entity through the API.

## P6 · Omnichannel recognition

- One customer, many channels: Voltox identity (enrolled face) + wallee token (payment) + surrogate PAN (card recognition, ep2 HMAC with a domain key agreed with wallee as service center) + PAR where the card provides it.
- Never join these identifiers into one profile without a legal basis, consent and a deletion concept.
