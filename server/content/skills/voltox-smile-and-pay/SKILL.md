---
name: voltox-smile-and-pay
description: Rules and workflow for Voltox Smile & Pay (pay by face). Use when code takes a payment by face recognition (smile_and_pay method channel, onPaid, amountMinorUnits, SmileAndPayFlow, Checkout API), enrols customers with face and card, or connects Smile & Pay to a payment provider such as wallee or Stripe.
---

# Voltox Smile & Pay

**TRIGGER WHEN:** building, reviewing or testing payment by face, customer enrolment (face + card + PIN), or the payment provider behind Smile & Pay.

**SYMPTOMS:** `ai.voltox.smile_and_pay`, `invokeMethod("start", …)`, `onPaid`, `paymentIntentId`, `appPaymentId`, `amountMinorUnits`, `checkAge`, `SmileAndPayFlow`, `FlutterEngineCache`, "pay with a smile", "card on file", "stored credential", "token charge".

**This skill covers Smile & Pay only.** An optional age check inside Smile & Pay (`checkAge`) declines minors (DR14) but is not a substitute for a full Age Verification flow with document fallback where the law requires it.

## Decision workflow

1. **Amount rules:** minor units, **minimum 500 (5.00)**, currencies CHF/EUR/USD. Below 5.00 → offer another payment method (or aggregation designed with wallee).
2. **One session per customer and amount.** A changed basket = new `start`. Sessions last 5 minutes, single use.
3. **Fulfil only on `onPaid`.** Use `amountMinorUnits` and `currency` from the payload for receipts; store `paymentIntentId`/`appPaymentId` as the payment reference; fulfil exactly once (idempotent on that reference).
4. **Payment provider.** The public SDK charges through **Stripe** today. For wallee terminals, SoftPOS or e-commerce design the payment leg with wallee following ep2 BUC 40 (see [references/payments-on-wallee.md](references/payments-on-wallee.md)): establish the stored credential card-present, charge later as a cardholder-initiated stored-credential payment.
5. **Enrolment.** Consent for biometric processing first, card via the provider's hosted card entry, optional PIN. Never collect card numbers in your own UI.
6. **Device registration** (`clientSecret`) only with secure configuration.
7. **Age.** If the product is age-restricted, decide whether `checkAge` suffices or a full Age Verification flow is required (product skill voltox-age-verification).
8. **Run the checks** in [references/checklist.md](references/checklist.md) and self-assessment items `VX-SP-*`.

## Anti-patterns

| Wrong | Right | Why | Reference |
|---|---|---|---|
| Fulfil on screen "Success" or on timeout | Fulfil on `onPaid` only | Only `onPaid` is a payment | SDK › Use the SDK result |
| Re-use a session for a second customer or changed basket | New `start` each time | Session is bound to amount, single use | Sessions |
| `amountMinorUnits` 350 for a 3.50 coffee | Min 500; other method below | Backend rejects < 5.00 | start arguments |
| Using the face match as age verification for 18+ goods | Full Age Verification where required | Different product, different evidence | voltox-age-verification |
| Building your own card form | Provider's hosted card entry | PCI scope, security | Product: Smile & Pay |
| Charging a surrogate PAN | Charge the wallee token | Surrogate PAN is irreversible | surrogate-pan |
| Expecting declines in your app | Declines are handled on screen and not reported | Only success is reported | What the customer sees |
| `developerMode = true` in production | `false` | Test gear icon exposed | start arguments |
| Changing `clientId`/config per payment | First call's configuration is kept for the process | Config is process-wide | start |

## References

- [references/sdk-android.md](references/sdk-android.md) — full Android SDK guide.
- [references/sdk-flutter.md](references/sdk-flutter.md) — Flutter widget.
- [references/product.md](references/product.md) — journey, outcomes, amounts, sessions, data handling.
- [references/payments-on-wallee.md](references/payments-on-wallee.md) — target design for wallee terminals, SoftPOS and e-commerce (ep2 BUC 40).
- [references/decline-codes.md](references/decline-codes.md) — DR01–DR16.
- [references/checklist.md](references/checklist.md) — production checklist.
